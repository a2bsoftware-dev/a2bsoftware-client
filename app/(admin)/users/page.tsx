"use client";

import React, { useCallback, useEffect, useState } from "react";
import { 
  Users, Plus, Search, RefreshCw, 
  Edit2, Trash2, Loader2, KeyRound,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { NativeSelect } from "@/components/ui/native-select";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import { useModulePermission } from "@/hooks/use-module-permission";

// Matches the "Users" entry in ACCESS_RIGHTS_MODULES (access-rights page)
// and MODULE_ID in the backend's UserController.
const USERS_MODULE_ID = 10;

interface User {
  id: string;
  userName: string;
  mobile?: string;
  email: string;
  checkPassword?: string;
  roleId?: string;
  role?: string;
}

interface Role {
  id: string;
  name: string;
}

export default function UsersPage() {
  const { permission } = useModulePermission(USERS_MODULE_ID);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Search Filters
  const [filters, setFilters] = useState({
    user_name: "",
    mobile: "",
    email: "",
  });

  // Roles list
  const [roles, setRoles] = useState<Role[]>([]);

  // Dialog States
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [userData, setUserData] = useState({
    id: "",
    user_name: "",
    mobile: "",
    email: "",
    check_password: "",
    role_id: "",
  });

  // Fetch users list
  const loadUsers = useCallback(async (targetPage = page, targetLimit = limit) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        pageNo: String(targetPage),
        maxPerPage: String(targetLimit),
      });
      if (filters.user_name) params.set("userName", filters.user_name);
      if (filters.mobile) params.set("mobile", filters.mobile);
      if (filters.email) params.set("email", filters.email);

      const res = await apiFetch(`${API_BASE_URL}/api/users?${params.toString()}`);

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUsers(data.users || []);
          setTotal(data.total || 0);
          setRoles(data.roles || []);
        }
      }
    } catch (err) {
      console.error("Error loading users", err);
      toast.error("Failed to load users list");
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => {
    // Standard fetch-on-mount/param-change pattern: this function's own
    // setState calls are flagged by this rule as if the effect itself sets
    // state, but fetching data on mount/param change is exactly React's
    // documented "synchronize with an external system" use case, not the
    // render-derived-value anti-pattern this rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers(page, limit);
  }, [page, limit, loadUsers]);

  const handleSearch = () => {
    setPage(1);
    loadUsers(1, limit);
  };

  const handleRefresh = () => {
    setFilters({
      user_name: "",
      mobile: "",
      email: "",
    });
    setPage(1);
    setTimeout(() => {
      loadUsers(1, limit);
    }, 50);
  };

  const openAddModal = () => {
    setUserData({
      id: "",
      user_name: "",
      mobile: "",
      email: "",
      check_password: "",
      role_id: "",
    });
    setUserModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setUserData({
      id: user.id,
      user_name: user.userName || "",
      mobile: user.mobile || "",
      email: user.email || "",
      check_password: user.checkPassword || "",
      role_id: user.roleId || "",
    });
    setUserModalOpen(true);
  };

  const handleSaveUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!userData.user_name || !userData.mobile || !userData.email || !userData.check_password || !userData.role_id) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSavingUser(true);
    try {
      const payload = {
        userName: userData.user_name,
        mobile: userData.mobile,
        email: userData.email,
        checkPassword: userData.check_password,
        roleId: userData.role_id || null,
      };
      const isUpdate = Boolean(userData.id);
      const res = await apiFetch(
        isUpdate ? `${API_BASE_URL}/api/users/${userData.id}` : `${API_BASE_URL}/api/users`,
        {
          method: isUpdate ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || "User details saved successfully");
          setUserModalOpen(false);
          loadUsers(page, limit);
        } else {
          toast.error(data.message || "Failed to save user details");
        }
      }
    } catch (err) {
      console.error("Error saving user details", err);
      toast.error("Error connecting to server to save user details");
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || "User deleted successfully");
          loadUsers(page, limit);
        } else {
          toast.error(data.error || "Failed to delete user");
        }
      }
    } catch (err) {
      console.error("Error deleting user", err);
      toast.error("Failed to delete user");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Band */}
      <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-zinc-500" />
            Users Management
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Add internal staff, project managers, and sales managers, and assign their platform roles.
          </p>
        </div>
        {permission.create && (
          <Button
            onClick={openAddModal}
            size="sm"
            className="flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={15} />
            <span>Add User</span>
          </Button>
        )}
      </div>

      {/* 2. Filter Search Card */}
      <Card className="border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
        <CardContent className="pt-5 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-500">User Name</Label>
              <Input
                placeholder="Search By User Name"
                value={filters.user_name}
                onChange={(e) => setFilters({ ...filters, user_name: e.target.value })}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-500">Mobile Number</Label>
              <Input
                placeholder="Search By Mobile Number"
                value={filters.mobile}
                onChange={(e) => setFilters({ ...filters, mobile: e.target.value })}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-500">Email Address</Label>
              <Input
                placeholder="Search By Email"
                value={filters.email}
                onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                className="h-9"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 border-zinc-200 hover:bg-zinc-50 text-zinc-600 shadow-sm"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </Button>
            <Button
              onClick={handleSearch}
              size="sm"
              className="flex items-center gap-1 shadow-sm"
            >
              <Search size={13} />
              <span>Search</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Table / Results Card */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden bg-white dark:bg-zinc-900">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
              <span className="text-sm font-medium text-zinc-500">Querying staff directories...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
              <span className="text-sm font-bold text-zinc-600">No Users Found</span>
              <span className="text-xs text-zinc-400">Try modifying search filters or register a new user.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border-collapse">
                <TableHeader className="bg-zinc-50/70 dark:bg-zinc-900">
                  <TableRow className="border-b border-zinc-200">
                    <TableHead className="font-semibold text-zinc-600 h-10 w-12 text-center">SN</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">User Name</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">Mobile No.</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">Role</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">Email Address</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">Password</TableHead>
                    {(permission.update || permission.delete) && (
                      <TableHead className="font-semibold text-zinc-600 h-10 w-24 text-center">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u, idx) => {
                    const rowNum = (page - 1) * limit + idx + 1;
                    return (
                      <TableRow key={u.id} className="border-b border-zinc-150 hover:bg-zinc-50/50 transition-colors">
                        <TableCell className="text-center font-medium text-zinc-400 py-3.5">{rowNum}</TableCell>
                        <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">{u.userName}</TableCell>
                        <TableCell className="text-zinc-600 font-mono text-xs">{u.mobile || "NA"}</TableCell>
                        <TableCell className="text-zinc-700 dark:text-zinc-300 font-medium">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            u.role === "Project Manager"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400"
                              : u.role === "Sales Manager"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}>
                            {u.role}
                          </span>
                        </TableCell>
                        <TableCell className="text-zinc-600 font-medium">{u.email}</TableCell>
                        <TableCell className="text-zinc-500 font-mono text-xs">{u.checkPassword}</TableCell>
                        {(permission.update || permission.delete) && (
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {permission.update && (
                                <Button
                                  onClick={() => openEditModal(u)}
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                                  title="Edit user details"
                                >
                                  <Edit2 size={14} />
                                </Button>
                              )}

                              {permission.delete && (
                                <Button
                                  onClick={() => handleDeleteUser(u.id)}
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                  title="Remove user account"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Pagination / Limit Controls */}
      {!loading && users.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">Show</span>
            <NativeSelect
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value));
                setPage(1);
              }}
              className="h-8 w-18 text-xs py-0"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </NativeSelect>
            <span className="text-xs text-zinc-500 font-medium">entries</span>
          </div>

          <div className="text-xs font-semibold text-zinc-500 text-center">
            Showing {Math.min(total, (page - 1) * limit + 1)} to {Math.min(total, page * limit)} of {total} entries
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="h-8 w-8 border-zinc-200"
            >
              <ChevronLeft size={15} />
            </Button>
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 px-3 bg-white dark:bg-zinc-950 border border-zinc-200 h-8 flex items-center justify-center rounded-md">
              {page}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page * limit >= total}
              onClick={() => setPage(page + 1)}
              className="h-8 w-8 border-zinc-200"
            >
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>
      )}

      {/* 5. Add / Update User Dialog Modal */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSaveUserSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                <KeyRound className="h-5 w-5 text-zinc-500" />
                {userData.id ? "Update User details" : "Add User account"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="userNameInput" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  User Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="userNameInput"
                  placeholder="Full User Name"
                  value={userData.user_name}
                  onChange={(e) => setUserData({ ...userData, user_name: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="userMobileInput" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  Mobile Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="userMobileInput"
                  placeholder="Mobile Line"
                  value={userData.mobile}
                  onChange={(e) => setUserData({ ...userData, mobile: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="userEmailInput" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="userEmailInput"
                  type="email"
                  placeholder="name@a2bsurvey.com"
                  value={userData.email}
                  onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="userPasswordInput" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="userPasswordInput"
                  placeholder="Access key Password"
                  value={userData.check_password}
                  onChange={(e) => setUserData({ ...userData, check_password: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="userRoleSelect" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  Assign Role <span className="text-red-500">*</span>
                </Label>
                <NativeSelect
                  id="userRoleSelect"
                  value={userData.role_id}
                  onChange={(e) => setUserData({ ...userData, role_id: e.target.value })}
                  required
                >
                  <option value="">Select Role</option>
                  {roles.map((r: Role) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setUserModalOpen(false)}
                disabled={savingUser}
                size="sm"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingUser} size="sm" className="flex items-center gap-1.5">
                {savingUser && <Loader2 size={14} className="animate-spin" />}
                <span>{userData.id ? "Update Details" : "Create Account"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
