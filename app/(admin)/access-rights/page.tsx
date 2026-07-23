"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldAlert, Loader2, Save,
  UserCheck, AlertTriangle, Lock,
  Eye, PlusCircle, Pencil, Trash2, X
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import { useModulePermission } from "@/hooks/use-module-permission";

// Matches the "Access Rights" entry in ACCESS_RIGHTS_MODULES (below) and
// MODULE_ID in the backend's AccessRightsController.
const ACCESS_RIGHTS_MODULE_ID = 21;

// Static list of standard privilege modules matching database IDs
const ACCESS_RIGHTS_MODULES = [
  { id: 1, name: "Dashboard", description: "View dashboard graphs, statistics, and daily transactions." },
  { id: 6, name: "Projects", description: "Manage survey projects, CPI payouts, and supplier allocations." },
  { id: 10, name: "Users", description: "Manage administrator and manager staff accounts." },
  { id: 14, name: "Clients", description: "Manage clients list and link redirect parameters." },
  { id: 18, name: "Vendors", description: "Manage panel vendors list and security callback tokens." },
  { id: 19, name: "Client Links", description: "Manage global supplier routing link templates." },
  { id: 20, name: "Client Api Data", description: "Synchronize and approve external third-party API survey feeds." },
  { id: 21, name: "Access Rights", description: "Configure system-wide module privileges for user roles." }
];

// Read is the baseline: create/update/delete are meaningless without it, so a
// module with only read=true renders as "View Only" and hides the rest.
type CrudAction = "create" | "read" | "update" | "delete";

