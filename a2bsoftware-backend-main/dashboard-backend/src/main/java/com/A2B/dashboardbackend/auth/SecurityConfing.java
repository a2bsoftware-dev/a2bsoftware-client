package com.A2B.dashboardbackend.auth;

import com.A2B.dashboardbackend.auth.keycloak.KeycloakOidcUserService;
import com.A2B.dashboardbackend.auth.keycloak.KeycloakRoleConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestCustomizers;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.http.HttpMethod;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfing {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
                                            UrlBasedCorsConfigurationSource corsConfigurationSource,
                                            OAuth2AuthorizationRequestResolver authorizationRequestResolver,
                                            CookieOAuth2AuthorizationRequestRepository cookieAuthorizationRequestRepository,
                                            RequestAttributeOAuth2AuthorizedClientRepository requestAttributeAuthorizedClientRepository,
                                            CookieBearerTokenResolver cookieBearerTokenResolver,
                                            KeycloakLoginSuccessHandler keycloakLoginSuccessHandler,
                                            KeycloakLoginFailureHandler keycloakLoginFailureHandler,
                                            KeycloakLogoutSuccessHandler keycloakLogoutSuccessHandler) throws Exception {
        http
            // 1. Enable CORS for the Next.js frontend
            .cors(cors -> cors.configurationSource(corsConfigurationSource))

            // 2. Cookie-based auth relies on the strict CORS allow-list + SameSite=Lax for CSRF protection
            .csrf(AbstractHttpConfigurer::disable)

            // No server-side HttpSession at all - "logged in" is defined purely by
            // holding a still-valid Keycloak-issued access_token/refresh_token
            // cookie, not by an independent Spring session with its own lifetime.
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // 3. Define API access rules
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/auth/login", "/api/auth/logout", "/api/auth/refresh", "/oauth2/**", "/login/**").permitAll()

                // Restrict management endpoints to survey_admin
                .requestMatchers("/api/stats/manage").hasRole("survey_admin")

                // Restrict view endpoints to viewers OR admins
                .requestMatchers("/api/stats/view").hasAnyRole("survey_viewer", "survey_admin")

                // Require at least a valid token for anything else
                .anyRequest().authenticated()
            )
            // 4. Browser-based login: authorization code + PKCE against Keycloak. The
            // pending request and the freshly-issued client both ride in a cookie/request
            // attribute (see the two custom repositories below) - no session created here either.
            .oauth2Login(oauth2 -> oauth2
                .loginProcessingUrl("/api/auth/callback")
                .authorizationEndpoint(a -> a
                        .authorizationRequestResolver(authorizationRequestResolver)
                        .authorizationRequestRepository(cookieAuthorizationRequestRepository)
                )
                .authorizedClientRepository(requestAttributeAuthorizedClientRepository)
                .userInfoEndpoint(u -> u.oidcUserService(new KeycloakOidcUserService()))
                .successHandler(keycloakLoginSuccessHandler)
                .failureHandler(keycloakLoginFailureHandler)
            )
            // 5. Resource server: every request (browser or non-browser) authenticates via
            // a bearer JWT - CookieBearerTokenResolver pulls it from the access_token cookie
            // when there's no Authorization header, so this is what actually keeps browser
            // requests authenticated after login, not a session.
            .oauth2ResourceServer(oauth2 -> oauth2
                .bearerTokenResolver(cookieBearerTokenResolver)
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter()))
            )
            // 6. Logout: clear our token cookies, end the Keycloak SSO session too
            .logout(logout -> logout
                .logoutRequestMatcher(PathPatternRequestMatcher.pathPattern(HttpMethod.GET, "/api/auth/logout"))
                .deleteCookies(AuthCookieService.ACCESS_TOKEN_COOKIE, AuthCookieService.REFRESH_TOKEN_COOKIE, AuthCookieService.ID_TOKEN_COOKIE)
                .logoutSuccessHandler(keycloakLogoutSuccessHandler)
            );

        return http.build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(new KeycloakRoleConverter());
        return converter;
    }

    @Bean
    public UrlBasedCorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins}") String[] allowedOrigins) {
        CorsConfiguration config = new CorsConfiguration();
        // Explicit, non-wildcard origins are required alongside allowCredentials(true)
        config.setAllowedOrigins(Arrays.asList(allowedOrigins));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public OAuth2AuthorizationRequestResolver authorizationRequestResolver(ClientRegistrationRepository clientRegistrationRepository) {
        DefaultOAuth2AuthorizationRequestResolver resolver =
                new DefaultOAuth2AuthorizationRequestResolver(clientRegistrationRepository, "/oauth2/authorization");
        resolver.setAuthorizationRequestCustomizer(OAuth2AuthorizationRequestCustomizers.withPkce());
        return resolver;
    }
}
