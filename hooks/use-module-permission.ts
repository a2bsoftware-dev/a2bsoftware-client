"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL, apiFetch } from "@/lib/api";

export interface ModulePermission {
  moduleId: number;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

const noAccess = (moduleId: number): ModulePermission => ({
  moduleId, create: false, read: false, update: false, delete: false
});

// Fails closed: until /api/auth/me resolves (or if it fails), callers see
// noAccess rather than briefly flashing create/edit/delete controls that
// then have to be yanked away once the real permission set arrives.
export function useModulePermission(moduleId: number) {
  const [permission, setPermission] = useState<ModulePermission>(noAccess(moduleId));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    apiFetch(`${API_BASE_URL}/api/auth/me`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const modules: ModulePermission[] | undefined = data?.modulePermissions;
        const match = modules?.find((m) => m.moduleId === moduleId);
        setPermission(match ?? noAccess(moduleId));
      })
      .catch((err) => {
        console.error("Error loading module permissions", err);
        if (!cancelled) setPermission(noAccess(moduleId));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [moduleId]);

  return { permission, loading };
}
