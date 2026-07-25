"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  FileBarChart2,
  Search,
  Loader2,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import { useModulePermission } from "@/hooks/use-module-permission";

// Matches the "Projects" entry in ACCESS_RIGHTS_MODULES - the report is a
// project-scoped view of the same data the Projects screen manages, and
// there's no separate "Reports" access-right module.
const PROJECTS_MODULE_ID = 6;
const PAGE_SIZE = 20;

interface ProjectOption {
  id: string;
  projectName: string;
}

// Row shape returned by GET /api/client/projects/{id}/survey-details - this
// app only ever sees the one-way hashed uid (see ProjectService.redactRawUid)
// so the vendor's respondent can never be identified/contacted directly from
// here; uid itself always comes back null.
interface SurveyDetailRow {
  id: string;
  pid: string;
  gid: string | null;
  vendorName: string;
  projectName: string;
  clientName: string;
  startIpAddress: string;
  endIpAddress: string;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  refId: string;
  hashedUid: string | null;
  loi: string;
  status: string;
  countryName: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface CountryOption {
  id: string;
  name: string;
}

// Last 24 months, newest first, as {value: "yyyy-MM", label: "Jul 2026"} -
// generated client-side rather than fetched, since "every month that could
// possibly have data" isn't worth a round trip - the survey-details query
// itself already comes back empty for a month with nothing in it.
function buildMonthOptions(): FilterOption[] {
  const options: FilterOption[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

function monthBounds(yearMonth: string): { fromDate: string; toDate: string } {
  const [year, month] = yearMonth.split("-").map(Number);
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { fromDate: fmt(from), toDate: fmt(to) };
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "Complete":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400";
    case "Disqualify":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400";
    case "quotaFull":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400";
    case "securityTerm":
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400";
    case "Reconcile":
      return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/20 dark:text-violet-400";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400";
  }
}

// A client-uploaded reconciliation file - see ReconcileUploadDto on the
// backend. Nothing here changes any survey status automatically: an admin on
// the main frontend reviews the file and only their explicit approval flips
// matching rows to Reconcile (see ReconcileService.approve).
interface ReconcileUpload {
  id: string;
  fileName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  uploadedAt: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
  totalRows: number | null;
  matchedRows: number | null;
  rejectionReason: string | null;
}

function reconcileStatusBadgeClass(status: string) {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400";
    case "REJECTED":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400";
  }
}

export default function ReportsPage() {
  const { permission } = useModulePermission(PROJECTS_MODULE_ID);

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(true);

  // No project selected by default - the right pane starts empty rather
  // than auto-picking the first project in the list.
  const [selectedProject, setSelectedProject] = useState<ProjectOption | null>(null);
  const [rows, setRows] = useState<SurveyDetailRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingRows, setLoadingRows] = useState(false);
  const [downloading, setDownloading] = useState<"csv" | "xlsx" | null>(null);

