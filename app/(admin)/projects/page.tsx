"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban, Plus, RefreshCw, Search,
  Trash2, Edit2, Copy, Check, Eye, Loader2,
  ChevronLeft, ChevronRight, MoreVertical, Link2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { NativeSelect } from "@/components/ui/native-select";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import ProjectViewModal from "@/components/project-view-modal";
import ProjectEditModal from "@/components/project-edit-modal";
import { useModulePermission } from "@/hooks/use-module-permission";

// Matches the "Projects" entry in ACCESS_RIGHTS_MODULES (access-rights page)
// and MODULE_ID in the backend's ProjectController.
const PROJECTS_MODULE_ID = 6;

// Row shape returned by GET /api/projects (and reused for the selected-project
// state used by the status-change modal).
interface Project {
  id: string;
  parentProjectId?: string | null;
  projectName: string;
  // Some call sites (status modal) read this snake_case field instead of
  // `projectName` - kept here as-is to preserve existing behavior.
  project_name?: string;
  countryName?: string;
  surveyLink?: string;
  clientName?: string;
  projectManager?: string;
  salesManagers?: string;
  startDateCreated?: string;
  hits?: number;
  quotaFull?: number;
  complete?: number;
  disqualify?: number;
  securityTerm?: number;
  abendond?: number;
  ir?: number;
  loi?: number;
  statusId: number;
  status?: string;
  copyForClient?: number;
}

// Minimal shapes for the dropdown option lists returned by
// GET /api/projects/filter-options.
interface FilterProjectOption {
  id: string | number;
  projectName: string;
}

interface FilterCountryOption {
  id: string | number;
  name: string;
}

interface FilterClientOption {
  id: string | number;
  clientName: string;
}

interface FilterUserOption {
  id: string | number;
  userName: string;
}

interface FilterStatusOption {
  value: string | number;
  label: string;
}

interface FilterOptions {
  clients: FilterClientOption[];
  countries: FilterCountryOption[];
  projects: FilterProjectOption[];
  projectManagers: FilterUserOption[];
  salesManagers: FilterUserOption[];
  statusOptions: FilterStatusOption[];
}

