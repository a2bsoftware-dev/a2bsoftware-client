package com.A2B.dashboardbackend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

// Without this, oauth2Login() falls back to Spring Security's own generated
// /login?error page (always "Invalid credentials", regardless of the actual
// cause) instead of the frontend's login screen, which already knows how to
// render a friendlier message for the "OAuthCallback" error code.
@Component
@Slf4j
public class KeycloakLoginFailureHandler implements AuthenticationFailureHandler {

    private final String frontendUrl;

    public KeycloakLoginFailureHandler(@Value("${app.auth.frontend-url}") String frontendUrl) {
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) throws IOException {
        // Logged with the full stack trace - the generic error page never shows
        // the real cause (invalid_client, issuer mismatch, missing session state
        // for the PKCE/state check, etc.), so this is the only place it surfaces.
        log.warn("OAuth2 login failed: {}", exception.getMessage(), exception);

        String redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/login")
                .queryParam("error", "OAuthCallback")
                .build()
                .toUriString();
        response.sendRedirect(redirectUrl);
    }
}
