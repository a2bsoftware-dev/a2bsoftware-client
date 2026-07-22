package com.A2B.dashboardbackend.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.oauth2.client.oidc.authentication.OidcIdTokenDecoderFactory;
import org.springframework.security.oauth2.client.oidc.authentication.OidcIdTokenValidator;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.core.converter.ClaimTypeConverter;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoderFactory;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.web.client.RestOperations;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// Both Spring's default id-token decoder (used once, in the oauth2Login
// callback) and the resource-server JWT decoder (used on every later request)
// fetch Keycloak's JWKS over HTTP with a short built-in timeout. The hosted
// Keycloak instance occasionally responds slowly enough to trip that default,
// failing an otherwise-valid login with "invalid_id_token: ... Read timed
// out" even though Keycloak itself already granted access - both decoders get
// an explicit, longer timeout here instead.
@Configuration
public class JwtDecoderConfig {

    private static final Duration TIMEOUT = Duration.ofSeconds(15);

    @Bean
    public JwtDecoder jwtDecoder(@Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}") String jwkSetUri,
                                 @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}") String issuerUri) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri)
                .restOperations(longTimeoutRestOperations())
                .build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(issuerUri));
        return decoder;
    }

    // Mirrors OidcIdTokenDecoderFactory's default behavior (same validator, same
    // claim conversions) - the only difference is the longer-timeout REST client,
    // since OidcIdTokenDecoderFactory itself doesn't expose a way to set one.
    @Bean
    public JwtDecoderFactory<ClientRegistration> idTokenDecoderFactory() {
        Map<String, JwtDecoder> decoders = new ConcurrentHashMap<>();
        return registration -> decoders.computeIfAbsent(registration.getRegistrationId(), key -> {
            NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(registration.getProviderDetails().getJwkSetUri())
                    .restOperations(longTimeoutRestOperations())
                    .build();
            decoder.setJwtValidator(new OidcIdTokenValidator(registration));
            decoder.setClaimSetConverter(new ClaimTypeConverter(OidcIdTokenDecoderFactory.createDefaultClaimTypeConverters()));
            return decoder;
        });
    }

    private static RestOperations longTimeoutRestOperations() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(TIMEOUT);
        requestFactory.setReadTimeout(TIMEOUT);
        return new RestTemplate(requestFactory);
    }
}
