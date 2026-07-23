"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Handshake, Search, RefreshCw, Loader2,
  ChevronLeft, ChevronRight, Link2
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
import { NativeSelect } from "@/components/ui/native-select";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface Project {
  id: number;
  projectName: string;
  countryName?: string;
  clientName?: string;
  statusId: number;
  status: string;
}

interface StatusOption {
  value: string;
  label: string;
}

export default function SuppliersLandingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [projectName, setProjectName] = useState("");
  const [status, setStatus] = useState("");

  const getStatusColor = (statusId: number) => {
    switch (statusId) {
      case 1: return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50";
      case 2: return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50";
      case 3: return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-900/50";
      case 4: return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800";
      case 5: return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50";
      case 6: return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-900/50";
      case 7: return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50";
      default: return "bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400";
    }
  };

  const loadFilterOptions = async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/projects/filter-options`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStatusOptions(data.statusOptions || []);
        }
      }
    } catch (err) {
      console.error("Error loading filter options", err);
    }
  };

  const loadProjects = useCallback(async (targetPage = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        pageNo: String(targetPage),
        maxPerPage: String(limit),
      });
      if (projectName) params.set("projectName", projectName);
      if (status) params.set("status", status);

      const res = await apiFetch(`${API_BASE_URL}/api/projects?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.projects) {
          setProjects(data.projects);
          setTotal(data.total);
        }
      }
    } catch (err) {
      console.error("Error loading projects list", err);
      toast.error("Failed to load projects list");
    } finally {
      setLoading(false);
    }
  }, [page, limit, projectName, status]);

  useEffect(() => {
    // Standard fetch-on-mount/param-change pattern: this function's own
    // setState calls are flagged by this rule as if the effect itself sets
    // state, but fetching data on mount/param change is exactly React's
    // documented "synchronize with an external system" use case, not the
    // render-derived-value anti-pattern this rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFilterOptions();
  }, []);

  useEffect(() => {
    // Standard fetch-on-mount/param-change pattern: this function's own
    // setState calls are flagged by this rule as if the effect itself sets
    // state, but fetching data on mount/param change is exactly React's
    // documented "synchronize with an external system" use case, not the
    // render-derived-value anti-pattern this rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProjects(page);
  }, [page, loadProjects]);

  const handleSearch = () => {
    setPage(1);
    loadProjects(1);
  };

  const handleRefresh = () => {
    setProjectName("");
    setStatus("");
    setPage(1);
    setTimeout(() => loadProjects(1), 50);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Band */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-2 border-b border-zinc-200 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
            <Handshake className="h-6 w-6 text-zinc-500" />
            Suppliers
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Select a project to allocate supplier panels and manage their callback links.
          </p>
        </div>
      </div>

      {/* 2. Filter Section */}
      <Card className="border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-500">Project Name</Label>
              <Input
                placeholder="Search By Name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-500">Status</Label>
              <NativeSelect
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-9"
              >
                <option value="">Select Status</option>
                {statusOptions.map((opt: StatusOption) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </NativeSelect>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                className="flex items-center gap-1 border-zinc-200 hover:bg-zinc-50 text-zinc-600 shadow-sm h-9"
              >
                <RefreshCw size={13} />
                <span>Refresh</span>
              </Button>
              <Button
                onClick={handleSearch}
                size="sm"
                className="flex items-center gap-1 shadow-sm h-9"
              >
                <Search size={13} />
                <span>Search</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Table / Results Card */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden bg-white dark:bg-zinc-900">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
              <span className="text-sm font-medium text-zinc-500">Querying projects index...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
              <span className="text-sm font-bold text-zinc-600">No Projects Found</span>
              <span className="text-xs text-zinc-400">Try modifying your search filters.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border-collapse">
                <TableHeader className="bg-zinc-50/70 dark:bg-zinc-900">
                  <TableRow className="border-b border-zinc-200">
                    <TableHead className="font-semibold text-zinc-600 h-10 w-12 text-center">SN</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 w-14 text-center">ID</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">Name</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">Company</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 text-center">Status</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 w-40 text-center">#</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project, idx) => {
                    const rowNum = (page - 1) * limit + idx + 1;
                    return (
                      <TableRow
                        key={project.id}
                        className="border-b border-zinc-150 hover:bg-zinc-50/50 transition-colors"
                      >
                        <TableCell className="text-center font-medium text-zinc-500 py-3">{rowNum}</TableCell>
                        <TableCell className="text-center font-bold text-zinc-800 dark:text-zinc-200">{project.id}</TableCell>
                        <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                          <div className="flex flex-col">
                            <span>{project.projectName}</span>
                            <span className="text-[10px] text-zinc-400 font-normal">{project.countryName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-zinc-600 dark:text-zinc-300 font-medium">{project.clientName || "NA"}</TableCell>
                        <TableCell className="text-center">
                          <span className={`h-7 inline-flex items-center px-2.5 rounded-full text-xs font-semibold border ${getStatusColor(project.statusId)}`}>
                            {project.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            onClick={() => router.push(`/supliers/${project.id}`)}
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-indigo-600 hover:text-indigo-700 border-zinc-200 flex items-center gap-1.5 mx-auto"
                          >
                            <Link2 size={13} />
                            <span>Manage Suppliers</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Pagination Controls */}
      {!loading && projects.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 p-4 rounded-lg shadow-sm">
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
    </div>
  );
}
