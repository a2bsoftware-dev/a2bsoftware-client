"use client";

import { API_BASE_URL } from "@/lib/api";

export function useLogout() {
  return async function logout() {
    // The backend clears the session/token cookies and redirects on to
    // Keycloak's own end-session endpoint, so the SSO session ends too.
    window.location.href = `${API_BASE_URL}/api/auth/logout`;
  };
}
