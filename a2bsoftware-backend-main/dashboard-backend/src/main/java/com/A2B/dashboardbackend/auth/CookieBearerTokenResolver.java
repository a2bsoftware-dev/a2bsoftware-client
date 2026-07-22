package com.A2B.dashboardbackend.auth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.stereotype.Component;

// With no server-side session, every request (not just the login handshake)
// has to prove itself with the JWT directly. Browsers don't send an
// Authorization header on their own, so this falls back to the access_token
// cookie KeycloakLoginSuccessHandler/AuthService write - the resource server
// then validates it exactly like any other bearer token (signature, issuer,
// expiry), so "logged in" lasts exactly as long as that token is valid.
@Component
public class CookieBearerTokenResolver implements BearerTokenResolver {

    private final BearerTokenResolver headerResolver = new DefaultBearerTokenResolver();

    @Override
    public String resolve(HttpServletRequest request) {
        String headerToken = headerResolver.resolve(request);
        if (headerToken != null) {
            return headerToken;
        }

        if (request.getCookies() == null) {
            return null;
        }
        for (Cookie cookie : request.getCookies()) {
            if (AuthCookieService.ACCESS_TOKEN_COOKIE.equals(cookie.getName()) && !cookie.getValue().isBlank()) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
