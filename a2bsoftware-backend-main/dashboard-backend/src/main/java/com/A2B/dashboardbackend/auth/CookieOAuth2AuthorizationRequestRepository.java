package com.A2B.dashboardbackend.auth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import tools.jackson.databind.ObjectMapper;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

// Stands in for Spring's default HttpSessionOAuth2AuthorizationRequestRepository,
// which would otherwise create a JSESSIONID just to survive the redirect to
// Keycloak and back. The pending request (state, PKCE verifier, nonce) is
// serialized into a short-lived, httpOnly cookie instead - no server-side
// session, so nothing here outlives the login handshake itself.
//
// Only the fields this app's DefaultOAuth2AuthorizationRequestResolver actually
// populates are captured (plain Java serialization of OAuth2AuthorizationRequest
// itself would work too, but bloats past 3KB with class metadata alone - close
// enough to the ~4KB per-cookie browser limit to risk silently dropped cookies).
@Component
public class CookieOAuth2AuthorizationRequestRepository implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

    public static final String COOKIE_NAME = "oauth2_auth_request";
    // Generous on purpose - this only bounds how long a user can take on
    // Keycloak's own login form before the round trip is rejected. Too short
    // (this was 3 minutes, then 10) and a normal-paced login intermittently
    // fails with "authorization_request_not_found" once the cookie's already
    // expired by the time the callback arrives.
    private static final Duration MAX_AGE = Duration.ofMinutes(30);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final boolean cookieSecure;

    public CookieOAuth2AuthorizationRequestRepository(@Value("${app.auth.cookie-secure}") boolean cookieSecure) {
        this.cookieSecure = cookieSecure;
    }

    private record AuthRequestData(
            String authorizationUri,
            String clientId,
            String redirectUri,
            Set<String> scopes,
            String state,
            Map<String, Object> additionalParameters,
            Map<String, Object> attributes
    ) {
    }

    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
        return readCookie(request).orElse(null);
    }

    @Override
    public void saveAuthorizationRequest(OAuth2AuthorizationRequest authorizationRequest, HttpServletRequest request, HttpServletResponse response) {
        if (authorizationRequest == null) {
            removeCookie(response);
            return;
        }
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie(serialize(authorizationRequest), MAX_AGE).toString());
    }

    @Override
    public OAuth2AuthorizationRequest removeAuthorizationRequest(HttpServletRequest request, HttpServletResponse response) {
        OAuth2AuthorizationRequest authorizationRequest = loadAuthorizationRequest(request);
        removeCookie(response);
        return authorizationRequest;
    }

    private void removeCookie(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie("", Duration.ZERO).toString());
    }

    private ResponseCookie buildCookie(String value, Duration maxAge) {
        return ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path("/")
                .maxAge(maxAge)
                .build();
    }

    private Optional<OAuth2AuthorizationRequest> readCookie(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return Optional.empty();
        }
        for (Cookie cookie : request.getCookies()) {
            if (COOKIE_NAME.equals(cookie.getName()) && !cookie.getValue().isBlank()) {
                return Optional.ofNullable(deserialize(cookie.getValue()));
            }
        }
        return Optional.empty();
    }

    private String serialize(OAuth2AuthorizationRequest req) {
        AuthRequestData data = new AuthRequestData(
                req.getAuthorizationUri(), req.getClientId(), req.getRedirectUri(),
                req.getScopes(), req.getState(), req.getAdditionalParameters(), req.getAttributes());
        try {
            return Base64.getUrlEncoder().withoutPadding().encodeToString(MAPPER.writeValueAsBytes(data));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize OAuth2AuthorizationRequest", e);
        }
    }

    private OAuth2AuthorizationRequest deserialize(String value) {
        try {
            AuthRequestData data = MAPPER.readValue(Base64.getUrlDecoder().decode(value), AuthRequestData.class);
            return OAuth2AuthorizationRequest.authorizationCode()
                    .authorizationUri(data.authorizationUri())
                    .clientId(data.clientId())
                    .redirectUri(data.redirectUri())
                    .scopes(data.scopes())
                    .state(data.state())
                    .additionalParameters(data.additionalParameters())
                    .attributes(data.attributes())
                    .build();
        } catch (Exception e) {
            // Tampered, expired, or foreign cookie - treat as "no pending request" rather than failing the request.
            return null;
        }
    }
}
