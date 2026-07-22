package com.A2B.dashboardbackend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

// Builds Keycloak's end-session URL directly rather than relying on
// OidcClientInitiatedLogoutSuccessHandler's discovery-derived metadata, since
// this app's ClientRegistration is built from explicit endpoints (no OIDC
// discovery round-trip) to support Keycloak living at a different address
// from this container's point of view than from the browser's.
@Component
public class KeycloakLogoutSuccessHandler implements LogoutSuccessHandler {

    private final ClientRegistrationRepository clientRegistrationRepository;
    private final AuthCookieService authCookieService;
    private final String keycloakPublicUrl;
    private final String keycloakRealm;
    private final String frontendUrl;
    private final String postLogoutRedirect;

    public KeycloakLogoutSuccessHandler(ClientRegistrationRepository clientRegistrationRepository,
                                         AuthCookieService authCookieService,
                                         @Value("${app.keycloak.public-url}") String keycloakPublicUrl,
                                         @Value("${app.keycloak.realm}") String keycloakRealm,
                                         @Value("${app.auth.frontend-url}") String frontendUrl,
                                         @Value("${app.auth.post-logout-redirect}") String postLogoutRedirect) {
        this.clientRegistrationRepository = clientRegistrationRepository;
        this.authCookieService = authCookieService;
        this.keycloakPublicUrl = keycloakPublicUrl;
        this.keycloakRealm = keycloakRealm;
        this.frontendUrl = frontendUrl;
        this.postLogoutRedirect = postLogoutRedirect;
    }

    @Override
    public void onLogoutSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {
        UriComponentsBuilder logoutUrl = UriComponentsBuilder
                .fromUriString(keycloakPublicUrl + "/realms/" + keycloakRealm + "/protocol/openid-connect/logout")
                .queryParam("post_logout_redirect_uri", frontendUrl + postLogoutRedirect);

        // This app runs stateless (no HTTP session), so by the time a browser
        // GET reaches here the request has already re-authenticated through the
        // JWT/bearer-cookie resource-server filter - the principal is a
        // JwtAuthenticationToken, never the OidcUser the login handler saw. The
        // id_token cookie (written at login, see KeycloakLoginSuccessHandler) is
        // the only place the ID token survives to logout time, and Keycloak's
        // end-session endpoint needs it as id_token_hint to skip its own
        // "do you want to log out?" confirmation page.
        String idTokenHint = authCookieService.readCookie(request, AuthCookieService.ID_TOKEN_COOKIE);
        if (idTokenHint == null && authentication != null && authentication.getPrincipal() instanceof OidcUser oidcUser) {
            idTokenHint = oidcUser.getIdToken().getTokenValue();
        }

        if (idTokenHint != null) {
            logoutUrl.queryParam("id_token_hint", idTokenHint);
        } else {
            // No ID token available at all - Keycloak requires either id_token_hint
            // or client_id whenever post_logout_redirect_uri is present, but without
            // id_token_hint it will still show the confirmation page.
            logoutUrl.queryParam("client_id", clientRegistrationRepository.findByRegistrationId("keycloak").getClientId());
        }

        response.sendRedirect(logoutUrl.build().encode().toString());
    }
}
