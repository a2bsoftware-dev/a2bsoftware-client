package com.A2B.dashboardbackend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.stereotype.Component;

// Stands in for Spring's default HttpSessionOAuth2AuthorizedClientRepository.
// The authorized client (access + refresh token) only needs to survive from
// the moment OAuth2LoginAuthenticationFilter saves it to the moment
// KeycloakLoginSuccessHandler reads it back, a few lines later in the same
// request - a request attribute covers that with no session involved. Nothing
// reads this repository on any later request; ongoing auth is JWT-cookie based
// (see CookieBearerTokenResolver) and refresh reads the refresh_token cookie
// directly (see AuthService), so there's nothing here for later requests to load.
@Component
public class RequestAttributeOAuth2AuthorizedClientRepository implements OAuth2AuthorizedClientRepository {

    private static final String ATTR_PREFIX = RequestAttributeOAuth2AuthorizedClientRepository.class.getName() + ".AUTHORIZED_CLIENT.";

    @Override
    @SuppressWarnings("unchecked")
    public <T extends OAuth2AuthorizedClient> T loadAuthorizedClient(String clientRegistrationId, Authentication principal, HttpServletRequest request) {
        return (T) request.getAttribute(ATTR_PREFIX + clientRegistrationId);
    }

    @Override
    public void saveAuthorizedClient(OAuth2AuthorizedClient authorizedClient, Authentication principal, HttpServletRequest request, HttpServletResponse response) {
        request.setAttribute(ATTR_PREFIX + authorizedClient.getClientRegistration().getRegistrationId(), authorizedClient);
    }

    @Override
    public void removeAuthorizedClient(String clientRegistrationId, Authentication principal, HttpServletRequest request, HttpServletResponse response) {
        request.removeAttribute(ATTR_PREFIX + clientRegistrationId);
    }
}
