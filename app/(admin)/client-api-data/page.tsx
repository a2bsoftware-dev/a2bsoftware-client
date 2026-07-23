"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  FileCode, CloudLightning, Trash2, CheckCircle,
  XCircle, Settings, Edit2, Loader2, ChevronLeft,
  ChevronRight, Search, KeyRound, Plus,
  Landmark, HelpCircle, Sparkles, DownloadCloud,
  Check, CheckCircle2, ClipboardCopy,
  Download, Upload, ListChecks,
  ArrowUp, ArrowDown, ArrowUpDown
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
import { toast } from "sonner";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import { useModulePermission } from "@/hooks/use-module-permission";

// Matches the "Client Api Data" entry in ACCESS_RIGHTS_MODULES (access-rights page)
// and MODULE_ID in the backend's ClientApiDataController.
const CLIENT_API_DATA_MODULE_ID = 20;

// A single answer option belonging to a screening qualification question.
interface QualificationOption {
  answerText: string;
  isCorrect: boolean;
}

// A screening/profiling qualification question pulled from (or imported to) Zamplia.
interface Qualification {
  questionName: string;
  questionType: string;
  questionText: string;
  options: QualificationOption[];
}

// Country option used for filtering/sync and campaign country selection.
interface Country {
  id: string;
  name: string;
}

// Language option used for campaign language selection.
interface Language {
  id: string;
  languageName: string;
}

// Client option used to map an API settings config to an internal client.
interface Client {
  id: string;
  clientName: string;
}

// A single imported/synced campaign row from the client API data list.
interface ClientApiDataItem {
  id: string;
  surveyId: string;
  projectName: string;
  reqComplete: number;
  loi: number;
  ir: number;
  cpc: number;
  countryName?: string;
  countryId?: string;
  languageId?: string;
  approved: number;
  topSurvey?: number;
  surveyLink?: string;
}

