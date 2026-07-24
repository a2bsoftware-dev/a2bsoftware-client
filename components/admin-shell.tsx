"use client";

import React, { useEffect, useState } from "react";
import { Ban } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import DashboardHeader from "@/components/dashboard-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { apiFetch, getLastActivityAt, refreshTokensSilently } from "@/lib/api";
import { useLogout } from "@/hooks/use-logout";

const TOKEN_REFRESH_INTERVAL_MS = 3 * 60 * 1000;
const IDLE_CHECK_INTERVAL_MS = 30 * 1000;
const IDLE_LOGOUT_LIMIT_MS = 10 * 60 * 1000;

// This is the client portal - only client accounts (plus Admin, for
// support/debugging) belong here. Everyone else gets logged out - see the
// accessDenied handling below.
const ALLOWED_ROLES = ["Clients", "Client Manager", "Admin"];
const ACCESS_DENIED_LOGOUT_SECONDS = 5;

interface User {
  id: string;
  user_name?: string;
  name?: string;
  email: string;
  role_id: string;
  role?: string;
  permissions?: number[];
}

interface Setting {
  param: string;
  value: string;
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [showClientApi, setShowClientApi] = useState(false);
  const [showSetting, setShowSetting] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [logoutSecondsLeft, setLogoutSecondsLeft] = useState(ACCESS_DENIED_LOGOUT_SECONDS);
  const logout = useLogout();

  // Keep the session alive on a fixed timer regardless of activity - this is
  // deliberately excluded from idle tracking (see refreshTokensSilently).
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      refreshTokensSilently();
    }, TOKEN_REFRESH_INTERVAL_MS);
    return () => clearInterval(refreshInterval);
  }, []);

  // Idle-logout: lastActivityAt only moves when the user's own actions cause
  // a real API call (apiFetch calls with trackActivity !== false) - the
  // refresh ping above and background polling never touch it.
  useEffect(() => {
    const idleCheckInterval = setInterval(() => {
      if (Date.now() - getLastActivityAt() > IDLE_LOGOUT_LIMIT_MS) {
        logout();
      }
    }, IDLE_CHECK_INTERVAL_MS);
    return () => clearInterval(idleCheckInterval);
  }, [logout]);

  // Ticks the access-denied countdown down to 0, then logs out - no manual
  // "log out now" option, just the countdown.
  useEffect(() => {
    if (!accessDenied) return;
    if (logoutSecondsLeft <= 0) {
      logout();
      return;
    }
    const timer = setTimeout(() => setLogoutSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [accessDenied, logoutSecondsLeft, logout]);

  useEffect(() => {
    // 1. Fetch authenticated user details from the backend (Spring Boot owns
    // the session/token check now — this call carries the httpOnly cookies).
    // The backend syncs the logged-in Keycloak user into the local users
    // table as part of this same call, so there's no separate sync request
    // to race against.
    apiFetch("/api/auth/me")
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          window.location.href = "/";
        }
      })
      .then((data) => {
        if (!data) return;
        // Checked once, right here at session start (this effect runs once
        // per mount, and this layout persists across internal navigation in
        // the App Router) - not re-verified on every subsequent page. A
        // missing role fails closed, same as an unrecognized one.
        if (!data.role || !ALLOWED_ROLES.includes(data.role)) {
          setAccessDenied(true);
          return;
        }
        setUser(data);
      })
      .catch((err) => {
        console.error("Error fetching user session", err);
      });

    // 2. Fetch settings for conditional tabs visibility
    apiFetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && data.settings) {
          const settingsMap = new Map<string, string>();
          data.settings.forEach((s: Setting) => settingsMap.set(s.param, s.value));

          setShowClientApi(settingsMap.get("show_client_api") === "1");
          setShowSetting(settingsMap.get("show_setting") === "1");
        }
      })
      .catch((err) => console.error("Error loading settings", err));
  }, []);

  if (accessDenied) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Access denied</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <Ban />
              <AlertTitle>Your account is not allowed on this domain.</AlertTitle>
              <AlertDescription>Logging out in {logoutSecondsLeft}s...</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar user={user} showClientApi={showClientApi} showSetting={showSetting} />
      <SidebarInset>
        <DashboardHeader user={user} />
        <main className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
