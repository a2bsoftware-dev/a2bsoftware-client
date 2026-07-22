package com.A2B.dashboardbackend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@Slf4j
public class KeycloakLoginSuccessHandler implements AuthenticationSuccessHandler {

    private final OAuth2AuthorizedClientRepository authorizedClientRepository;
    private final AuthCookieService authCookieService;
    private final String frontendUrl;
    private final String postLoginRedirect;

    public KeycloakLoginSuccessHandler(OAuth2AuthorizedClientRepository authorizedClientRepository,
                                        AuthCookieService authCookieService,
                                        @Value("${app.auth.frontend-url}") String frontendUrl,
                                        @Value("${app.auth.post-login-redirect}") String postLoginRedirect) {
        this.authorizedClientRepository = authorizedClientRepository;
        this.authCookieService = authCookieService;
        this.frontendUrl = frontendUrl;
        this.postLoginRedirect = postLoginRedirect;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {
        OAuth2AuthenticationToken authToken = (OAuth2AuthenticationToken) authentication;
        OAuth2AuthorizedClient authorizedClient = authorizedClientRepository.loadAuthorizedClient(
                authToken.getAuthorizedClientRegistrationId(), authentication, request);

        if (authorizedClient == null) {
            log.warn("No authorized client found after successful login for {}", authentication.getName());
            response.sendRedirect(frontendUrl + postLoginRedirect);
            return;
        }

        authCookieService.writeTokenCookies(response, authorizedClient.getAccessToken(), authorizedClient.getRefreshToken());

        if (authToken.getPrincipal() instanceof OidcUser oidcUser) {
            authCookieService.writeIdTokenCookie(response, oidcUser.getIdToken().getTokenValue());
        }

        log.info("Login succeeded for {}", authentication.getName());
        response.sendRedirect(frontendUrl + postLoginRedirect);
    }
}
