package com.A2B.dashboardbackend.auth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2RefreshToken;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

@Service
@Slf4j
public class AuthCookieService {

    public static final String ACCESS_TOKEN_COOKIE = "access_token";
    public static final String REFRESH_TOKEN_COOKIE = "refresh_token";
    public static final String ID_TOKEN_COOKIE = "id_token";

    // The id_token cookie exists purely to be replayed as id_token_hint at logout
    // (see KeycloakLogoutSuccessHandler) - Keycloak's end-session endpoint accepts an
    // already-expired id_token there, since its job is identifying the session, not
    // authenticating a live request. Giving it the token's own few-minutes-long exp
    // meant it routinely vanished long before the user actually clicked logout,
    // which is exactly what made Keycloak fall back to its confirmation page.
    private static final Duration ID_TOKEN_COOKIE_MAX_AGE = Duration.ofDays(7);

    private final boolean cookieSecure;

    public AuthCookieService(@Value("${app.auth.cookie-secure}") boolean cookieSecure) {
        this.cookieSecure = cookieSecure;
    }

    public void writeTokenCookies(HttpServletResponse response, OAuth2AccessToken accessToken, OAuth2RefreshToken refreshToken) {
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie(ACCESS_TOKEN_COOKIE, accessToken.getTokenValue(), expiryOf(accessToken.getExpiresAt())).toString());

        if (refreshToken != null) {
            response.addHeader(HttpHeaders.SET_COOKIE, buildCookie(REFRESH_TOKEN_COOKIE, refreshToken.getTokenValue(), refreshExpiryOf(refreshToken.getExpiresAt())).toString());
        }
    }

    // Used by the manual refresh_token grant (AuthService), which talks to Keycloak's
    // token endpoint directly instead of going through Spring's OAuth2 client machinery,
    // so it only has raw token strings + "expires in N seconds" from the JSON response.
    public void writeTokenCookies(HttpServletResponse response, String accessToken, String refreshToken, long accessExpiresInSeconds, Long refreshExpiresInSeconds) {
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie(ACCESS_TOKEN_COOKIE, accessToken, Duration.ofSeconds(accessExpiresInSeconds)).toString());

        if (refreshToken != null) {
            Duration refreshMaxAge = refreshExpiresInSeconds != null ? Duration.ofSeconds(refreshExpiresInSeconds) : Duration.ofMinutes(30);
            response.addHeader(HttpHeaders.SET_COOKIE, buildCookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshMaxAge).toString());
        }
    }

    // Stored purely so KeycloakLogoutSuccessHandler can send it back as
    // id_token_hint - without it, Keycloak's end-session endpoint can't
    // verify the logout request and falls back to showing its own
    // confirmation page instead of logging out directly. Deliberately NOT
    // tied to the id_token's own (short) exp - see ID_TOKEN_COOKIE_MAX_AGE.
    public void writeIdTokenCookie(HttpServletResponse response, String idToken) {
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie(ID_TOKEN_COOKIE, idToken, ID_TOKEN_COOKIE_MAX_AGE).toString());
    }

    public String readCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) {
            return null;
        }
        for (Cookie cookie : request.getCookies()) {
            if (name.equals(cookie.getName()) && !cookie.getValue().isBlank()) {
                return cookie.getValue();
            }
        }
        return null;
    }

    public void clearTokenCookies(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie(ACCESS_TOKEN_COOKIE, "", Duration.ZERO).toString());
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie(REFRESH_TOKEN_COOKIE, "", Duration.ZERO).toString());
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie(ID_TOKEN_COOKIE, "", Duration.ZERO).toString());
    }

    private ResponseCookie buildCookie(String name, String value, Duration maxAge) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path("/")
                .maxAge(maxAge)
                .build();
    }

    private Duration expiryOf(Instant expiresAt) {
        if (expiresAt == null) {
            return Duration.ofMinutes(5);
        }
        Duration duration = Duration.between(Instant.now(), expiresAt);
        return duration.isNegative() ? Duration.ZERO : duration;
    }

    // Keycloak's refresh_expires_in is a non-standard field that Spring's OAuth2
    // client never surfaces via OAuth2RefreshToken.getExpiresAt() - it's always
    // null right after a fresh browser login. Falling back to the same 5-minute
    // default as an access token made the refresh_token cookie vanish almost
    // immediately, well before Keycloak's actual (much longer) refresh/session
    // lifetime, causing /api/auth/refresh to 401 with "no cookie at all" a few
    // minutes after every login. 30 minutes matches the other overload's own
    // fallback below - the next successful refresh replaces this cookie with
    // Keycloak's real refresh_expires_in anyway.
    private Duration refreshExpiryOf(Instant expiresAt) {
        if (expiresAt == null) {
            return Duration.ofMinutes(30);
        }
        Duration duration = Duration.between(Instant.now(), expiresAt);
        return duration.isNegative() ? Duration.ZERO : duration;
    }
}