interface ModulePermission {
  moduleId: number;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

interface RoleMapping {
  id: string;
  name: string;
  modules: ModulePermission[];
}

const ACTIONS: { key: CrudAction; label: string; Icon: typeof Eye }[] = [
  { key: "create", label: "Create", Icon: PlusCircle },
  { key: "read", label: "Read", Icon: Eye },
  { key: "update", label: "Update", Icon: Pencil },
  { key: "delete", label: "Delete", Icon: Trash2 },
];

const emptyPermission = (moduleId: number): ModulePermission => ({
  moduleId, create: false, read: false, update: false, delete: false
});

const getPermission = (role: RoleMapping, moduleId: number): ModulePermission =>
  role.modules.find((m) => m.moduleId === moduleId) ?? emptyPermission(moduleId);

const isViewOnly = (perm: ModulePermission) =>
  perm.read && !perm.create && !perm.update && !perm.delete;

const hasNoAccess = (perm: ModulePermission) =>
  !perm.create && !perm.read && !perm.update && !perm.delete;

export default function AccessRightsPage() {
  const { permission } = useModulePermission(ACCESS_RIGHTS_MODULE_ID);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<RoleMapping[]>([]);
  // Modules an admin has explicitly opted to customize beyond View Only for a
  // role - purely a local display override, cleared once real CRUD flags land.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // 1. Initialize data from backend
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/access-rights`);

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRoles(data.roles || []);
        } else {
          toast.error(data.error || "Failed to initialize access rights settings");
        }
      } else {
        toast.error("Failed to query privilege configuration");
      }
    } catch (err) {
      console.error("Error loading access privileges", err);
      toast.error("Connection failed while loading privileges");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Standard fetch-on-mount pattern: loadData's own setLoading(true) call
    // is flagged by this rule as if the effect itself sets state, but
    // fetching data on mount is exactly React's documented "synchronize with
    // an external system" use case, not the render-derived-value anti-pattern
    // this rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  // 2. Apply a single CRUD toggle for a role/module, enforcing that Read is
  // the baseline: turning Read off revokes write access too, and turning any
  // write action on implies Read (can't create/edit/delete what you can't view).
  const applyPermissionChange = (roleId: string, moduleId: number, action: CrudAction, checked: boolean) => {
    setRoles((prevRoles) =>
      prevRoles.map((role) => {
        if (role.id !== roleId) return role;

        const current = getPermission(role, moduleId);
        let next: ModulePermission = { ...current, [action]: checked };

        if (action === "read" && !checked) {
          next = emptyPermission(moduleId);
        } else if (action !== "read" && checked) {
          next.read = true;
        }

        const exists = role.modules.some((m) => m.moduleId === moduleId);
        const modules = exists
          ? role.modules.map((m) => (m.moduleId === moduleId ? next : m))
          : [...role.modules, next];

        return { ...role, modules };
      })
    );
  };

  const enableModule = (roleId: string, moduleId: number) =>
    applyPermissionChange(roleId, moduleId, "read", true);

  const disableModule = (roleId: string, moduleId: number) => {
    applyPermissionChange(roleId, moduleId, "read", false);
    setExpanded((prev) => {
      const next = new Set(prev);
      next.delete(`${roleId}:${moduleId}`);
      return next;
    });
  };

  const resetToViewOnly = (roleId: string, moduleId: number) => {
    setRoles((prevRoles) =>
      prevRoles.map((role) => {
        if (role.id !== roleId) return role;
        const next: ModulePermission = { moduleId, create: false, read: true, update: false, delete: false };
        const exists = role.modules.some((m) => m.moduleId === moduleId);
        const modules = exists
          ? role.modules.map((m) => (m.moduleId === moduleId ? next : m))
          : [...role.modules, next];
        return { ...role, modules };
      })
    );
    setExpanded((prev) => {
      const next = new Set(prev);
      next.delete(`${roleId}:${moduleId}`);
      return next;
    });
  };

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // 3. Save access rights changes
  const handleSaveChanges = async () => {
    setSaving(true);
    toast.info("Saving updated role privilege mappings...");

    try {
      const payload = roles.map((role) => ({
        roleId: role.id,
        modules: role.modules
      }));

      const res = await apiFetch(`${API_BASE_URL}/api/access-rights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleMappings: payload })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || "Privilege configuration updated!");
          // Reload database state
          loadData();
        } else {
          toast.error(data.error || "Failed to save configurations");
        }
      } else {
        toast.error("Server error while writing configurations");
      }
    } catch (err) {
      console.error("Error writing privileges to database", err);
      toast.error("Connection timeout while writing permissions");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Band */}
      <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-zinc-500 animate-pulse" />
            Access Rights Manager
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure system privilege matrices for non-Admin profiles - Admin always has full access.
          </p>
        </div>
        <div>
          {permission.update && (
            <Button
              onClick={handleSaveChanges}
              disabled={loading || saving}
              size="sm"
              className="flex items-center gap-1.5 shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              <span>Save Configurations</span>
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="h-9 w-9 animate-spin text-zinc-500" />
          <span className="text-sm font-semibold text-zinc-500">Querying database access levels...</span>
        </div>
      ) : roles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 border border-dashed rounded-lg">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <span className="text-sm font-bold text-zinc-600">No User Roles Configured</span>
          <span className="text-xs text-zinc-400">Initialize standard user types in roles table first.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {roles.map((role) => {
            const activeCount = role.modules.filter((m) => m.read).length;
            const isLockoutControl = role.name === "Admin";

            return (
              <Card key={role.id} className="border-zinc-200 shadow-sm overflow-hidden bg-white dark:bg-zinc-900">
                <CardHeader className="py-4 border-b border-zinc-150 bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-indigo-500" />
                      <span>{role.name} Permissions Matrix</span>
                    </CardTitle>
                    <CardDescription className="text-[11px] text-zinc-400 mt-0.5">
                      User Type ID: {role.id} — Active Modules: {isLockoutControl ? ACCESS_RIGHTS_MODULES.length : activeCount} of {ACCESS_RIGHTS_MODULES.length}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-150">
                      {role.name} Account
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {ACCESS_RIGHTS_MODULES.map((module) => {
                      const perm = isLockoutControl
                        ? { moduleId: module.id, create: true, read: true, update: true, delete: true }
                        : getPermission(role, module.id);

                      const noAccess = !isLockoutControl && hasNoAccess(perm);
                      const viewOnly = !isLockoutControl && isViewOnly(perm);
                      const cardKey = `${role.id}:${module.id}`;
                      const showAllActions = isLockoutControl || !viewOnly || expanded.has(cardKey);

                      return (
                        <div
                          key={module.id}
                          className={`p-3.5 rounded-lg border transition-all flex flex-col gap-2.5 select-none ${
                            noAccess
                              ? "bg-zinc-50/30 border-zinc-150 text-zinc-500 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-500"
                              : "bg-indigo-50/20 border-indigo-200 text-indigo-900 dark:bg-zinc-950 dark:border-indigo-900 dark:text-indigo-400"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className={`text-xs font-extrabold ${noAccess ? "text-zinc-700 dark:text-zinc-400" : "text-indigo-800 dark:text-indigo-300"}`}>
                              {module.name}
                            </span>
                            <div className="shrink-0 flex items-center gap-1.5">
                              {isLockoutControl ? (
                                <span title="Core Admin function cannot be disabled">
                                  <Lock size={14} className="text-zinc-400" />
                                </span>
                              ) : (
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                                    noAccess
                                      ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                                      : viewOnly
                                        ? "bg-amber-50 text-amber-700 border border-amber-150 dark:bg-amber-950/30 dark:text-amber-400"
                                        : "bg-emerald-50 text-emerald-700 border border-emerald-150 dark:bg-emerald-950/30 dark:text-emerald-400"
                                  }`}
                                >
                                  {noAccess ? "No Access" : viewOnly ? "View Only" : "Custom Access"}
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-[10px] leading-relaxed text-zinc-400 line-clamp-2">
                            {module.description}
                          </p>

                          {noAccess ? (
                            permission.update && (
                              <button
                                type="button"
                                onClick={() => enableModule(role.id, module.id)}
                                className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 self-start"
                              >
                                + Enable Access
                              </button>
                            )
                          ) : (
                            <div className="flex items-center gap-1 flex-wrap mt-auto">
                              {ACTIONS.map(({ key, label, Icon }) => {
                                if (key !== "read" && !showAllActions) return null;
                                const active = perm[key];
                                const disabled = isLockoutControl || !permission.update;

                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    title={label}
                                    disabled={disabled}
                                    onClick={() => !disabled && applyPermissionChange(role.id, module.id, key, !active)}
                                    className={`h-7 w-7 rounded-md border flex items-center justify-center transition-colors ${
                                      disabled ? "cursor-default" : "cursor-pointer"
                                    } ${
                                      active
                                        ? "bg-indigo-600 border-indigo-600 text-white"
                                        : "bg-white border-zinc-200 text-zinc-300 hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700"
                                    }`}
                                  >
                                    <Icon size={13} />
                                  </button>
                                );
                              })}

                              {!isLockoutControl && permission.update && viewOnly && !expanded.has(cardKey) && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpanded(cardKey)}
                                  className="text-[10px] font-bold text-zinc-400 hover:text-indigo-500 ml-1"
                                >
                                  + Customize
                                </button>
                              )}

                              {!isLockoutControl && permission.update && !viewOnly && (
                                <button
                                  type="button"
                                  title="Reset to View Only"
                                  onClick={() => resetToViewOnly(role.id, module.id)}
                                  className="text-[10px] font-bold text-zinc-400 hover:text-indigo-500 ml-1"
                                >
                                  Reset
                                </button>
                              )}

                              {!isLockoutControl && permission.update && (
                                <button
                                  type="button"
                                  title="Remove all access"
                                  onClick={() => disableModule(role.id, module.id)}
                                  className="ml-auto text-zinc-300 hover:text-red-400"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
