"use client";

import { useCallback, useEffect, useState } from "react";
import { FileBarChart2, Search, Loader2, Download, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    default:
      return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400";
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

  useEffect(() => {
    apiFetch(`${API_BASE_URL}/api/client/projects`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) setProjects(data.projects || []);
      })
      .catch((err) => console.error("Error loading projects", err))
      .finally(() => setLoadingProjects(false));
  }, []);

  const loadSurveyDetails = useCallback(async (projectId: string, targetPage: number) => {
    setLoadingRows(true);
    try {
      const res = await apiFetch(
        `${API_BASE_URL}/api/client/projects/${projectId}/survey-details?pageNo=${targetPage}&maxPerPage=${PAGE_SIZE}`
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
  }, []);

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
      const res = await apiFetch(
        `${API_BASE_URL}/api/client/projects/${selectedProject.id}/survey-details/export?format=${format}`
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
                  onClick={() => handleDownload("csv")}
                  disabled={downloading !== null}
                  className="h-8 flex items-center gap-1.5"
                >
                  {downloading === "csv" ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  <span>CSV</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload("xlsx")}
                  disabled={downloading !== null}
                  className="h-8 flex items-center gap-1.5"
                >
                  {downloading === "xlsx" ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
                  <span>Excel</span>
                </Button>
              </div>
            )}
          </CardHeader>
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
    </div>
  );
}