// Single screening question, with options and the correct/qualifying answer keys highlighted.
function QualificationCard({ qual }: { qual: Qualification }) {
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-150 space-y-2">
      <div className="flex justify-between items-start">
        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
          {qual.questionName}
        </span>
        <span className="text-[10px] text-zinc-400 font-medium">
          Type: {qual.questionType}
        </span>
      </div>

      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-snug">
        {qual.questionText}
      </p>

      <div className="space-y-1.5">
        <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">
          Demographic Options & Correct Answer Keys
        </span>
        <div className="grid grid-cols-1 gap-1">
          {qual.options.map((opt: QualificationOption, oidx: number) => (
            <div
              key={oidx}
              className={`flex items-center justify-between p-2 rounded text-xs border transition-colors ${
                opt.isCorrect
                  ? "bg-emerald-50/50 border-emerald-200 text-emerald-900 font-bold dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900"
                  : "bg-zinc-50/40 border-zinc-200 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800"
              }`}
            >
              <span>{opt.answerText}</span>
              {opt.isCorrect && (
                <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">
                  <CheckCircle2 size={11} />
                  <span>Correct / Qualifying</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ClientApiDataPage() {
  const { permission } = useModulePermission(CLIENT_API_DATA_MODULE_ID);
  const [loading, setLoading] = useState(true);
  const [fetchingApi, setFetchingApi] = useState(false);
  const [syncCountry, setSyncCountry] = useState<{ value: string; label: string }>({
    value: "all",
    label: "All Countries",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);

  // Pagination & List States
  const [dataset, setDataset] = useState<ClientApiDataItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [approvedFilter, setApprovedFilter] = useState("all");
  const [sortBy, setSortBy] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Bulk Operations State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // CSV Export/Import State
  const [exporting, setExporting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // Settings & Options States
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [settingsData, setSettingsData] = useState({
    api_name: "Zamplia",
    client_id: "",
  });
  const [countries, setCountries] = useState<Country[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Add/Edit Campaign Dialog State
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [campaignData, setCampaignData] = useState({
    id: "",
    surveyId: "",
    project_name: "",
    req_complete: "",
    loi: "",
    ir: "",
    cpc: "",
    survey_link: "",
    language_id: "",
    country_id: "",
    approved: "0",
  });

  // Dynamic Qualifications State
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loadingQuals, setLoadingQuals] = useState(false);
  const [importingQuals, setImportingQuals] = useState(false);
  const [showQualsTab, setShowQualsTab] = useState(false);
  const [copied, setCopied] = useState(false);

  // Standalone Qualifications Viewer Popup (opened from the Actions column)
  const [qualsViewOpen, setQualsViewOpen] = useState(false);
  const [qualsViewProject, setQualsViewProject] = useState<ClientApiDataItem | null>(null);
  const [qualsViewList, setQualsViewList] = useState<Qualification[]>([]);
  const [qualsViewLoading, setQualsViewLoading] = useState(false);

  const loadData = useCallback(async (
    targetPage = page,
    targetLimit = limit,
    targetSearch = debouncedSearch,
    targetApprovedFilter = approvedFilter,
    targetCountryId = syncCountry.value,
    targetSortBy = sortBy,
    targetSortDir = sortDir
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        pageNo: String(targetPage),
        maxPerPage: String(targetLimit),
      });
      if (targetSearch) params.set("search", targetSearch);
      if (targetApprovedFilter !== "all") params.set("approvedFilter", targetApprovedFilter);
      if (targetCountryId && targetCountryId !== "all") params.set("countryId", targetCountryId);
      if (targetSortBy) {
        params.set("sortBy", targetSortBy);
        params.set("sortDir", targetSortDir);
      }

      const res = await apiFetch(`${API_BASE_URL}/api/client-api-data?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDataset(data.clientData || []);
          setTotal(data.total || 0);
        }
      }
    } catch (err) {
      console.error("Error loading client API list", err);
      toast.error("Failed to load survey data list");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, approvedFilter, syncCountry.value, sortBy, sortDir]);

  const loadSettingsAndMetadata = async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/client-api-data/form-data`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCountries(data.countries || []);
          setLanguages(data.languages || []);
          setClients(data.clients || []);
          if (data.settings) {
            setSettingsData({
              api_name: data.settings.apiName || "Zamplia",
              client_id: data.settings.clientId || "",
            });
          }
        }
      }
    } catch (err) {
      console.error("Error loading API settings metadata", err);
    }
  };

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  useEffect(() => {
    // Reset to page 1 whenever a filter/sort input changes. Computing this via a
    // key change or during render would be the "ideal" React pattern, but that's
    // a bigger restructure than this lint cleanup pass is scoped for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [debouncedSearch, approvedFilter, syncCountry.value, sortBy, sortDir]);

  useEffect(() => {
    // Standard fetch-on-mount/param-change pattern: this function's own
    // setState calls are flagged by this rule as if the effect itself sets
    // state, but fetching/updating in response to changed params is exactly
    // React's documented "synchronize with an external system" use case, not
    // the render-derived-value anti-pattern this rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData(page, limit, debouncedSearch, approvedFilter, syncCountry.value, sortBy, sortDir);
  }, [page, limit, debouncedSearch, approvedFilter, syncCountry.value, sortBy, sortDir, loadData]);

  useEffect(() => {
    // Standard fetch-on-mount pattern: this function's own setState calls are
    // flagged by this rule as if the effect itself sets state, but fetching
    // settings/metadata once on mount is exactly React's documented
    // "synchronize with an external system" use case, not the
    // render-derived-value anti-pattern this rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSettingsAndMetadata();
  }, []);

  // Column Sorting Handler
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  };

  const renderSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown size={12} className="text-zinc-300" />;
    return sortDir === "asc"
      ? <ArrowUp size={12} className="text-indigo-600" />
      : <ArrowDown size={12} className="text-indigo-600" />;
  };

  // Bulk Operations Handler
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allRowIds = dataset.map(item => item.id);
      setSelectedIds(allRowIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (checked: boolean, id: string) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleBulkOperation = async (type: number) => {
    if (selectedIds.length === 0) {
      toast.error("Please select at least one campaign.");
      return;
    }

    let verb = "execute this bulk operation";
    if (type === 1) verb = "delete these selected campaigns";
    else if (type === 2) verb = "approve these selected campaigns";
    else if (type === 3) verb = "disapprove these selected campaigns";

    if (!window.confirm(`Are you sure you want to ${verb}?`)) return;

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/client-api-data/bulk-operation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectIds: selectedIds,
          type: type
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || "Bulk operation completed");
          setSelectedIds([]);
          loadData(page, limit);
        } else {
          toast.error(data.message || "Bulk operation failed");
        }
      }
    } catch (err) {
      console.error("Error executing bulk operation", err);
      toast.error("Bulk operation connection failed");
    }
  };

  const handleDeleteSingle = async (projectId: string) => {
    if (!window.confirm("Are you sure you want to delete this campaign?")) return;

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/client-api-data/${projectId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success("Campaign deleted successfully");
          loadData(page, limit);
        }
      }
    } catch (err) {
      console.error("Error deleting campaign", err);
      toast.error("Failed to delete campaign");
    }
  };

  // Sync / Fetch Data trigger - this is the only place that talks to Zamplia, and it's a
  // Spring Boot endpoint doing the actual outbound call, never the browser.
  const handleFetchData = async (country: { value: string; label: string } = syncCountry) => {
    setFetchingApi(true);
    toast.info(
      country.value !== "all"
        ? `Connecting to Zamplia feed. Syncing ${country.label} surveys...`
        : "Connecting to Zamplia feed. Fetching surveys data..."
    );

    try {
      const url = country.value !== "all"
        ? `${API_BASE_URL}/api/client-api-data/sync?countryId=${country.value}`
        : `${API_BASE_URL}/api/client-api-data/sync`;
      const res = await apiFetch(url, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || "Surveys feed synchronized!");
          setPage(1);
          loadData(1, limit, debouncedSearch, approvedFilter, country.value);
        } else {
          toast.error(data.message || "Sync failed");
        }
      } else {
        toast.error("Zamplia feed returned error status");
      }
    } catch (err) {
      console.error("Error synchronizing Zamplia feed", err);
      toast.error("Sync connection timeout or server error");
    } finally {
      setFetchingApi(false);
    }
  };

  // CSV Export — respects the current search/status/country filters
  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (approvedFilter !== "all") params.set("approvedFilter", approvedFilter);
      if (syncCountry.value !== "all") params.set("countryId", syncCountry.value);

      const res = await apiFetch(`${API_BASE_URL}/api/client-api-data/export?${params.toString()}`);

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `client_api_data_export_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success("Exported campaigns to CSV");
      } else {
        toast.error("Export failed");
      }
    } catch (err) {
      console.error("Error exporting client API data", err);
      toast.error("Connection failed while exporting CSV");
    } finally {
      setExporting(false);
    }
  };

  // CSV Import — upserts campaigns by surveyId
  const handleImportCsv = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const res = await apiFetch(`${API_BASE_URL}/api/client-api-data/import`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          `Imported: ${data.created} created, ${data.updated} updated${data.skipped ? `, ${data.skipped} skipped` : ""}`
        );
        (data.errors || []).slice(0, 5).forEach((e: string) => toast.warning(e));
        setImportModalOpen(false);
        setImportFile(null);
        setPage(1);
        loadData(1, limit, debouncedSearch, approvedFilter, syncCountry.value);
      } else {
        toast.error(data.message || "Import failed");
      }
    } catch (err) {
      console.error("Error importing client API data", err);
      toast.error("Connection failed while importing CSV");
    } finally {
      setImporting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/client-api-data/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiName: settingsData.api_name, clientId: settingsData.client_id || null }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || "API Settings updated");
          setShowSettingsPanel(false);
        }
      }
    } catch (err) {
      console.error("Error saving API settings", err);
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  // Campaign Add/Edit handler
  const openAddCampaignModal = () => {
    setCampaignData({
      id: "",
      surveyId: "",
      project_name: "",
      req_complete: "",
      loi: "",
      ir: "",
      cpc: "",
      survey_link: "",
      language_id: "",
      country_id: "",
      approved: "0",
    });
    setQualifications([]);
    setShowQualsTab(false);
    setCampaignModalOpen(true);
  };

  const openEditCampaignModal = async (proj: ClientApiDataItem) => {
    setCampaignData({
      id: proj.id,
      surveyId: proj.surveyId || "",
      project_name: proj.projectName || "",
      req_complete: String(proj.reqComplete || ""),
      loi: String(proj.loi || ""),
      ir: String(proj.ir || ""),
      cpc: String(proj.cpc || ""),
      survey_link: proj.surveyLink || "",
      language_id: proj.languageId || "",
      country_id: proj.countryId || "",
      approved: String(proj.approved ?? "0"),
    });

    setQualifications([]);
    setShowQualsTab(false);
    setCampaignModalOpen(true);

    // Fetch Zamplia qualifications if surveyId exists
    if (proj.surveyId) {
      setLoadingQuals(true);
      try {
        const params = new URLSearchParams({ surveyId: proj.surveyId });
        if (proj.languageId) params.set("languageId", proj.languageId);

        const res = await apiFetch(`${API_BASE_URL}/api/client-api-data/qualifications?${params.toString()}`);

        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setQualifications(json.qualifications || []);
          }
        }
      } catch (err) {
        console.error("Error loading qualifications", err);
      } finally {
        setLoadingQuals(false);
      }
    }
  };

  const openQualificationsView = async (project: ClientApiDataItem) => {
    setQualsViewProject(project);
    setQualsViewList([]);
    setQualsViewOpen(true);

    if (!project.surveyId) return;

    setQualsViewLoading(true);
    try {
      const params = new URLSearchParams({ surveyId: project.surveyId });
      if (project.languageId) params.set("languageId", project.languageId);

      const res = await apiFetch(`${API_BASE_URL}/api/client-api-data/qualifications?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setQualsViewList(json.qualifications || []);
        }
      }
    } catch (err) {
      console.error("Error loading qualifications", err);
      toast.error("Failed to load survey qualifications");
    } finally {
      setQualsViewLoading(false);
    }
  };

  const handleImportQualifications = async () => {
    if (!campaignData.id || !campaignData.surveyId) return;

    setImportingQuals(true);
    toast.info("Importing profiling qualification rules to local database...");

    try {
      const params = new URLSearchParams({ surveyId: campaignData.surveyId });
      if (campaignData.language_id) params.set("languageId", campaignData.language_id);

      const res = await apiFetch(`${API_BASE_URL}/api/client-api-data/${campaignData.id}/import-qualifications?${params.toString()}`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || "Screening questions imported successfully!");
        } else {
          toast.error(data.message || "Failed to import qualifications");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Connection failed while importing qualifications");
    } finally {
      setImportingQuals(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (qualifications.length === 0) {
      toast.error("No qualifications to copy.");
      return;
    }

    const formatted = qualifications.map((q) => ({
      question: q.questionText,
      answers: q.options
        .filter((opt: QualificationOption) => opt.isCorrect)
        .map((opt: QualificationOption) => opt.answerText)
    }));

    navigator.clipboard.writeText(JSON.stringify(formatted, null, 2));

    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleSaveCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!campaignData.surveyId || !campaignData.project_name ||
        !campaignData.language_id || !campaignData.country_id || !campaignData.cpc) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSavingCampaign(true);
    try {
      const payload = {
        surveyId: campaignData.surveyId,
        projectName: campaignData.project_name,
        reqComplete: campaignData.req_complete ? parseInt(campaignData.req_complete) : 0,
        loi: campaignData.loi ? parseInt(campaignData.loi) : 0,
        ir: campaignData.ir ? parseInt(campaignData.ir) : 0,
        cpc: campaignData.cpc ? parseFloat(campaignData.cpc) : 0,
        surveyLink: campaignData.survey_link,
        languageId: campaignData.language_id,
        countryId: campaignData.country_id,
        approved: parseInt(campaignData.approved) || 0,
      };

      const isUpdate = Boolean(campaignData.id);
      const res = await apiFetch(
        isUpdate ? `${API_BASE_URL}/api/client-api-data/${campaignData.id}` : `${API_BASE_URL}/api/client-api-data`,
        {
          method: isUpdate ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || "Campaign details successfully stored");
          setCampaignModalOpen(false);
          loadData(page, limit);
        } else {
          toast.error(data.message || "Failed to save campaign");
        }
      }
    } catch (err) {
      console.error("Error saving campaign", err);
      toast.error("Connection failed while saving campaign");
    } finally {
      setSavingCampaign(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Band */}
      <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
            <FileCode className="h-6 w-6 text-zinc-500" />
            Client API Data
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Synchronize external surveys feeds, approve specific campaigns for routing, and config links.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {permission.create && (
            <Button
              onClick={openAddCampaignModal}
              size="sm"
              className="flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={15} />
              <span>Add Campaign</span>
            </Button>
          )}

          {permission.create && (
            <Combobox
              items={[
                { value: "all", label: "All Countries" },
                ...countries.map((c: Country) => ({ value: String(c.id), label: c.name })),
              ]}
              value={syncCountry}
              onValueChange={(value) => {
                if (!value) return;
                const selected = value as { value: string; label: string };
                setSyncCountry(selected);
                handleFetchData(selected);
              }}
            >
              <ComboboxInput placeholder="Search country..." className="h-9 w-48" />
              <ComboboxContent>
                <ComboboxEmpty>No country found.</ComboboxEmpty>
                <ComboboxList>
                  {(item: { value: string; label: string }) => (
                    <ComboboxItem key={item.value} value={item}>
                      {item.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          )}

          {permission.create && (
            <Button
              onClick={() => handleFetchData()}
              disabled={fetchingApi}
              size="sm"
              className="flex items-center gap-1.5 shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {fetchingApi ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <CloudLightning size={15} />
              )}
              <span>Sync Surveys Feed</span>
            </Button>
          )}

          {permission.update && (
            <Button
              onClick={() => setShowSettingsPanel(!showSettingsPanel)}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 border-zinc-200 text-zinc-600 shadow-sm"
            >
              <Settings size={14} />
              <span>API Settings</span>
            </Button>
          )}

          {permission.create && (
            <Button
              onClick={() => setImportModalOpen(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 border-zinc-200 text-zinc-600 shadow-sm"
            >
              <Upload size={14} />
              <span>Import CSV</span>
            </Button>
          )}

          {permission.read && (
            <Button
              onClick={handleExportCsv}
              disabled={exporting}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 border-zinc-200 text-zinc-600 shadow-sm"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>Export CSV</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Settings Panel Drawer */}
      {showSettingsPanel && permission.update && (
        <Card className="border-indigo-100 shadow-sm bg-indigo-50/20 dark:bg-zinc-950 animate-in slide-in-from-top duration-250">
          <CardHeader className="py-3 border-b border-indigo-50 dark:border-zinc-800">
            <CardTitle className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <KeyRound size={15} />
              API Connection Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 pb-4">
            <form onSubmit={handleSaveSettings} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-zinc-600 dark:text-zinc-400">API Provider Name</Label>
                <Input
                  value={settingsData.api_name}
                  onChange={(e) => setSettingsData({ ...settingsData, api_name: e.target.value })}
                  placeholder="e.g. Zamplia"
                  required
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Map to Client</Label>
                <NativeSelect
                  value={settingsData.client_id}
                  onChange={(e) => setSettingsData({ ...settingsData, client_id: e.target.value })}
                  required
                  className="h-9"
                >
                  <option value="">Select Client</option>
                  {clients.map((c: Client) => (
                    <option key={c.id} value={c.id}>{c.clientName}</option>
                  ))}
                </NativeSelect>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={savingSettings}
                  size="sm"
                  className="h-9 shadow-sm"
                >
                  {savingSettings && <Loader2 size={14} className="animate-spin" />}
                  <span>Save Configuration</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowSettingsPanel(false)}
                  size="sm"
                  className="h-9"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 3. Search & Bulk Operations Band */}
      <Card className="border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
        <CardContent className="pt-4 pb-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search imported surveys by name or survey ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <NativeSelect
            value={approvedFilter}
            onChange={(e) => setApprovedFilter(e.target.value)}
            className="h-9 w-full md:w-44"
          >
            <option value="all">All Statuses</option>
            <option value="1">Approved</option>
            <option value="0">Disapproved</option>
          </NativeSelect>

          {permission.update && (
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-zinc-400 font-semibold mr-1">
                Selected ({selectedIds.length})
              </span>
              <Button
                onClick={() => handleBulkOperation(2)}
                disabled={selectedIds.length === 0}
                variant="outline"
                size="sm"
                className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 shadow-sm border-zinc-200"
              >
                <CheckCircle size={13} />
                <span>Approve</span>
              </Button>
              <Button
                onClick={() => handleBulkOperation(3)}
                disabled={selectedIds.length === 0}
                variant="outline"
                size="sm"
                className="flex items-center gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-8 shadow-sm border-zinc-200"
              >
                <XCircle size={13} />
                <span>Disapprove</span>
              </Button>
              <Button
                onClick={() => handleBulkOperation(1)}
                disabled={selectedIds.length === 0}
                variant="outline"
                size="sm"
                className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 h-8 shadow-sm border-zinc-200"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Table / Results Card */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden bg-white dark:bg-zinc-900">
        <CardContent className="p-0">
          {loading || fetchingApi ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
              <span className="text-sm font-medium text-zinc-500">
                {fetchingApi ? "Synchronizing surveys feed from Zamplia..." : "Querying feed cache..."}
              </span>
            </div>
          ) : dataset.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
              <span className="text-sm font-bold text-zinc-600">
                {debouncedSearch || approvedFilter !== "all" ? "No Matching Surveys Found" : "No Imported Surveys Found"}
              </span>
              <span className="text-xs text-zinc-400">
                {debouncedSearch || approvedFilter !== "all"
                  ? "Try clearing the search or status filter."
                  : "Trigger sync to fetch the latest allocated campaigns."}
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border-collapse text-xs">
                <TableHeader className="bg-zinc-50/70 dark:bg-zinc-900">
                  <TableRow className="border-b border-zinc-200">
                    <TableHead className="font-semibold text-zinc-600 h-10 w-12 text-center">SN</TableHead>
                    {permission.update && (
                      <TableHead className="font-semibold text-zinc-600 h-10 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={dataset.length > 0 && selectedIds.length === dataset.length}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </TableHead>
                    )}
                    <TableHead
                      onClick={() => handleSort("surveyId")}
                      className="font-semibold text-zinc-600 h-10 cursor-pointer select-none hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      <div className="flex items-center gap-1">
                        <span>Survey ID</span>
                        {renderSortIcon("surveyId")}
                      </div>
                    </TableHead>
                    <TableHead
                      onClick={() => handleSort("projectName")}
                      className="font-semibold text-zinc-600 h-10 cursor-pointer select-none hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      <div className="flex items-center gap-1">
                        <span>Project Name</span>
                        {renderSortIcon("projectName")}
                      </div>
                    </TableHead>
                    <TableHead
                      onClick={() => handleSort("reqComplete")}
                      className="font-semibold text-zinc-600 h-10 text-center cursor-pointer select-none hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Req. Completes</span>
                        {renderSortIcon("reqComplete")}
                      </div>
                    </TableHead>
                    <TableHead
                      onClick={() => handleSort("loi")}
                      className="font-semibold text-zinc-600 h-10 text-center cursor-pointer select-none hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>LOI</span>
                        {renderSortIcon("loi")}
                      </div>
                    </TableHead>
                    <TableHead
                      onClick={() => handleSort("ir")}
                      className="font-semibold text-zinc-600 h-10 text-center cursor-pointer select-none hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>IR %</span>
                        {renderSortIcon("ir")}
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">Country</TableHead>
                    <TableHead
                      onClick={() => handleSort("cpc")}
                      className="font-semibold text-zinc-600 h-10 text-center cursor-pointer select-none hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>CPI</span>
                        {renderSortIcon("cpc")}
                      </div>
                    </TableHead>
                    <TableHead
                      onClick={() => handleSort("approved")}
                      className="font-semibold text-zinc-600 h-10 text-center cursor-pointer select-none hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Approved Status</span>
                        {renderSortIcon("approved")}
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 w-24 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataset.map((project, idx) => {
                    const rowNum = (page - 1) * limit + idx + 1;
                    const isSelected = selectedIds.includes(project.id);
                    const isTop = project.topSurvey === 1;

                    return (
                      <TableRow key={project.id} className="border-b border-zinc-150 hover:bg-zinc-50/50 transition-colors">
                        <TableCell className="text-center font-medium text-zinc-400 py-3">{rowNum}</TableCell>
                        {permission.update && (
                          <TableCell className="text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleSelectRow(e.target.checked, project.id)}
                              className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                          {project.surveyId}
                        </TableCell>
                        <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">
                          <div className="flex items-center gap-1">
                            <span>{project.projectName}</span>
                            {isTop && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold uppercase tracking-wider scale-90 shrink-0">
                                Top Pick
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-zinc-600">{project.reqComplete}</TableCell>
                        <TableCell className="text-center font-mono text-zinc-600">{project.loi}m</TableCell>
                        <TableCell className="text-center font-mono text-zinc-600">{project.ir}%</TableCell>
                        <TableCell className="text-zinc-600 font-medium">{project.countryName || "NA"}</TableCell>
                        <TableCell className="text-center font-mono font-bold text-indigo-600">{project.cpc}</TableCell>

                        <TableCell className="text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            project.approved === 1
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400"
                          }`}>
                            {project.approved === 1 ? "Approved" : "Disapproved"}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {permission.read && (
                              <Button
                                onClick={() => openQualificationsView(project)}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                title="View qualifications"
                              >
                                <ListChecks size={13} />
                              </Button>
                            )}

                            {permission.update && (
                              <Button
                                onClick={() => openEditCampaignModal(project)}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                title="Edit campaign details"
                              >
                                <Edit2 size={13} />
                              </Button>
                            )}

                            {permission.delete && (
                              <Button
                                onClick={() => handleDeleteSingle(project.id)}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete project"
                              >
                                <Trash2 size={13} />
                              </Button>
                            )}
                          </div>
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

      {/* 5. Pagination / Limit Controls */}
      {!loading && dataset.length > 0 && (
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
              <option value={15}>15</option>
              <option value={30}>30</option>
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

      {/* 6. Campaign Add/Edit Dialog Modal */}
      <Dialog open={campaignModalOpen} onOpenChange={setCampaignModalOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleSaveCampaignSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5 border-b pb-2">
                <Landmark className="h-5 w-5 text-zinc-500" />
                {campaignData.id ? "Edit API Campaign" : "Add API Campaign"}
              </DialogTitle>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {/* Tabs selector */}
              {campaignData.id && campaignData.surveyId && (
                <div className="flex border-b border-zinc-200">
                  <button
                    type="button"
                    onClick={() => setShowQualsTab(false)}
                    className={`px-4 py-2 text-xs font-bold border-b-2 -mb-[2px] transition-colors ${
                      !showQualsTab
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-zinc-400 hover:text-zinc-600"
                    }`}
                  >
                    Campaign Info
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQualsTab(true)}
                    className={`px-4 py-2 text-xs font-bold border-b-2 -mb-[2px] transition-colors flex items-center gap-1.5 ${
                      showQualsTab
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-zinc-400 hover:text-zinc-600"
                    }`}
                  >
                    <Sparkles size={12} className="text-amber-500" />
                    <span>Zamplia Qualifications ({qualifications.length})</span>
                  </button>
                </div>
              )}

              {!showQualsTab ? (
                // 6a. Main Campaign Information Form
                <div className="space-y-4 animate-in fade-in-50 duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="campaignSurveyId" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                        Survey ID <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="campaignSurveyId"
                        placeholder="Zamplia Survey ID"
                        value={campaignData.surveyId}
                        onChange={(e) => setCampaignData({ ...campaignData, surveyId: e.target.value })}
                        required
                        disabled={Boolean(campaignData.id)}
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="campaignName" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                        Campaign Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="campaignName"
                        placeholder="Campaign Title"
                        value={campaignData.project_name}
                        onChange={(e) => setCampaignData({ ...campaignData, project_name: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="campaignCompletes" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                        Req. Completes
                      </Label>
                      <Input
                        id="campaignCompletes"
                        type="number"
                        value={campaignData.req_complete}
                        onChange={(e) => setCampaignData({ ...campaignData, req_complete: e.target.value })}
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="campaignLoi" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                        LOI (Minutes)
                      </Label>
                      <Input
                        id="campaignLoi"
                        type="number"
                        value={campaignData.loi}
                        onChange={(e) => setCampaignData({ ...campaignData, loi: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="campaignIr" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                        IR %
                      </Label>
                      <Input
                        id="campaignIr"
                        type="number"
                        value={campaignData.ir}
                        onChange={(e) => setCampaignData({ ...campaignData, ir: e.target.value })}
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="campaignCpc" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                        CPI <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="campaignCpc"
                        type="number"
                        step="0.01"
                        placeholder="1.50"
                        value={campaignData.cpc}
                        onChange={(e) => setCampaignData({ ...campaignData, cpc: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="campaignLink" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                      Survey Link Template
                    </Label>
                    <Input
                      id="campaignLink"
                      placeholder="https://surveysupply.zamplia.com/...&IpAddress={{ip}}&TransactionId={{txn}}"
                      value={campaignData.survey_link}
                      onChange={(e) => setCampaignData({ ...campaignData, survey_link: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="campaignLanguage" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                        Language <span className="text-red-500">*</span>
                      </Label>
                      <NativeSelect
                        id="campaignLanguage"
                        value={campaignData.language_id}
                        onChange={(e) => setCampaignData({ ...campaignData, language_id: e.target.value })}
                        required
                      >
                        <option value="">Select Language</option>
                        {languages.map((l: Language) => (
                          <option key={l.id} value={l.id}>{l.languageName}</option>
                        ))}
                      </NativeSelect>
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="campaignCountry" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                        Country <span className="text-red-500">*</span>
                      </Label>
                      <NativeSelect
                        id="campaignCountry"
                        value={campaignData.country_id}
                        onChange={(e) => setCampaignData({ ...campaignData, country_id: e.target.value })}
                        required
                      >
                        <option value="">Select Country</option>
                        {countries.map((c: Country) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </NativeSelect>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="campaignApproved" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                      Approval Status <span className="text-red-500">*</span>
                    </Label>
                    <NativeSelect
                      id="campaignApproved"
                      value={campaignData.approved}
                      onChange={(e) => setCampaignData({ ...campaignData, approved: e.target.value })}
                      required
                    >
                      <option value="0">Disapproved</option>
                      <option value="1">Approved</option>
                    </NativeSelect>
                  </div>
                </div>
              ) : (
                // 6b. Dynamic Qualifications Tab View
                <div className="space-y-4 animate-in fade-in-50 duration-200">
                  <div className="flex justify-between items-center bg-indigo-50/50 dark:bg-zinc-950 p-3 rounded-lg border border-indigo-100">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-indigo-950 dark:text-indigo-300">Profiling & Copying Actions</span>
                      <p className="text-[10px] text-indigo-700/80 dark:text-zinc-400">
                        Copy to clipboard for AI query, or import directly into your routing database.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={handleCopyToClipboard}
                        disabled={qualifications.length === 0}
                        variant="outline"
                        size="sm"
                        className={`flex items-center gap-1.5 border-zinc-200 text-xs shadow-sm bg-white transition-all duration-200 ${
                          copied ? "text-emerald-600 border-emerald-300 bg-emerald-50/20" : "text-zinc-600"
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check size={13} className="text-emerald-600" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <ClipboardCopy size={13} />
                            <span>Copy for AI</span>
                          </>
                        )}
                      </Button>

                      {permission.update && (
                        <Button
                          type="button"
                          disabled={importingQuals || qualifications.length === 0}
                          onClick={handleImportQualifications}
                          size="sm"
                          className="flex items-center gap-1.5 shadow-sm text-xs bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          {importingQuals ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <DownloadCloud size={13} />
                          )}
                          <span>Import Local Rules</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {loadingQuals ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-2">
                      <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                      <span className="text-xs text-zinc-500">Retrieving pre-screening qualification filters...</span>
                    </div>
                  ) : qualifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center space-y-1.5">
                      <HelpCircle className="h-8 w-8 text-zinc-300" />
                      <span className="text-xs font-bold text-zinc-600">No screening qualifications registered</span>
                      <span className="text-[10px] text-zinc-400">This campaign does not enforce demographic screening rules.</span>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {qualifications.map((qual, idx) => (
                        <QualificationCard key={idx} qual={qual} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="border-t pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCampaignModalOpen(false)}
                disabled={savingCampaign}
                size="sm"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingCampaign} size="sm" className="flex items-center gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700">
                {savingCampaign && <Loader2 size={14} className="animate-spin" />}
                <span>{campaignData.id ? "Save Changes" : "Create Campaign"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={importModalOpen} onOpenChange={(open) => { setImportModalOpen(open); if (!open) setImportFile(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Upload size={16} />
              Import Campaigns from CSV
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-xs text-zinc-500">
              Rows matching an existing <span className="font-mono">surveyId</span> are updated;
              unmatched rows create new campaigns (require <span className="font-mono">project_name</span>,{" "}
              <span className="font-mono">country_id</span> and <span className="font-mono">language_id</span>
              {" "}as UUIDs). Use the exported CSV as a template.
            </p>
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="h-9"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportModalOpen(false)}
              disabled={importing}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleImportCsv}
              disabled={importing || !importFile}
              size="sm"
              className="flex items-center gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {importing && <Loader2 size={14} className="animate-spin" />}
              <span>Import</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Standalone Qualifications Viewer Popup - opened from the Actions column */}
      <Dialog open={qualsViewOpen} onOpenChange={setQualsViewOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5 border-b pb-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Screening Qualifications{qualsViewProject ? ` — ${qualsViewProject.projectName}` : ""}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-2">
            {qualsViewLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                <span className="text-xs text-zinc-500">Retrieving pre-screening qualification filters...</span>
              </div>
            ) : qualsViewList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-1.5">
                <HelpCircle className="h-8 w-8 text-zinc-300" />
                <span className="text-xs font-bold text-zinc-600">No screening qualifications registered</span>
                <span className="text-[10px] text-zinc-400">This campaign does not enforce demographic screening rules.</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {qualsViewList.map((qual, idx) => (
                  <QualificationCard key={idx} qual={qual} />
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-3">
            <Button type="button" variant="outline" onClick={() => setQualsViewOpen(false)} size="sm">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
