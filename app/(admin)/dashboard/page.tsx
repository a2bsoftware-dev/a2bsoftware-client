"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import SurveyDetailsModal from "@/components/survey-details-modal";
import ProjectDetailsModal from "@/components/project-details-modal";
import TodayStatusPieChart from "@/components/charts/today-status-pie-chart";
import ProjectStatusBarChart from "@/components/charts/project-status-bar-chart";
import MonthlyTrendAreaChart, { DailyTrendRow } from "@/components/charts/monthly-trend-area-chart";
import StatusRadarChart from "@/components/charts/status-radar-chart";
import CompletionRadialChart from "@/components/charts/completion-radial-chart";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { ChartSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

interface FilterOption {
  value: string;
  label: string;
}

interface CountryOption {
  id: string;
  name: string;
}

// Last 24 months, newest first, as {value: "yyyy-MM", label: "Jul 2026"} -
// generated client-side, same convention as the Reports page filter bar.
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

// Shape of a single row in `surveyInformations` (and the grouped arrays derived
// from it). Mirrors the `SurveyTransaction` shape expected by
// SurveyDetailsModal, since these rows are passed through to it unchanged.
interface SurveyInformationItem {
  id: string;
  pid: string;
  gid: string;
  vendorName?: string;
  project_name: string;
  clientName?: string;
  start_ip_address: string;
  end_ip_address?: string;
  start_time?: string;
  end_time?: string;
  start_date?: string;
  end_date?: string;
  ref_id: string;
  uid: string;
  country_name?: string;
  client_cpi: number | string;
  vendor_cpi: number | string;
  profit: number | string;
  status: number;
}

// Shape of a single row in `projectStatus` (and the grouped arrays derived
// from it). Mirrors the `ProjectStatusDetail` shape expected by
// ProjectDetailsModal, since these rows are passed through to it unchanged.
interface ProjectStatusItem {
  id: string;
  parent_project_id: string | null;
  project_name: string;
  clientName?: string;
  project_manager?: string;
  salesManagers?: string;
  start_date?: string;
  status: number;
}

// Shape of a single row in `monthlyStastics`. status buckets the per-status
// counters; start_time additionally feeds the monthly trend area chart's
// per-day grouping (see buildDailyTrend).
interface MonthlyStatisticItem {
  status: number;
  start_time?: string;
}

// Groups raw monthlyStastics rows (one per survey attempt) into one row per
// calendar day, counted by status - the shape MonthlyTrendAreaChart expects.
// Reconcile (status 5): a Drop hit later proven legitimate via an approved
// client reconciliation file - flipped server-side from status 0 to 5, so it
// gets its own explicit case rather than falling into the Drop default.
function buildDailyTrend(rows: MonthlyStatisticItem[]): DailyTrendRow[] {
  const byDay = new Map<string, DailyTrendRow>();
  for (const row of rows) {
    if (!row.start_time) continue;
    const day = row.start_time.slice(0, 10);
    let entry = byDay.get(day);
    if (!entry) {
      entry = { day, complete: 0, disqualify: 0, quotaFull: 0, securityTerm: 0, drop: 0, reconcile: 0 };
      byDay.set(day, entry);
    }
    switch (row.status) {
      case 1: entry.complete++; break;
      case 2: entry.disqualify++; break;
      case 3: entry.quotaFull++; break;
      case 4: entry.securityTerm++; break;
      case 5: entry.reconcile++; break;
      default: entry.drop++; break;
    }
  }
  return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const dashboardContentRef = useRef<HTMLDivElement>(null);

  // Data states
  const [surveyInformations, setSurveyInformations] = useState<SurveyInformationItem[]>([]);
  const [, setProjectStatus] = useState<ProjectStatusItem[]>([]);
  const [monthlyStastics, setMonthlyStastics] = useState<MonthlyStatisticItem[]>([]);

  // Modal states
  const [surveyModalOpen, setSurveyModalOpen] = useState(false);
  const [surveyModalTitle, setSurveyModalTitle] = useState("");
  const [surveyModalData, setSurveyModalData] = useState<SurveyInformationItem[]>([]);

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectModalTitle, setProjectModalTitle] = useState("");
  const [projectModalData, setProjectModalData] = useState<ProjectStatusItem[]>([]);

  // Filtered stats helper arrays
  const [complets, setComplets] = useState<SurveyInformationItem[]>([]);
  const [disqualifies, setDisqualifies] = useState<SurveyInformationItem[]>([]);
  const [quotaFulls, setQuotaFulls] = useState<SurveyInformationItem[]>([]);
  const [securityTerms, setSecurityTerms] = useState<SurveyInformationItem[]>([]);
  const [drops, setDrops] = useState<SurveyInformationItem[]>([]);
  const [reconciles, setReconciles] = useState<SurveyInformationItem[]>([]);

  const [biddings, setBiddings] = useState<ProjectStatusItem[]>([]);
  const [testings, setTestings] = useState<ProjectStatusItem[]>([]);
  const [runnings, setRunnings] = useState<ProjectStatusItem[]>([]);
  const [holds, setHolds] = useState<ProjectStatusItem[]>([]);
  const [completed, setCompleted] = useState<ProjectStatusItem[]>([]);
  const [awaitings, setAwaitings] = useState<ProjectStatusItem[]>([]);
  const [closed, setClosed] = useState<ProjectStatusItem[]>([]);

  // Filter bar state - same convention as the Reports page filter bar: ""
  // means "no filter" for every one of these, and picking a month is just a
  // shortcut that fills fromDate/toDate with that whole calendar month.
  const [statusOptions, setStatusOptions] = useState<FilterOption[]>([]);
  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCountryId, setFilterCountryId] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const hasActiveFilters = Boolean(filterStatus || filterCountryId || filterFromDate || filterToDate);

  useEffect(() => {
    apiFetch(`${API_BASE_URL}/api/client/survey-filter-options`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) {
          setStatusOptions(data.surveyStatusOptions || []);
          setCountryOptions(data.countries || []);
        }
      })
      .catch((err) => console.error("Error loading dashboard filter options", err));
  }, []);

  // Mirrors the filter state into a ref on every change (a ref mutation, not
  // a setState call, so this doesn't trip react-hooks/set-state-in-effect).
  // filterQueryParams below reads from this ref instead of closing over the
  // state variables directly, so it keeps a STABLE identity across filter
  // changes - which in turn keeps fetchDashboardInit/fetchProjectStatusInit/
  // fetchMonthlyStastics stable too, so changing a filter doesn't tear down
  // and restart the 5-second polling effect below.
  const filterStateRef = useRef({ filterStatus, filterCountryId, filterFromDate, filterToDate });
  useEffect(() => {
    filterStateRef.current = { filterStatus, filterCountryId, filterFromDate, filterToDate };
  }, [filterStatus, filterCountryId, filterFromDate, filterToDate]);

  // overrides lets a filter-change handler pass the value it's setting RIGHT
  // NOW - setState is async, so reading filterStateRef.current straight after
  // calling a setter in the same handler would still see the OLD value. ""
  // is a valid override (clearing a filter), so this merges with ??
  // (nullish-coalescing), never ||.
  const filterQueryParams = useCallback((overrides?: {
    status?: string;
    countryId?: string;
    fromDate?: string;
    toDate?: string;
  }) => {
    const current = filterStateRef.current;
    const merged = {
      status: overrides?.status ?? current.filterStatus,
      countryId: overrides?.countryId ?? current.filterCountryId,
      fromDate: overrides?.fromDate ?? current.filterFromDate,
      toDate: overrides?.toDate ?? current.filterToDate,
    };
    const params = new URLSearchParams();
    if (merged.status) params.set("status", merged.status);
    if (merged.countryId) params.set("countryId", merged.countryId);
    if (merged.fromDate) params.set("fromDate", merged.fromDate);
    if (merged.toDate) params.set("toDate", merged.toDate);
    return params.toString();
  }, []);

  // Grouping calculations (daily). Wrapped in useCallback so fetchDashboardInit
  // (below) gets a stable reference - these only call the stable setState
  // setters they close over, so they never need to change identity.
  const calculateDailyStastics = useCallback((data: SurveyInformationItem[]) => {
    const c: SurveyInformationItem[] = [];
    const dq: SurveyInformationItem[] = [];
    const qf: SurveyInformationItem[] = [];
    const st: SurveyInformationItem[] = [];
    const dr: SurveyInformationItem[] = [];
    const rc: SurveyInformationItem[] = [];

    data.forEach((item) => {
      if (item.status === 0) dr.push(item);
      else if (item.status === 1) c.push(item);
      else if (item.status === 2) dq.push(item);
      else if (item.status === 3) qf.push(item);
      else if (item.status === 4) st.push(item);
      else if (item.status === 5) rc.push(item);
    });

    setComplets(c);
    setDisqualifies(dq);
    setQuotaFulls(qf);
    setSecurityTerms(st);
    setDrops(dr);
    setReconciles(rc);
  }, []);

  // Grouping calculations (projects status)
  const calculateProjectStatus = useCallback((data: ProjectStatusItem[]) => {
    const bid: ProjectStatusItem[] = [];
    const test: ProjectStatusItem[] = [];
    const run: ProjectStatusItem[] = [];
    const hold: ProjectStatusItem[] = [];
    const comp: ProjectStatusItem[] = [];
    const awaitId: ProjectStatusItem[] = [];
    const cls: ProjectStatusItem[] = [];

    data.forEach((item) => {
      if (item.status === 1) bid.push(item);
      else if (item.status === 2) test.push(item);
      else if (item.status === 3) run.push(item);
      else if (item.status === 4) hold.push(item);
      else if (item.status === 5) comp.push(item);
      else if (item.status === 6) awaitId.push(item);
      else if (item.status === 7) cls.push(item);
    });

    setBiddings(bid);
    setTestings(test);
    setRunnings(run);
    setHolds(hold);
    setCompleted(comp);
    setAwaitings(awaitId);
    setClosed(cls);
  }, []);

  // Fetch functions. Wrapped in useCallback (depending only on the
  // corresponding memoized calculate* function above) so the mount effect
  // below can safely list them as dependencies without triggering a new
  // effect run on every render.
  const fetchDashboardInit = useCallback(async (showLoader = false, trackActivity = true, extraOverride?: string) => {
    if (showLoader) setLoading(true);
    try {
      const extra = extraOverride !== undefined ? extraOverride : filterQueryParams();
      const res = await apiFetch(`${API_BASE_URL}/api/dashboard/survey-informations${extra ? `?${extra}` : ""}`, { trackActivity });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.surveyInformations) {
          setSurveyInformations(data.surveyInformations);
          calculateDailyStastics(data.surveyInformations);
        }
      }
    } catch (err) {
      console.error("Error fetching dashboard survey informations", err);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [calculateDailyStastics, filterQueryParams]);

  const fetchProjectStatusInit = useCallback(async (trackActivity = true, extraOverride?: string) => {
    try {
      const extra = extraOverride !== undefined ? extraOverride : filterQueryParams();
      const res = await apiFetch(`${API_BASE_URL}/api/dashboard/project-status${extra ? `?${extra}` : ""}`, { trackActivity });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.projectStatus) {
          setProjectStatus(data.projectStatus);
          calculateProjectStatus(data.projectStatus);
        }
      }
    } catch (err) {
      console.error("Error fetching project statuses", err);
    }
  }, [calculateProjectStatus, filterQueryParams]);

  const fetchMonthlyStastics = useCallback(async (trackActivity = true, extraOverride?: string) => {
    try {
      const extra = extraOverride !== undefined ? extraOverride : filterQueryParams();
      const res = await apiFetch(`${API_BASE_URL}/api/dashboard/monthly-statistics${extra ? `?${extra}` : ""}`, { trackActivity });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.monthlyStastics) {
          setMonthlyStastics(data.monthlyStastics);
        }
      }
    } catch (err) {
      console.error("Error fetching monthly statistics", err);
    }
  }, [filterQueryParams]);

  // Every filter control calls this directly (rather than a useEffect
  // watching filter state) to avoid the react-hooks/set-state-in-effect lint
  // error, and passes the SAME extra query string (built with the override
  // that's changing right now) to all three fetches so every graph responds
  // to the new filter together, not just one of them.
  const reloadAllWithFilters = (overrides: {
    status?: string;
    countryId?: string;
    fromDate?: string;
    toDate?: string;
  }) => {
    const extra = filterQueryParams(overrides);
    fetchDashboardInit(false, true, extra);
    fetchProjectStatusInit(true, extra);
    fetchMonthlyStastics(true, extra);
  };

  const handleStatusFilterChange = (value: string | null) => {
    const status = value === "all" || !value ? "" : value;
    setFilterStatus(status);
    reloadAllWithFilters({ status });
  };

  const handleCountryFilterChange = (value: string | null) => {
    const countryId = value === "all" || !value ? "" : value;
    setFilterCountryId(countryId);
    reloadAllWithFilters({ countryId });
  };

  const applyMonth = (value: string) => {
    setFilterMonth(value);
    if (value === "all" || !value) {
      setFilterFromDate("");
      setFilterToDate("");
      reloadAllWithFilters({ fromDate: "", toDate: "" });
    } else {
      const { fromDate, toDate } = monthBounds(value);
      setFilterFromDate(fromDate);
      setFilterToDate(toDate);
      reloadAllWithFilters({ fromDate, toDate });
    }
  };

  const handleFromDateChange = (value: string) => {
    setFilterFromDate(value);
    setFilterMonth("");
    reloadAllWithFilters({ fromDate: value });
  };

  const handleToDateChange = (value: string) => {
    setFilterToDate(value);
    setFilterMonth("");
    reloadAllWithFilters({ toDate: value });
  };

  const clearFilters = () => {
    setFilterStatus("");
    setFilterCountryId("");
    setFilterMonth("");
    setFilterFromDate("");
    setFilterToDate("");
    reloadAllWithFilters({ status: "", countryId: "", fromDate: "", toDate: "" });
  };

  // Trigger loading details in modals
  const handleShowDailyFullDetails = (type: number) => {
    if (type === 1) {
      setSurveyModalTitle("Complete");
      setSurveyModalData(complets);
    } else if (type === 2) {
      setSurveyModalTitle("Disqualify");
      setSurveyModalData(disqualifies);
    } else if (type === 3) {
      setSurveyModalTitle("Quota Full");
      setSurveyModalData(quotaFulls);
    } else if (type === 4) {
      setSurveyModalTitle("Security Term");
      setSurveyModalData(securityTerms);
    } else if (type === 0) {
      setSurveyModalTitle("Drop");
      setSurveyModalData(drops);
    } else if (type === 5) {
      setSurveyModalTitle("Reconcile");
      setSurveyModalData(reconciles);
    }
    setSurveyModalOpen(true);
  };

  const handleShowDailyFullProjectDetails = (status: number) => {
    if (status === 1) {
      setProjectModalTitle("Biddings");
      setProjectModalData(biddings);
    } else if (status === 2) {
      setProjectModalTitle("Testings");
      setProjectModalData(testings);
    } else if (status === 3) {
      setProjectModalTitle("Runnings");
      setProjectModalData(runnings);
    } else if (status === 4) {
      setProjectModalTitle("Holds");
      setProjectModalData(holds);
    } else if (status === 6) {
      setProjectModalTitle("Awaitings - IDs");
      setProjectModalData(awaitings);
    } else if (status === 7) {
      setProjectModalTitle("Closed");
      setProjectModalData(closed);
    } else if (status === 5) {
      setProjectModalTitle("Completed");
      setProjectModalData(completed);
    }
    setProjectModalOpen(true);
  };

  // Export excel trigger
  const handleExportTodayStasticsExcel = async () => {
    setExportLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/dashboard/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(surveyModalData)
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `daily_survey_export_${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Error exporting statistics excel", err);
    } finally {
      setExportLoading(false);
    }
  };

  // Snapshots the currently-rendered chart sections (already reflecting
  // whatever filters are active) into a multi-page PDF - client-side only,
  // no server rendering infra exists for this. html2canvas-pro (not the
  // plain html2canvas package) is required here because this app's Tailwind
  // v4 theme uses oklch() CSS colors, which classic html2canvas can't parse.
  const handleExportDashboardPdf = async () => {
    if (!dashboardContentRef.current) return;
    setExportingPdf(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(dashboardContentRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`dashboard_export_${Date.now()}.pdf`);
    } catch (err) {
      console.error("Error exporting dashboard as PDF", err);
      toast.error("Failed to export dashboard as PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  // Pull data on mount & start interval refresh
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboardInit(),
        fetchProjectStatusInit(),
        fetchMonthlyStastics()
      ]);
      setLoading(false);
    };

    loadAllData();

    // Live dashboard: silently re-fetch everything (today's survey info,
    // project status board, monthly statistics) every few seconds so all of
    // it reflects new activity without a manual refresh. trackActivity=false
    // on every call: this is a background poll, not something the user did -
    // it must not keep the idle-logout timer alive on its own.
    const interval = setInterval(() => {
      fetchDashboardInit(false, false);
      fetchProjectStatusInit(false);
      fetchMonthlyStastics(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchDashboardInit, fetchProjectStatusInit, fetchMonthlyStastics]);

  const triggerManualRefresh = async () => {
    setLoading(true);
    await Promise.all([
      fetchDashboardInit(),
      fetchProjectStatusInit(),
      fetchMonthlyStastics()
    ]);
    setLoading(false);
  };

  if (loading && surveyInformations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-3 w-72" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-32" />
          ))}
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <ChartSkeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Refresh band */}
      <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Monitor real-time survey activities and completions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportDashboardPdf}
            disabled={exportingPdf}
            variant="outline"
            size="sm"
            className="text-xs bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100 hover:text-yellow-900 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-900/50 flex items-center gap-1.5"
          >
            {exportingPdf ? <Loader2 size={13} className="animate-spin" /> : null}
            <span>{exportingPdf ? "Exporting..." : "Export Dashboard"}</span>
          </Button>
          <Button
            onClick={triggerManualRefresh}
            disabled={loading}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 border-zinc-200 text-zinc-600 dark:text-zinc-300 shadow-sm"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filter bar - every graph below responds to these together */}
      <div className="flex flex-wrap items-center gap-2 pb-1">
        <Select
          items={[{ value: "all", label: "All Statuses" }, ...statusOptions]}
          value={filterStatus || "all"}
          onValueChange={(v) => handleStatusFilterChange(v)}
        >
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

        <Select
          items={[{ value: "all", label: "All Countries" }, ...countryOptions.map((c) => ({ value: c.id, label: c.name }))]}
          value={filterCountryId || "all"}
          onValueChange={(v) => handleCountryFilterChange(v)}
        >
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

        <Select
          items={[{ value: "all", label: "All Months" }, ...monthOptions]}
          value={filterMonth || "all"}
          onValueChange={(v) => applyMonth(v ?? "all")}
        >
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

      <div ref={dashboardContentRef} className="space-y-6 bg-white dark:bg-zinc-950">
        {/* 1. Today's Survey Activity */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            Today&apos;s Survey Activity
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TodayStatusPieChart
              completed={complets.length}
              disqualify={disqualifies.length}
              quotaFull={quotaFulls.length}
              securityTerm={securityTerms.length}
              drop={drops.length}
              reconcile={reconciles.length}
              onSliceClick={(key) =>
                handleShowDailyFullDetails(
                  key === "completed" ? 1 : key === "disqualify" ? 2 : key === "quotaFull" ? 3 : key === "securityTerm" ? 4 : key === "reconcile" ? 5 : 0
                )
              }
            />
            <CompletionRadialChart completed={complets.length} totalHits={surveyInformations.length} />
          </div>
        </section>

        {/* 2. Project Status */}
        <section className="space-y-3 pt-2">
          <h2 className="text-base font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            Project Status Counters
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ProjectStatusBarChart
              bidding={biddings.length}
              testing={testings.length}
              running={runnings.length}
              hold={holds.length}
              awaiting={awaitings.length}
              closed={closed.length}
              completed={completed.length}
              onBarClick={handleShowDailyFullProjectDetails}
            />
            <StatusRadarChart
              completed={complets.length}
              disqualify={disqualifies.length}
              quotaFull={quotaFulls.length}
              securityTerm={securityTerms.length}
              drop={drops.length}
              reconcile={reconciles.length}
            />
          </div>
        </section>

        {/* 3. Monthly Trend */}
        <section className="pt-2">
          <MonthlyTrendAreaChart data={buildDailyTrend(monthlyStastics)} />
        </section>
      </div>

      {/* Details Modals */}
      <SurveyDetailsModal
        isOpen={surveyModalOpen}
        onClose={() => setSurveyModalOpen(false)}
        title={surveyModalTitle}
        data={surveyModalData}
        exportLoading={exportLoading}
        onExportClick={handleExportTodayStasticsExcel}
      />

      <ProjectDetailsModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        title={projectModalTitle}
        data={projectModalData}
      />
    </div>
  );
}
