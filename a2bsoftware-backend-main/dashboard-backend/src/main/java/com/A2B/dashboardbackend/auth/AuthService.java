package com.A2B.dashboardbackend.auth;

import com.A2B.dashboardbackend.accessrights.ClientUserPrivRepository;
import com.A2B.dashboardbackend.auth.keycloak.KeycloakUserSyncService;
import com.A2B.dashboardbackend.users.RoleRepository;
import com.A2B.dashboardbackend.users.UserRepository;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@Slf4j
public class AuthService {

    private final AuthCookieService authCookieService;
    private final KeycloakUserSyncService userSyncService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ClientUserPrivRepository clientUserPrivRepository;
    private final RestClient restClient;
    private final String tokenUri;
    private final String clientId;
    private final String clientSecret;

    public AuthService(AuthCookieService authCookieService,
                        KeycloakUserSyncService userSyncService,
                        UserRepository userRepository,
                        RoleRepository roleRepository,
                        ClientUserPrivRepository clientUserPrivRepository,
                        @Value("${spring.security.oauth2.client.provider.keycloak.token-uri}") String tokenUri,
                        @Value("${spring.security.oauth2.client.registration.keycloak.client-id}") String clientId,
                        @Value("${spring.security.oauth2.client.registration.keycloak.client-secret}") String clientSecret) {
        this.authCookieService = authCookieService;
        this.userSyncService = userSyncService;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.clientUserPrivRepository = clientUserPrivRepository;
        this.restClient = RestClient.create();
        this.tokenUri = tokenUri;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    public Map<String, Object> currentUser(Authentication authentication) {
        if (authentication == null) {
            return Map.of("success", false, "error", "Not authenticated");
        }

        String sub;
        String username;
        String email;
        Map<String, Object> claims;

        if (authentication.getPrincipal() instanceof OidcUser oidcUser) {
            sub = oidcUser.getSubject();
            username = oidcUser.getPreferredUsername();
            email = oidcUser.getEmail();
            claims = oidcUser.getClaims();
        } else if (authentication instanceof JwtAuthenticationToken jwtAuth) {
            sub = jwtAuth.getToken().getSubject();
            username = jwtAuth.getToken().getClaimAsString("preferred_username");
            email = jwtAuth.getToken().getClaimAsString("email");
            claims = jwtAuth.getToken().getClaims();
        } else {
            return Map.of("success", false, "error", "Unrecognized authentication type");
        }

        // Keycloak client roles (Clients -> dashboard-tool -> Roles), not the
        // realm-level authorities (offline_access, uma_authorization, etc.) that
        // every account carries regardless of app role - those aren't useful here.
        List<String> roles = extractClientRoles(claims);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("sub", sub);
        result.put("username", username);
        result.put("email", email);
        result.put("roles", roles);

        // Enrich with the local DB profile (id, role, permissions) so the
        // frontend's role/permission-gated nav can render - the Keycloak
        // claims above carry no notion of local roles or module access.
        userRepository.findByKeycloakId(sub).ifPresent(user -> {
            result.put("id", user.getId());
            result.put("user_name", user.getUserName());
            String fullName = ((user.getFirstName() != null ? user.getFirstName() : "")
                    + " " + (user.getLastName() != null ? user.getLastName() : "")).trim();
            if (!fullName.isEmpty()) {
                result.put("name", fullName);
            }
            result.put("role_id", user.getRoleId());

            if (user.getRoleId() != null) {
                roleRepository.findById(user.getRoleId())
                        .ifPresent(role -> result.put("role", role.getName()));
                clientUserPrivRepository.findByUserTypeId(user.getRoleId())
                        .ifPresent(priv -> result.put("permissions", parseAccessRightIds(priv.getAccessRightId())));
            }
        });

        return result;
    }

    private List<Integer> parseAccessRightIds(String accessRightId) {
        if (accessRightId == null || accessRightId.isBlank()) {
            return List.of();
        }
        return Arrays.stream(accessRightId.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> {
                    try {
                        return Integer.parseInt(s);
                    } catch (NumberFormatException e) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .toList();
    }

    public Map<String, Object> syncCurrentUser(Authentication authentication) {
        if (authentication == null) {
            return Map.of("success", false, "error", "Not authenticated");
        }

        String sub;
        String username;
        String email;
        String firstName;
        String lastName;
        Map<String, Object> claims;

        if (authentication.getPrincipal() instanceof OidcUser oidcUser) {
            sub = oidcUser.getSubject();
            username = oidcUser.getPreferredUsername();
            email = oidcUser.getEmail();
            firstName = oidcUser.getGivenName();
            lastName = oidcUser.getFamilyName();
            claims = oidcUser.getClaims();
        } else if (authentication instanceof JwtAuthenticationToken jwtAuth) {
            sub = jwtAuth.getToken().getSubject();
            username = jwtAuth.getToken().getClaimAsString("preferred_username");
            email = jwtAuth.getToken().getClaimAsString("email");
            firstName = jwtAuth.getToken().getClaimAsString("given_name");
            lastName = jwtAuth.getToken().getClaimAsString("family_name");
            claims = jwtAuth.getToken().getClaims();
        } else {
            return Map.of("success", false, "error", "Unrecognized authentication type");
        }

        List<String> keycloakRoles = extractClientRoles(claims);
        KeycloakUserSyncService.SyncResult result =
                userSyncService.sync(sub, email, username, firstName, lastName, keycloakRoles);
        return Map.of("success", true, "userId", result.userId(), "created", result.created());
    }

    // Client roles (Clients -> dashboard-tool -> Roles in Keycloak) live under
    // resource_access.<clientId>.roles in the token, distinct from realm_access.roles.
    private List<String> extractClientRoles(Map<String, Object> claims) {
        if (claims == null) {
            return List.of();
        }
        Object resourceAccessObj = claims.get("resource_access");
        if (!(resourceAccessObj instanceof Map<?, ?> resourceAccess)) {
            return List.of();
        }
        Object clientObj = resourceAccess.get(clientId);
        if (!(clientObj instanceof Map<?, ?> clientMap)) {
            return List.of();
        }
        Object rolesObj = clientMap.get("roles");
        if (!(rolesObj instanceof List<?> rolesList)) {
            return List.of();
        }
        return rolesList.stream().map(String::valueOf).toList();
    }

    // No session/OAuth2AuthorizedClientManager involved - this reads the
    // refresh_token cookie directly and talks to Keycloak's token endpoint
    // itself, so refreshing works even once the access_token has already
    // expired (the previous session-backed approach required an already-valid
    // session to reach this endpoint at all, which defeated the point of it).
    public boolean refreshTokens(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = authCookieService.readCookie(request, AuthCookieService.REFRESH_TOKEN_COOKIE);
        if (refreshToken == null) {
            log.warn("Refresh requested with no refresh_token cookie present");
            return false;
        }

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "refresh_token");
        form.add("refresh_token", refreshToken);
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);

        try {
            KeycloakTokenResponse tokenResponse = restClient.post()
                    .uri(tokenUri)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(KeycloakTokenResponse.class);

            if (tokenResponse == null || tokenResponse.accessToken() == null) {
                log.warn("Keycloak refresh_token grant returned no access token");
                return false;
            }

            authCookieService.writeTokenCookies(response, tokenResponse.accessToken(), tokenResponse.refreshToken(),
                    tokenResponse.expiresIn(), tokenResponse.refreshExpiresIn());
            if (tokenResponse.idToken() != null) {
                authCookieService.writeIdTokenCookie(response, tokenResponse.idToken());
            }
            log.info("Refreshed tokens via refresh_token cookie");
            return true;
        } catch (RestClientException e) {
            log.warn("Token refresh rejected by Keycloak: {}", e.getMessage());
            return false;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record KeycloakTokenResponse(
            @JsonProperty("access_token") String accessToken,
            @JsonProperty("refresh_token") String refreshToken,
            @JsonProperty("id_token") String idToken,
            @JsonProperty("expires_in") long expiresIn,
            @JsonProperty("refresh_expires_in") Long refreshExpiresIn
    ) {
    }
}