  // Filter bar state - "" means "no filter" for every one of these. Month is
  // just a shortcut that fills fromDate/toDate with that whole calendar
  // month's bounds; picking a raw date directly clears it back to "" so the
  // dropdown never shows a stale month label next to a manually-edited range.
  const [statusOptions, setStatusOptions] = useState<FilterOption[]>([]);
  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCountryId, setFilterCountryId] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const hasActiveFilters = Boolean(filterStatus || filterCountryId || filterFromDate || filterToDate);

  const [reconcileDialogOpen, setReconcileDialogOpen] = useState(false);
  const [reconcileUploads, setReconcileUploads] = useState<ReconcileUpload[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch(`${API_BASE_URL}/api/client/projects`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) setProjects(data.projects || []);
      })
      .catch((err) => console.error("Error loading projects", err))
      .finally(() => setLoadingProjects(false));
  }, []);

  useEffect(() => {
    apiFetch(`${API_BASE_URL}/api/client/survey-filter-options`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) {
          setStatusOptions(data.surveyStatusOptions || []);
          setCountryOptions(data.countries || []);
        }
      })
      .catch((err) => console.error("Error loading survey filter options", err));
  }, []);

  const filterQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterCountryId) params.set("countryId", filterCountryId);
    if (filterFromDate) params.set("fromDate", filterFromDate);
    if (filterToDate) params.set("toDate", filterToDate);
    return params.toString();
  }, [filterStatus, filterCountryId, filterFromDate, filterToDate]);

  // Every filter control calls this directly (rather than a useEffect
  // watching filter state) so the reload reflects the value being set RIGHT
  // NOW, not whatever the state was before this render - setState is async,
  // so reading filterStatus/etc. straight after calling their setters here
  // would still see the OLD value. overrides only replaces what's actually
  // changing; "" is a valid override (clearing a filter), so this merges with
  // ?? (nullish-coalescing), never ||.
  const reloadWithFilters = (overrides: {
    status?: string;
    countryId?: string;
    fromDate?: string;
    toDate?: string;
  }) => {
    if (!selectedProject) return;
    const merged = {
      status: overrides.status ?? filterStatus,
      countryId: overrides.countryId ?? filterCountryId,
      fromDate: overrides.fromDate ?? filterFromDate,
      toDate: overrides.toDate ?? filterToDate,
    };
    const params = new URLSearchParams();
    if (merged.status) params.set("status", merged.status);
    if (merged.countryId) params.set("countryId", merged.countryId);
    if (merged.fromDate) params.set("fromDate", merged.fromDate);
    if (merged.toDate) params.set("toDate", merged.toDate);
    setPage(1);
    loadSurveyDetails(selectedProject.id, 1, params.toString());
  };

  const handleStatusFilterChange = (value: string | null) => {
    const status = value === "all" || !value ? "" : value;
    setFilterStatus(status);
    reloadWithFilters({ status });
  };

  const handleCountryFilterChange = (value: string | null) => {
    const countryId = value === "all" || !value ? "" : value;
    setFilterCountryId(countryId);
    reloadWithFilters({ countryId });
  };

  const applyMonth = (value: string) => {
    setFilterMonth(value);
    if (value === "all" || !value) {
      setFilterFromDate("");
      setFilterToDate("");
      reloadWithFilters({ fromDate: "", toDate: "" });
    } else {
      const { fromDate, toDate } = monthBounds(value);
      setFilterFromDate(fromDate);
      setFilterToDate(toDate);
      reloadWithFilters({ fromDate, toDate });
    }
  };

  const handleFromDateChange = (value: string) => {
    setFilterFromDate(value);
    setFilterMonth("");
    reloadWithFilters({ fromDate: value });
  };

  const handleToDateChange = (value: string) => {
    setFilterToDate(value);
    setFilterMonth("");
    reloadWithFilters({ toDate: value });
  };

  const clearFilters = () => {
    setFilterStatus("");
    setFilterCountryId("");
    setFilterMonth("");
    setFilterFromDate("");
    setFilterToDate("");
    reloadWithFilters({ status: "", countryId: "", fromDate: "", toDate: "" });
  };

  // extraOverride lets a filter-change handler pass the query string for the
  // value it's setting RIGHT NOW (see reloadWithFilters above) instead of
  // this reading current-render filter state, which would still be stale the
  // instant a setState call above it hasn't flushed yet. Pagination
  // (goToPage) omits it and falls back to filterQueryParams() - by then
  // state has long since settled, so reading it fresh is fine.
  const loadSurveyDetails = useCallback(async (projectId: string, targetPage: number, extraOverride?: string) => {
    setLoadingRows(true);
    try {
      const extra = extraOverride !== undefined ? extraOverride : filterQueryParams();
      const res = await apiFetch(
        `${API_BASE_URL}/api/client/projects/${projectId}/survey-details?pageNo=${targetPage}&maxPerPage=${PAGE_SIZE}${extra ? `&${extra}` : ""}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRows(data.surveyInformations || []);
          setTotal(data.total || 0);
        } else {
          toast.error("Failed to load survey details");
        }
      } else {
        toast.error("Failed to load survey details");
      }
    } catch (err) {
      console.error("Error loading survey details", err);
      toast.error("Error connecting to server");
    } finally {
      setLoadingRows(false);
    }
  }, [filterQueryParams]);

  const selectProject = (project: ProjectOption) => {
    setSelectedProject(project);
    setPage(1);
    loadSurveyDetails(project.id, 1);
  };

  const goToPage = (targetPage: number) => {
    if (!selectedProject) return;
    setPage(targetPage);
    loadSurveyDetails(selectedProject.id, targetPage);
  };

  const handleDownload = async (format: "csv" | "xlsx") => {
    if (!selectedProject) {
      toast.error("Please select a project first");
      return;
    }
    setDownloading(format);
    try {
      const extra = filterQueryParams();
      const res = await apiFetch(
        `${API_BASE_URL}/api/client/projects/${selectedProject.id}/survey-details/export?format=${format}${extra ? `&${extra}` : ""}`
      );
      if (!res.ok) {
        toast.error("Failed to download report");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `survey_details_${selectedProject.projectName.replace(/[^a-zA-Z0-9_-]+/g, "_")}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Report downloaded");
    } catch (err) {
      console.error("Error downloading report", err);
      toast.error("Error connecting to server");
    } finally {
      setDownloading(null);
    }
  };

  const loadReconcileUploads = useCallback(async (projectId: string) => {
    setLoadingUploads(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/client/projects/${projectId}/reconcile-uploads`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setReconcileUploads(data.uploads || []);
      }
    } catch (err) {
      console.error("Error loading reconcile uploads", err);
    } finally {
      setLoadingUploads(false);
    }
  }, []);

  const openReconcileDialog = () => {
    if (!selectedProject) return;
    setReconcileDialogOpen(true);
    loadReconcileUploads(selectedProject.id);
  };

  const handleFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedProject) return;

    const isCsvOrXlsx = /\.(csv|xlsx)$/i.test(file.name);
    if (!isCsvOrXlsx) {
      toast.error("Only .csv and .xlsx files are accepted");
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch(`${API_BASE_URL}/api/client/projects/${selectedProject.id}/reconcile-uploads`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        toast.success("File uploaded - awaiting admin review");
        loadReconcileUploads(selectedProject.id);
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.message || "Failed to upload file");
      }
    } catch (err) {
      console.error("Error uploading reconcile file", err);
      toast.error("Error connecting to server");
    } finally {
      setUploadingFile(false);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.projectName.toLowerCase().includes(projectSearch.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!permission.read) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-2">
        <span className="text-sm font-bold text-zinc-600">You don&apos;t have access to Reports.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-zinc-200">
        <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
          <FileBarChart2 className="h-6 w-6 text-zinc-500" />
          Reports
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Select a project to view its survey activity and download a CSV or Excel report.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
        {/* Left pane: project picker */}
        <Card className="border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
          <CardHeader className="py-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <Input
                placeholder="Search projects..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[65vh] overflow-y-auto">
            {loadingProjects ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="py-10 text-center text-xs text-zinc-400">No projects found.</div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectProject(p)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      selectedProject?.id === p.id
                        ? "bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/30 dark:text-indigo-400"
                        : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    {p.projectName}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right pane: survey data for the selected project */}
        <Card className="border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
          <CardHeader className="py-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              {selectedProject ? selectedProject.projectName : "Select a project"}
            </CardTitle>
            {selectedProject && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openReconcileDialog}
                  className="h-8 flex items-center gap-1.5"
                >
                  <UploadCloud size={13} />
                  <span>Reconcile</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={downloading !== null}
                        className="h-8 flex items-center gap-1.5"
                      />
                    }
                  >
                    {downloading !== null ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    <span>Download</span>
                    <ChevronDown size={13} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownload("csv")}>CSV</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload("xlsx")}>Excel (.xlsx)</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </CardHeader>
          {selectedProject && (
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <Select value={filterStatus || "all"} onValueChange={(v) => handleStatusFilterChange(v)}>
                <SelectTrigger className="h-8 w-[140px] text-xs" aria-label="Filter by status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterCountryId || "all"} onValueChange={(v) => handleCountryFilterChange(v)}>
                <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Filter by country">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countryOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterMonth || "all"} onValueChange={(v) => applyMonth(v ?? "all")}>
                <SelectTrigger className="h-8 w-[140px] text-xs" aria-label="Filter by month">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {monthOptions.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={filterFromDate}
                  onChange={(e) => handleFromDateChange(e.target.value)}
                  className="h-8 w-[135px] text-xs"
                  aria-label="From date"
                />
                <span className="text-xs text-zinc-400">to</span>
                <Input
                  type="date"
                  value={filterToDate}
                  onChange={(e) => handleToDateChange(e.target.value)}
                  className="h-8 w-[135px] text-xs"
                  aria-label="To date"
                />
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-8 text-xs text-zinc-500" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          )}
          <CardContent className="pt-4">
            {!selectedProject ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="text-sm text-zinc-400">Select a project on the left to view its surveys.</span>
              </div>
            ) : loadingRows ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="text-sm text-zinc-400">No survey activity recorded for this project yet.</span>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">#</TableHead>
                        <TableHead className="text-xs">Start IP</TableHead>
                        <TableHead className="text-xs">End IP</TableHead>
                        <TableHead className="text-xs">Start Time</TableHead>
                        <TableHead className="text-xs">End Time</TableHead>
                        <TableHead className="text-xs">Ref ID</TableHead>
                        <TableHead className="text-xs">UID</TableHead>
                        <TableHead className="text-xs text-center">LOI</TableHead>
                        <TableHead className="text-xs text-center">Status</TableHead>
                        <TableHead className="text-xs">Country</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, idx) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-zinc-500 text-xs">{(page - 1) * PAGE_SIZE + idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs text-zinc-500">{row.startIpAddress}</TableCell>
                          <TableCell className="font-mono text-xs text-zinc-500">{row.endIpAddress}</TableCell>
                          <TableCell className="font-mono text-xs text-zinc-600">{row.startDate} {row.startTime}</TableCell>
                          <TableCell className="font-mono text-xs text-zinc-600">{row.endDate} {row.endTime}</TableCell>
                          <TableCell className="font-mono text-xs text-zinc-500 max-w-[120px] truncate" title={row.refId}>{row.refId}</TableCell>
                          <TableCell className="font-mono text-xs text-zinc-500 max-w-[160px] truncate" title={row.hashedUid || ""}>{row.hashedUid || "-"}</TableCell>
                          <TableCell className="text-center font-mono font-bold text-xs text-zinc-700 dark:text-zinc-300">{row.loi}</TableCell>
                          <TableCell className="text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadgeClass(row.status)}`}>
                              {row.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-zinc-600">{row.countryName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-xs text-zinc-500">
                    Page {page} of {totalPages} &middot; {total} total
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={page <= 1}
                      onClick={() => goToPage(page - 1)}
                    >
                      <ChevronLeft size={14} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={page >= totalPages}
                      onClick={() => goToPage(page + 1)}
                    >
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={reconcileDialogOpen} onOpenChange={setReconcileDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reconcile{selectedProject ? ` — ${selectedProject.projectName}` : ""}</DialogTitle>
            <DialogDescription>
              Upload a CSV or Excel file listing the UIDs you want reconciled. An admin will review it
              and, once approved, matching entries will show as Reconcile across all dashboards.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={handleFileSelected}
            />
            <Button
              variant="outline"
              className="w-full flex items-center gap-2"
              disabled={uploadingFile}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingFile ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
              <span>{uploadingFile ? "Uploading..." : "Choose a .csv or .xlsx file to upload"}</span>
            </Button>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Past uploads</span>
              {loadingUploads ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                </div>
              ) : reconcileUploads.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-400">No reconcile files uploaded yet.</div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {reconcileUploads.map((u) => (
                    <div
                      key={u.id}
                      className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate" title={u.fileName}>
                          {u.fileName}
                        </span>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${reconcileStatusBadgeClass(u.status)}`}>
                          {u.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Uploaded {new Date(u.uploadedAt).toLocaleString()}
                      </div>
                      {u.status === "APPROVED" && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          {u.matchedRows} of {u.totalRows} UIDs matched and reconciled
                        </div>
                      )}
                      {u.status === "REJECTED" && u.rejectionReason && (
                        <div className="text-[11px] text-red-600 dark:text-red-400">Reason: {u.rejectionReason}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
