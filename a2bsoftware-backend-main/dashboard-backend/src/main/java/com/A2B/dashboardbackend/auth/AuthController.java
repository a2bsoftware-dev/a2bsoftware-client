package com.A2B.dashboardbackend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.Map;

@RestController
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/api/auth/login")
    public void login(HttpServletResponse response) throws IOException {
        response.sendRedirect("/oauth2/authorization/keycloak");
    }

    @PostMapping("/api/auth/refresh")
    public ResponseEntity<Map<String, Object>> refresh(HttpServletRequest request, HttpServletResponse response) {
        boolean refreshed = authService.refreshTokens(request, response);
        if (!refreshed) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("success", false));
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/api/auth/me")
    public Map<String, Object> me(Authentication authentication) {
        return authService.currentUser(authentication);
    }

    @PostMapping("/api/auth/sync")
    public Map<String, Object> sync(Authentication authentication) {
        return authService.syncCurrentUser(authentication);
    }
}
