"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, Loader2, RefreshCw, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { API_BASE_URL, apiFetch } from "@/lib/api";

// Row shape from GET /api/projects - the same endpoint the internal admin
// tool uses (no dedicated /api/client/** endpoint exists yet, so this is NOT
// scoped to one client's own projects - it lists every project). Read-only:
// no add/edit/delete/status-change/duplicate actions, and no
// client_cpi/vendor_cpi/profit fields (this DTO never carried them).
interface Project {
  id: string;
  projectName: string;
  countryName?: string;
  hits?: number;
  quotaFull?: number;
  complete?: number;
  disqualify?: number;
  securityTerm?: number;
  statusId: number;
  status?: string;
}

const STATUS_COLORS: Record<number, string> = {
  1: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", // Bidding
  2: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400", // Testing
  3: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400", // Running
  4: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400", // Hold
  5: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400", // Completed
  6: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400", // Awaiting-Ids
  7: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" // Closed
};

export default function ProjectsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");

  const fetchProjects = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/projects?maxPerPage=1000`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.projects) {
          setProjects(data.projects);
        }
      }
    } catch (err) {
      console.error("Error fetching projects", err);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Standard fetch-on-mount pattern - see the equivalent comment in
    // view-project-survey-details/page.tsx for why this is exactly React's
    // documented "synchronize with an external system" use case, not the
    // render-derived-value anti-pattern this rule otherwise targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProjects(true);
  }, [fetchProjects]);

  const filteredProjects = projects.filter((p) =>
    p.projectName?.toLowerCase().includes(search.toLowerCase())
  );

  const goToStatusDetails = (projectId: string, statusCode: number) => {
    router.push(`/projects/view-project-survey-details/${projectId}/${statusCode}`);
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-zinc-600" />
        <span className="text-sm font-medium text-zinc-500">Loading Projects...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
            <FolderKanban className="h-6 w-6" />
            Your Projects
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Survey projects and their completion stats.
          </p>
        </div>
        <Button
          onClick={() => fetchProjects(true)}
          disabled={loading}
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 border-zinc-200 text-zinc-600 dark:text-zinc-300 shadow-sm"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <Card className="border border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
              <TableRow>
                <TableHead className="font-bold">Project</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold">Country</TableHead>
                <TableHead className="font-bold text-right">Complete</TableHead>
                <TableHead className="font-bold text-right">Disqualify</TableHead>
                <TableHead className="font-bold text-right">Quota Full</TableHead>
                <TableHead className="font-bold text-right">Security Term</TableHead>
                <TableHead className="font-bold text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-zinc-500">
                    {projects.length === 0 ? "No projects yet." : "No projects match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjects.map((project) => (
                  <TableRow key={project.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                    <TableCell className="font-semibold text-sm max-w-[240px] truncate" title={project.projectName}>
                      {project.projectName}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[project.statusId] || STATUS_COLORS[1]}>
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{project.countryName || "NA"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => goToStatusDetails(project.id, 1)}
                        className="h-7 px-2 font-mono hover:bg-cyan-50 hover:text-cyan-700 text-cyan-600 dark:text-cyan-400"
                      >
                        {project.complete ?? 0}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => goToStatusDetails(project.id, 2)}
                        className="h-7 px-2 font-mono hover:bg-red-50 hover:text-red-700 text-red-600 dark:text-red-400"
                      >
                        {project.disqualify ?? 0}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => goToStatusDetails(project.id, 3)}
                        className="h-7 px-2 font-mono hover:bg-amber-50 hover:text-amber-700 text-amber-600 dark:text-amber-400"
                      >
                        {project.quotaFull ?? 0}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => goToStatusDetails(project.id, 4)}
                        className="h-7 px-2 font-mono hover:bg-zinc-100 text-zinc-600"
                      >
                        {project.securityTerm ?? 0}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right font-bold text-sm">{project.hits ?? 0}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
