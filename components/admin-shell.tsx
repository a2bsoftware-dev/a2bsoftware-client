"use client";

import React, { useEffect, useState } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import DashboardHeader from "@/components/dashboard-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { apiFetch, getLastActivityAt, refreshTokensSilently } from "@/lib/api";
import { useLogout } from "@/hooks/use-logout";

const TOKEN_REFRESH_INTERVAL_MS = 3 * 60 * 1000;
const IDLE_CHECK_INTERVAL_MS = 30 * 1000;
const IDLE_LOGOUT_LIMIT_MS = 10 * 60 * 1000;

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
        if (data) {
          setUser(data);
        }
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
