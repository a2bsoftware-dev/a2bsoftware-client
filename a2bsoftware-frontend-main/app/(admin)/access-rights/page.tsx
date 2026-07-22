"use client";

import React, { useEffect, useState } from "react";
import { 
  ShieldAlert, Loader2, Save, CheckSquare, Square, 
  UserCheck, AlertTriangle, ArrowRightLeft, Lock
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { API_BASE_URL, apiFetch } from "@/lib/api";

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

interface RoleMapping {
  id: string;
  name: string;
  accessRightIds: number[];
}

export default function AccessRightsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<RoleMapping[]>([]);

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
    loadData();
  }, []);

  // 2. Toggle checkbox selections for a role
  const handleTogglePrivilege = (roleId: string, moduleId: number, checked: boolean) => {
    setRoles((prevRoles) =>
      prevRoles.map((role) => {
        if (role.id !== roleId) return role;

        const updatedIds = checked
          ? [...role.accessRightIds, moduleId]
          : role.accessRightIds.filter((id) => id !== moduleId);

        return {
          ...role,
          accessRightIds: updatedIds
        };
      })
    );
  };

  // 3. Save access rights changes
  const handleSaveChanges = async () => {
    setSaving(true);
    toast.info("Saving updated role privilege mappings...");

    try {
      const payload = roles.map((role) => ({
        roleId: role.id,
        accessRightIds: role.accessRightIds
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
            Configure system privilege matrices dynamically for Admin and Manager profiles.
          </p>
        </div>
        <div>
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
          {roles.map((role) => (
            <Card key={role.id} className="border-zinc-200 shadow-sm overflow-hidden bg-white dark:bg-zinc-900">
              <CardHeader className="py-4 border-b border-zinc-150 bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-indigo-500" />
                    <span>{role.name} Permissions Matrix</span>
                  </CardTitle>
                  <CardDescription className="text-[11px] text-zinc-400 mt-0.5">
                    User Type ID: {role.id} — Active Modules: {role.accessRightIds.length} of {ACCESS_RIGHTS_MODULES.length}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-150">
                    {role.name} Account
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {ACCESS_RIGHTS_MODULES.map((module) => {
                    const isChecked = role.accessRightIds.includes(module.id);
                    
                    // Admin cannot disable Access Rights or Dashboard from themselves to avoid locking admin out
                    const isLockoutControl = role.name === "Admin" && (module.id === 21 || module.id === 1);

                    return (
                      <div
                        key={module.id}
                        onClick={() => {
                          if (!isLockoutControl) {
                            handleTogglePrivilege(role.id, module.id, !isChecked);
                          }
                        }}
                        className={`p-3.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between h-[110px] select-none ${
                          isChecked
                            ? "bg-indigo-50/20 border-indigo-200 text-indigo-900 dark:bg-zinc-950 dark:border-indigo-900 dark:text-indigo-400"
                            : "bg-zinc-50/30 border-zinc-150 text-zinc-500 hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-500"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className={`text-xs font-extrabold ${isChecked ? "text-indigo-800 dark:text-indigo-300" : "text-zinc-700 dark:text-zinc-400"}`}>
                            {module.name}
                          </span>
                          <div className="shrink-0">
                            {isLockoutControl ? (
                              <span title="Core Admin function cannot be disabled">
                                <Lock size={15} className="text-zinc-400" />
                              </span>
                            ) : isChecked ? (
                              <CheckSquare size={16} className="text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <Square size={16} className="text-zinc-300" />
                            )}
                          </div>
                        </div>

                        <p className="text-[10px] leading-relaxed text-zinc-400 line-clamp-2 mt-2">
                          {module.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