export default function ProjectsPage() {
  const router = useRouter();
  const { permission } = useModulePermission(PROJECTS_MODULE_ID);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Filter lists fetched on mount
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    clients: [],
    countries: [],
    projects: [],
    projectManagers: [],
    salesManagers: [],
    statusOptions: [],
  });

  // Current filters
  const [filters, setFilters] = useState({
    id: "",
    parent_project_id: "",
    project_name: "",
    status: "",
    country_id: "",
    client_id: "",
    project_manager_id: "",
    sales_manager_id: "",
  });

  // Status edit modal states
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedStatusId, setSelectedStatusId] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // View / Edit project modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Survey link copy state
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Fetch filters options
  const loadFilterOptions = async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/projects/filter-options`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFilterOptions(data);
        }
      }
    } catch (err) {
      console.error("Error loading filter lists", err);
    }
  };

  // Fetch projects list
  const loadProjects = useCallback(async (targetPage = page, targetLimit = limit, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({
        pageNo: String(targetPage),
        maxPerPage: String(targetLimit),
      });
      const filterParamMap: Record<string, string> = {
        id: "id",
        parent_project_id: "parentProjectId",
        project_name: "projectName",
        status: "status",
        country_id: "countryId",
        client_id: "clientId",
        project_manager_id: "projectManagerId",
        sales_manager_id: "salesManagerId",
      };
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== "" && value !== undefined && value !== null) {
          params.set(filterParamMap[key] ?? key, String(value));
        }
      });

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
      if (!silent) toast.error("Failed to load projects list");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, limit, filters]);

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
    loadProjects(page, limit);
  }, [page, limit, loadProjects]);

  // Live hit counts: silently re-fetch the current page every few seconds so
  // Hits/Complete/Disqualify/etc. reflect new survey activity without the
  // user needing to manually refresh. "silent" skips the loading spinner and
  // error toast so this stays invisible unless something actually changes.
  useEffect(() => {
    const interval = setInterval(() => {
      loadProjects(page, limit, true);
    }, 5000);
    return () => clearInterval(interval);
  }, [page, limit, loadProjects]);

  const handleSearch = () => {
    setPage(1);
    loadProjects(1, limit);
  };

  const handleRefresh = () => {
    setFilters({
      id: "",
      parent_project_id: "",
      project_name: "",
      status: "",
      country_id: "",
      client_id: "",
      project_manager_id: "",
      sales_manager_id: "",
    });
    setPage(1);
    // Fetch immediately with cleared filters
    setTimeout(() => {
      loadProjects(1, limit);
    }, 50);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || "Project deleted successfully");
          loadProjects(page, limit);
        } else {
          toast.error(data.error || "Failed to delete project");
        }
      }
    } catch (err) {
      console.error("Error deleting project", err);
      toast.error("Failed to delete project");
    }
  };

  const handleCopy = async (id: string) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/projects/${id}/copy`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || "Project duplicated successfully");
          loadProjects(page, limit);
        } else {
          toast.error(data.error || "Failed to copy project");
        }
      }
    } catch (err) {
      console.error("Error duplicating project", err);
      toast.error("Failed to duplicate project");
    }
  };

  const handleCopySurveyLink = (link: string, projectId: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLinkId(projectId);
    toast.success("Survey link copied to clipboard");
    setTimeout(() => {
      setCopiedLinkId((current) => (current === projectId ? null : current));
    }, 2000);
  };

  const openStatusModal = (project: Project) => {
    setSelectedProject(project);
    setSelectedStatusId(String(project.statusId));
    setStatusModalOpen(true);
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    setUpdatingStatus(true);
    try {
      const res = await apiFetch(
        `${API_BASE_URL}/api/projects/${selectedProject.id}/status?statusId=${selectedStatusId}`,
        { method: "PATCH" }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || "Status updated successfully");
          setStatusModalOpen(false);
          loadProjects(page, limit);
        } else {
          toast.error(data.error || "Failed to update status");
        }
      }
    } catch (err) {
      console.error("Error updating status", err);
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (statusId: number) => {
    switch (statusId) {
      case 1: return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50"; // Bidding
      case 2: return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50"; // Testing
      case 3: return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-900/50"; // Running
      case 4: return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800"; // Hold
      case 5: return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50"; // Completed
      case 6: return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-900/50"; // Awaiting-Ids
      case 7: return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50"; // Closed
      default: return "bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Band */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-2 border-b border-zinc-200 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-zinc-500" />
            Projects Inventory
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure links, target completions, and track supplier allocations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {permission.create && (
            <Button
              onClick={() => window.location.href = "/projects/add"}
              size="sm"
              className="flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={15} />
              <span>Add Project</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 border-zinc-200 shadow-sm"
          >
            <span>Sync Projects</span>
          </Button>
        </div>
      </div>

      {/* 2. Filter Section */}
      <Card className="border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
        <CardHeader className="py-3 border-b border-zinc-100 dark:border-zinc-800">
          <CardTitle className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Search className="h-4 w-4 text-zinc-400" />
            Search Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-500">ID</Label>
              <Input
                placeholder="Search By ID"
                value={filters.id}
                onChange={(e) => setFilters({ ...filters, id: e.target.value })}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-500">Self Parent ID</Label>
              <NativeSelect
                value={filters.parent_project_id}
                onChange={(e) => setFilters({ ...filters, parent_project_id: e.target.value })}
                className="h-9"
              >
                <option value="">Select Parent</option>
                {filterOptions.projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.id} - {p.projectName}</option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-500">Project Name</Label>
              <Input
                placeholder="Search By Name"
                value={filters.project_name}
                onChange={(e) => setFilters({ ...filters, project_name: e.target.value })}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-500">Status</Label>
              <NativeSelect
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="h-9"
              >
                <option value="">Select Status</option>
                {filterOptions.statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-500">Country</Label>
              <NativeSelect
                value={filters.country_id}
                onChange={(e) => setFilters({ ...filters, country_id: e.target.value })}
                className="h-9"
              >
                <option value="">Select Country</option>
                {filterOptions.countries.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-500">Client</Label>
              <NativeSelect
                value={filters.client_id}
                onChange={(e) => setFilters({ ...filters, client_id: e.target.value })}
                className="h-9"
              >
                <option value="">Select Client</option>
                {filterOptions.clients.map((cl) => (
                  <option key={cl.id} value={cl.id}>{cl.clientName}</option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-500">Project Manager</Label>
              <NativeSelect
                value={filters.project_manager_id}
                onChange={(e) => setFilters({ ...filters, project_manager_id: e.target.value })}
                className="h-9"
              >
                <option value="">Select PM</option>
                {filterOptions.projectManagers.map((pm) => (
                  <option key={pm.id} value={pm.id}>{pm.userName}</option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-500">Sales Manager</Label>
              <NativeSelect
                value={filters.sales_manager_id}
                onChange={(e) => setFilters({ ...filters, sales_manager_id: e.target.value })}
                className="h-9"
              >
                <option value="">Select SM</option>
                {filterOptions.salesManagers.map((sm) => (
                  <option key={sm.id} value={sm.id}>{sm.userName}</option>
                ))}
              </NativeSelect>
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
              <span className="text-sm font-medium text-zinc-500">Querying projects index...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
              <span className="text-sm font-bold text-zinc-600">No Projects Found</span>
              <span className="text-xs text-zinc-400">Try modifying your search filters or add a new project.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border-collapse">
                <TableHeader className="bg-zinc-50/70 dark:bg-zinc-900">
                  <TableRow className="border-b border-zinc-200">
                    <TableHead className="font-semibold text-zinc-600 h-10 w-12 text-center">SN</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 w-14 text-center">ID</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 w-16 text-center">Parent</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">Name</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">Survey Link</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">Company</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">PM/SM</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">Start Date</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 text-center">Hits</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 text-center">Quota Full</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 text-center">Complete</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 text-center">Disqualify</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 text-center">Security Term</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 text-center">Drop</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 text-center">IR</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 text-center">LOI</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 text-center">Status</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 text-center">#</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project, idx) => {
                    const rowNum = (page - 1) * limit + idx + 1;
                    const isClientCopy = project.copyForClient === 1;
                    // Narrowed local so TS knows it's a string inside the
                    // onClick closure below (property narrowing doesn't
                    // persist into nested closures).
                    const surveyLink = project.surveyLink;

                    return (
                      <TableRow 
                        key={project.id}
                        className={`border-b border-zinc-150 hover:bg-zinc-50/50 transition-colors ${
                          isClientCopy 
                            ? "bg-cyan-50/40 hover:bg-cyan-50/70 dark:bg-cyan-950/10 dark:hover:bg-cyan-950/20" 
                            : ""
                        }`}
                      >
                        <TableCell className="text-center font-medium text-zinc-500 py-3">{rowNum}</TableCell>
                        <TableCell className="text-center font-bold text-zinc-800 dark:text-zinc-200">{project.id}</TableCell>
                        <TableCell className="text-center text-zinc-500 font-mono text-[10px]" title={project.parentProjectId || undefined}>
                          {project.parentProjectId ? `${project.parentProjectId.slice(0, 8)}…` : "-"}
                        </TableCell>
                        <TableCell className="font-medium text-zinc-900 dark:text-zinc-100 max-w-[200px] truncate">
                          <div className="flex flex-col">
                            <span>{project.projectName}</span>
                            <span className="text-[10px] text-zinc-400 font-normal">{project.countryName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {surveyLink ? (
                            <div className="flex items-center gap-1">
                              <a
                                href={surveyLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={surveyLink}
                                className="block max-w-[160px] truncate text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                              >
                                {surveyLink}
                              </a>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCopySurveyLink(surveyLink, project.id)}
                                className="h-6 w-6 shrink-0 text-zinc-500 hover:text-zinc-950"
                                title="Copy survey link"
                              >
                                {copiedLinkId === project.id ? (
                                  <Check size={13} className="text-emerald-600" />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-600 dark:text-zinc-300 font-medium">{project.clientName || "NA"}</TableCell>
                        <TableCell className="text-zinc-500 text-xs">
                          <div className="flex flex-col">
                            <span>PM: {project.projectManager || "NA"}</span>
                            <span>SM: {project.salesManagers || "NA"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-zinc-600 text-xs">{project.startDateCreated || "NA"}</TableCell>
                        <TableCell className="text-center font-mono font-bold text-zinc-700 dark:text-zinc-300">{project.hits}</TableCell>
                        
                        <TableCell className="text-center">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => window.location.href = `/projects/view-project-survey-details/${project.id}/3`}
                            className="h-7 px-2 font-mono hover:bg-zinc-100 text-zinc-600"
                          >
                            {project.quotaFull}
                          </Button>
                        </TableCell>

                        <TableCell className="text-center">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => window.location.href = `/projects/view-project-survey-details/${project.id}/1`}
                            className="h-7 px-2 font-mono hover:bg-cyan-50 hover:text-cyan-700 text-cyan-600 dark:text-cyan-400"
                          >
                            {project.complete}
                          </Button>
                        </TableCell>

                        <TableCell className="text-center">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => window.location.href = `/projects/view-project-survey-details/${project.id}/2`}
                            className="h-7 px-2 font-mono hover:bg-red-50 hover:text-red-700 text-red-600 dark:text-red-400"
                          >
                            {project.disqualify}
                          </Button>
                        </TableCell>

                        <TableCell className="text-center">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => window.location.href = `/projects/view-project-survey-details/${project.id}/4`}
                            className="h-7 px-2 font-mono hover:bg-zinc-100 text-zinc-600"
                          >
                            {project.securityTerm}
                          </Button>
                        </TableCell>

                        <TableCell className="text-center font-mono text-zinc-500 text-xs">{project.abendond}%</TableCell>
                        <TableCell className="text-center font-mono font-bold text-zinc-700 dark:text-zinc-300 text-xs">{project.ir}%</TableCell>
                        <TableCell className="text-center font-mono text-zinc-600">{project.loi}</TableCell>
                        
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!permission.update}
                            onClick={() => openStatusModal(project)}
                            className={`h-7 px-2.5 rounded-full text-xs font-semibold border ${getStatusColor(project.statusId)}`}
                          >
                            {project.status}
                          </Button>
                        </TableCell>

                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                                  title="More actions"
                                />
                              }
                            >
                              <MoreVertical size={14} />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setActiveProjectId(project.id);
                                  setViewModalOpen(true);
                                }}
                              >
                                <Eye size={14} /> View details
                              </DropdownMenuItem>
                              {permission.update && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setActiveProjectId(project.id);
                                    setEditModalOpen(true);
                                  }}
                                >
                                  <Edit2 size={14} /> Edit project
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => router.push(`/supliers/${project.id}`)}
                              >
                                <Link2 size={14} /> Manage Suppliers
                              </DropdownMenuItem>
                              {permission.create && (
                                <DropdownMenuItem
                                  onClick={() => handleCopy(project.id)}
                                >
                                  <Copy size={14} /> Duplicate project
                                </DropdownMenuItem>
                              )}
                              {permission.delete && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => handleDelete(project.id)}
                                  >
                                    <Trash2 size={14} /> Delete project
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* 4. Pagination / Limit Controls */}
      {!loading && projects.length > 0 && (
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

      {/* 5. Change Status Dialog Modal */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleStatusSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Change Project Status
              </DialogTitle>
              {selectedProject && (
                <p className="text-xs text-zinc-500">
                  Modifying status for project: <strong>{selectedProject.project_name}</strong> (ID: {selectedProject.id})
                </p>
              )}
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="projectStatusSelect" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  Select New Status
                </Label>
                <NativeSelect
                  id="projectStatusSelect"
                  value={selectedStatusId}
                  onChange={(e) => setSelectedStatusId(e.target.value)}
                  className="h-10 mt-1"
                >
                  {filterOptions.statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStatusModalOpen(false)}
                disabled={updatingStatus}
                size="sm"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updatingStatus} size="sm" className="flex items-center gap-1.5">
                {updatingStatus && <Loader2 size={14} className="animate-spin" />}
                <span>Save Status</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. View Project Modal */}
      <ProjectViewModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        projectId={activeProjectId}
      />

      {/* 7. Edit Project Modal */}
      <ProjectEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        projectId={activeProjectId}
        onSaved={() => loadProjects(page, limit)}
      />
    </div>
  );
}
