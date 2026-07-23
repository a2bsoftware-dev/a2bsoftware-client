"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardStatsCards from "@/components/dashboard-stats-cards";
import ProjectStatusCards from "@/components/project-status-cards";
import MonthlyStatsSection from "@/components/monthly-stats-section";
import SurveyDetailsModal from "@/components/survey-details-modal";
import ProjectDetailsModal from "@/components/project-details-modal";
import { API_BASE_URL, apiFetch } from "@/lib/api";

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
  user_id: string;
  country_name?: string;
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

// Shape of a single row in `monthlyStastics` - only `status` is read (to
// bucket counts by status), so that's all this file needs to declare.
interface MonthlyStatisticItem {
  status: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

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

  const [biddings, setBiddings] = useState<ProjectStatusItem[]>([]);
  const [testings, setTestings] = useState<ProjectStatusItem[]>([]);
  const [runnings, setRunnings] = useState<ProjectStatusItem[]>([]);
  const [holds, setHolds] = useState<ProjectStatusItem[]>([]);
  const [completed, setCompleted] = useState<ProjectStatusItem[]>([]);
  const [awaitings, setAwaitings] = useState<ProjectStatusItem[]>([]);
  const [closed, setClosed] = useState<ProjectStatusItem[]>([]);

  const [completsMonthlyCount, setCompletsMonthlyCount] = useState(0);
  const [disqualifiesMonthlyCount, setDisqualifiesMonthlyCount] = useState(0);
  const [quotaFullsMonthlyCount, setQuotaFullsMonthlyCount] = useState(0);
  const [securityTermsMonthlyCount, setSecurityTermsMonthlyCount] = useState(0);

  // Grouping calculations (daily). Wrapped in useCallback so fetchDashboardInit
  // (below) gets a stable reference - these only call the stable setState
  // setters they close over, so they never need to change identity.
  const calculateDailyStastics = useCallback((data: SurveyInformationItem[]) => {
    const c: SurveyInformationItem[] = [];
    const dq: SurveyInformationItem[] = [];
    const qf: SurveyInformationItem[] = [];
    const st: SurveyInformationItem[] = [];
    const dr: SurveyInformationItem[] = [];

    data.forEach((item) => {
      if (item.status === 0) dr.push(item);
      else if (item.status === 1) c.push(item);
      else if (item.status === 2) dq.push(item);
      else if (item.status === 3) qf.push(item);
      else if (item.status === 4) st.push(item);
    });

    setComplets(c);
    setDisqualifies(dq);
    setQuotaFulls(qf);
    setSecurityTerms(st);
    setDrops(dr);
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

  // Grouping calculations (monthly statistics)
  const calculateMonthlyStatistics = useCallback((data: MonthlyStatisticItem[]) => {
    let cCount = 0;
    let dqCount = 0;
    let qfCount = 0;
    let stCount = 0;

    data.forEach((item) => {
      if (item.status === 1) cCount++;
      else if (item.status === 2) dqCount++;
      else if (item.status === 3) qfCount++;
      else if (item.status === 4) stCount++;
    });

    setCompletsMonthlyCount(cCount);
    setDisqualifiesMonthlyCount(dqCount);
    setQuotaFullsMonthlyCount(qfCount);
    setSecurityTermsMonthlyCount(stCount);
  }, []);

  // Fetch functions. Wrapped in useCallback (depending only on the
  // corresponding memoized calculate* function above) so the mount effect
  // below can safely list them as dependencies without triggering a new
  // effect run on every render.
  const fetchDashboardInit = useCallback(async (showLoader = false, trackActivity = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/dashboard/survey-informations`, { trackActivity });
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
  }, [calculateDailyStastics]);

  const fetchProjectStatusInit = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/dashboard/project-status`);
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
  }, [calculateProjectStatus]);

  const fetchMonthlyStastics = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/dashboard/monthly-statistics`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.monthlyStastics) {
          setMonthlyStastics(data.monthlyStastics);
          calculateMonthlyStatistics(data.monthlyStastics);
        }
      }
    } catch (err) {
      console.error("Error fetching monthly statistics", err);
    }
  }, [calculateMonthlyStatistics]);

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

    // 60 second interval auto-refresh (matches original AngularJS controller interval).
    // trackActivity=false: this is a background poll, not something the user did -
    // it must not keep the idle-logout timer alive on its own.
    const interval = setInterval(() => {
      fetchDashboardInit(false, false);
    }, 60000);

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-zinc-600" />
        <span className="text-sm font-medium text-zinc-500">Loading Dashboard Statistics...</span>
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

      {/* 1. Today's Project Statistics Card Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            Today&apos;s Project Statistics
          </h2>
          <Button
            onClick={() => window.open("/export-dashboard", "_blank")}
            variant="outline"
            size="sm"
            className="text-xs bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100 hover:text-yellow-900 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-900/50"
          >
            Export Dashboard
          </Button>
        </div>
        <DashboardStatsCards
          completsCount={complets.length}
          disqualifiesCount={disqualifies.length}
          quotaFullsCount={quotaFulls.length}
          securityTermsCount={securityTerms.length}
          dropsCount={drops.length}
          onCardClick={handleShowDailyFullDetails}
        />
      </section>

      {/* 2. Project Status Grid Section */}
      <section className="space-y-3 pt-2">
        <h2 className="text-base font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
          Project Status Counters
        </h2>
        <ProjectStatusCards
          biddingsCount={biddings.length}
          testingsCount={testings.length}
          runningsCount={runnings.length}
          holdsCount={holds.length}
          awaitingsCount={awaitings.length}
          closedCount={closed.length}
          completedCount={completed.length}
          onCardClick={handleShowDailyFullProjectDetails}
        />
      </section>

      {/* 3. Monthly Statistics Section */}
      <section className="pt-2">
        <MonthlyStatsSection
          completsMonthlyCount={completsMonthlyCount}
          disqualifiesMonthlyCount={disqualifiesMonthlyCount}
          quotaFullsMonthlyCount={quotaFullsMonthlyCount}
          securityTermMonthlyCount={securityTermsMonthlyCount}
          totalMonthlyCount={monthlyStastics.length}
        />
      </section>

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
