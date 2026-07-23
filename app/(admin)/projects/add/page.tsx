"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, Save,
  Download, FileSpreadsheet, UserCheck,
  Monitor, Smartphone, Tablet
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { NativeSelect } from "@/components/ui/native-select";
import { API_BASE_URL, apiFetch } from "@/lib/api";

// Generic {value,label} option used for simple dropdowns (study types, statuses, devices, checklist items)
interface OptionItem {
  value: string;
  label: string;
}

interface CountryOption {
  id: string;
  name: string;
}

interface LanguageOption {
  id: string;
  languageName: string;
}

interface CurrencyOption {
  id: string;
  currencyName: string;
}

interface ClientOption {
  id: string;
  clientName: string;
}

interface UserOption {
  id: string;
  userName: string;
}

interface ProjectOption {
  id: string | number;
  projectName: string;
}

// Shape of an existing project's current values, returned when editing (project_id present)
interface ProjectData {
  id: string;
  projectName?: string;
  countryName?: string;
  parentProjectId?: string;
  studyType: string | number;
  countryId?: string;
  languageId?: string;
  currencyId?: string;
  cpc: string | number;
  vendorCpi?: string | number;
  surveyLink?: string;
  surveyTestLink?: string;
  reqComplete: string | number;
  ir: string | number;
  loi: string | number;
  status: string | number;
  notes?: string;
  projectBrief?: string;
  clientId?: string;
  projectManagerId?: string;
  salesManagerId?: string;
}

interface Statistics {
  complete: number;
  disqualify: number;
  quotaFull: number;
  securityTerm: number;
  hits: number;
  redirect: number;
  epc: number;
  abendond: string;
  completeSurvey: number;
  ir: string;
  loi: number;
}

// Dropdown/reference data, plus (in edit mode) the project's own current values
interface FormOptions {
  securityChecklist: OptionItem[];
  studyTypes: OptionItem[];
  statusOptions: OptionItem[];
  devices: OptionItem[];
  languages: LanguageOption[];
  countries: CountryOption[];
  clients: ClientOption[];
  currency: CurrencyOption[];
  vendor: OptionItem[];
  projects: ProjectOption[];
  projectManagers: UserOption[];
  salesManagers: UserOption[];
  projectData?: ProjectData;
}

// Response shape of GET /api/projects/form-data
interface ProjectFormDataResponse extends FormOptions {
  success: boolean;
  allDevicesIds?: string[];
  allChecklistIds?: string[];
  statistics: Statistics;
}

export default function AddEditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const idParam = params?.id;
  const project_id: string | null = Array.isArray(idParam) ? idParam[0] : (idParam || null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form dropdown options
  const [options, setOptions] = useState<FormOptions>({
    securityChecklist: [],
    studyTypes: [],
    statusOptions: [],
    devices: [],
    languages: [],
    countries: [],
    clients: [],
    currency: [],
    vendor: [],
    projects: [],
    projectManagers: [],
    salesManagers: [],
  });

  // Statistics for editing mode
  const [statistics, setStatistics] = useState<Statistics>({
    complete: 0,
    disqualify: 0,
    quotaFull: 0,
    securityTerm: 0,
    hits: 0,
    redirect: 0,
    epc: 0,
    abendond: "0.00",
    completeSurvey: 0,
    ir: "0.00",
    loi: 15
  });

  // Form Fields State
  const [formData, setFormData] = useState({
    id: "",
    project_name: "",
    parent_project_id: "",
    study_type: "",
    country_id: "",
    language_id: "",
    currency_id: "",
    cpc: "",
    vendor_cpi: "",
    survey_link: "",
    survey_test_link: "",
    req_complete: "",
    ir: "",
    loi: "",
    status: "1",
    notes: "",
    project_brief: "",
    client_id: "",
    project_manager_id: "",
    sales_manager_id: "",
  });

  const [allDevicesIds, setAllDevicesIds] = useState<string[]>([]);
  const [allChecklistIds, setAllChecklistIds] = useState<string[]>([]);

  // Autocomplete parent project states
  const [searchProjectText, setSearchProjectText] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch initial edit options and details
  const loadProjectInitData = useCallback(async () => {
    setLoading(true);
    try {
      const url = project_id
        ? `${API_BASE_URL}/api/projects/form-data?id=${project_id}`
        : `${API_BASE_URL}/api/projects/form-data`;
      const res = await apiFetch(url);
      if (res.ok) {
        const data: ProjectFormDataResponse = await res.json();
        if (data.success) {
          setOptions(data);

          if (data.projectData) {
            const p = data.projectData;
            setFormData({
              id: p.id,
              project_name: p.projectName || "",
              parent_project_id: p.parentProjectId || "",
              study_type: String(p.studyType),
              country_id: p.countryId || "",
              language_id: p.languageId || "",
              currency_id: p.currencyId || "",
              cpc: String(p.cpc),
              vendor_cpi: String(p.vendorCpi || ""),
              survey_link: p.surveyLink || "",
              survey_test_link: p.surveyTestLink || "",
              req_complete: String(p.reqComplete),
              ir: String(p.ir),
              loi: String(p.loi),
              status: String(p.status),
              notes: p.notes || "",
              project_brief: p.projectBrief || "",
              client_id: p.clientId || "",
              project_manager_id: p.projectManagerId || "",
              sales_manager_id: p.salesManagerId || "",
            });

            setAllDevicesIds(data.allDevicesIds || []);
            setAllChecklistIds(data.allChecklistIds || []);
            setStatistics(data.statistics);

            // Set parent project search text
            const parent = data.projects.find((proj) => String(proj.id) === String(p.parentProjectId));
            if (parent) {
              setSearchProjectText(parent.projectName);
            }
          } else {
            setFormData(prev => ({
              ...prev,
              id: "",
            }));
            setSearchProjectText("Self Project");
          }
        }
      }
    } catch (err) {
      console.error("Error loading project configuration", err);
      toast.error("Failed to initialize project configuration");
    } finally {
      setLoading(false);
    }
  }, [project_id]);

  useEffect(() => {
    // Standard fetch-on-mount/param-change pattern: loadProjectInitData's
    // own setState calls are flagged by this rule as if the effect itself
    // sets state, but fetching data in response to a changed project_id is
    // exactly React's documented "synchronize with an external system" use
    // case, not the render-derived-value anti-pattern this rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProjectInitData();
  }, [project_id, loadProjectInitData]);

  // Handle device toggling
  const handleDeviceToggle = (val: string) => {
    if (allDevicesIds.includes(val)) {
      setAllDevicesIds(allDevicesIds.filter(id => id !== val));
    } else {
      setAllDevicesIds([...allDevicesIds, val]);
    }
  };

  // Handle checklist toggling
  const handleChecklistToggle = (val: string) => {
    if (allChecklistIds.includes(val)) {
      setAllChecklistIds(allChecklistIds.filter(id => id !== val));
    } else {
      setAllChecklistIds([...allChecklistIds, val]);
    }
  };

  // Filter projects for autocomplete
  const filteredProjects = () => {
    return options.projects.filter((p) =>
      p.projectName.toLowerCase().includes(searchProjectText.toLowerCase())
    );
  };

  const selectParentProject = (project: ProjectOption) => {
    setFormData(prev => ({
      ...prev,
      parent_project_id: String(project.id),
    }));
    setSearchProjectText(project.projectName);
    setShowDropdown(false);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.project_name || !formData.study_type || !formData.country_id || 
        !formData.language_id || !formData.currency_id || !formData.cpc || 
        !formData.survey_link || !formData.req_complete || !formData.ir || !formData.loi) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (allDevicesIds.length === 0) {
      toast.error("Please support at least one device.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        projectName: formData.project_name,
        parentProjectId: formData.parent_project_id || null,
        studyType: parseInt(formData.study_type) || null,
        countryId: formData.country_id || null,
        languageId: formData.language_id || null,
        currencyId: formData.currency_id || null,
        cpc: parseFloat(formData.cpc) || 0,
        vendorCpi: parseFloat(formData.vendor_cpi) || 0,
        surveyLink: formData.survey_link,
        surveyTestLink: formData.survey_test_link,
        reqComplete: parseInt(formData.req_complete) || 0,
        loi: parseInt(formData.loi) || 0,
        ir: parseInt(formData.ir) || 0,
        clientId: formData.client_id || null,
        projectManagerId: formData.project_manager_id || null,
        salesManagerId: formData.sales_manager_id || null,
        notes: formData.notes,
        projectBrief: formData.project_brief,
        status: parseInt(formData.status) || 1,
        allDevicesIds,
        allChecklistIds,
      };

      const isUpdate = Boolean(formData.id);
      const res = await apiFetch(
        isUpdate ? `${API_BASE_URL}/api/projects/${formData.id}` : `${API_BASE_URL}/api/projects`,
        {
          method: isUpdate ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || "Project saved successfully");
        } else {
          toast.error(data.message || "Failed to save project");
        }
      } else {
        toast.error("HTTP error saving project");
      }
    } catch (err) {
      console.error("Error saving project", err);
      toast.error("Error connecting to server to save project");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-zinc-600" />
        <span className="text-sm font-medium text-zinc-500">Loading Configuration details...</span>
      </div>
    );
  }

  const isEditMode = Boolean(project_id);

  return (
    <div className="space-y-6">
      {/* 1. Sub-Header Links for Editing Mode */}
      {isEditMode && options.projectData && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-r from-cyan-500/80 to-indigo-500/80 p-4 rounded-xl shadow-md text-white gap-4">
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight">{options.projectData.projectName}</span>
            <span className="text-xs text-cyan-50 opacity-90">Localized: {options.projectData.countryName}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <Button
              onClick={() => window.open(`/projects/download/${project_id}`, "_blank")}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 flex items-center gap-1"
            >
              <Download size={13} />
              <span>Download Logs</span>
            </Button>
            <Button
              onClick={() => router.push(`/supliers/${project_id}`)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 flex items-center gap-1"
            >
              <UserCheck size={13} />
              <span>Suppliers</span>
            </Button>
            <Button
              onClick={() => router.push(`/re-concile/${project_id}`)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 flex items-center gap-1"
            >
              <FileSpreadsheet size={13} />
              <span>Reconcile Logs</span>
            </Button>
          </div>
        </div>
      )}

      {/* 2. Statistics Grid (Edit Mode only) */}
      {isEditMode && (
        <div className="grid grid-cols-2 md:grid-cols-5 xl:grid-cols-10 gap-3">
          {/* Quality Checklist */}
          <Card className="col-span-2 md:col-span-2 border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
            <CardContent className="p-4">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-2">Quality Control</span>
              <div className="space-y-1.5">
                {options.securityChecklist.map((c: OptionItem) => (
                  <div key={c.value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`chk-${c.value}`}
                      checked={allChecklistIds.includes(c.value)}
                      onChange={() => handleChecklistToggle(c.value)}
                      className="rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <label htmlFor={`chk-${c.value}`} className="text-xs font-semibold text-amber-600 dark:text-amber-500 cursor-pointer">
                      {c.label}
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {[
            { label: "Hits", val: statistics.hits },
            { label: "Redirects", val: statistics.redirect },
            { label: "Completed", val: statistics.complete },
            { label: "Disqualified", val: statistics.disqualify },
            { label: "Quota Full", val: statistics.quotaFull },
            { label: "Security", val: statistics.securityTerm },
            { label: "EPC", val: `$${statistics.epc.toFixed(2)}` },
            { label: "IR", val: `${statistics.ir}%` },
            { label: "Avg LOI", val: statistics.loi }
          ].map((stat, i) => (
            <Card key={i} className="border-zinc-200 shadow-sm text-center bg-white dark:bg-zinc-900 flex flex-col items-center justify-center p-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{stat.label}</span>
              <span className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100 mt-1">{stat.val}</span>
            </Card>
          ))}
        </div>
      )}

      {/* 3. Title band */}
      <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
        <div>
          <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
            {isEditMode ? "Edit Project Configurations" : "Create New Project"}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure respondent router properties, quotas, and cpi parameters.
          </p>
        </div>
        <Button
          onClick={() => router.push("/projects")}
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 border-zinc-200 text-zinc-600 shadow-sm"
        >
          <ArrowLeft size={14} />
          <span>Back to Projects</span>
        </Button>
      </div>

      {/* 4. Form inputs */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Attributes */}
        <Card className="border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
          <CardHeader className="py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900">
            <CardTitle className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              Core Attributes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Autocomplete parent selection */}
              <div className="space-y-1.5 relative">
                <Label className="text-xs font-semibold text-zinc-500">
                  Self Parent <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Type to search projects..."
                  value={searchProjectText}
                  onChange={(e) => {
                    setSearchProjectText(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="h-10"
                />
                
                {showDropdown && (
                  <ul className="absolute z-10 w-full bg-white dark:bg-zinc-950 border border-zinc-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1 text-xs">
                    {filteredProjects().map((p: ProjectOption) => (
                      <li
                        key={p.id}
                        onClick={() => selectParentProject(p)}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer font-medium text-zinc-700 dark:text-zinc-300 border-b border-zinc-50 dark:border-zinc-900"
                      >
                        {p.projectName} (ID: {p.id})
                      </li>
                    ))}
                    {filteredProjects().length === 0 && (
                      <li className="p-3 text-zinc-400 text-center font-medium">No projects match</li>
                    )}
                  </ul>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-500">
                  Project Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.project_name}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  placeholder="Project Name"
                  className="h-10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-500">
                  Study Type <span className="text-red-500">*</span>
                </Label>
                <NativeSelect
                  value={formData.study_type}
                  onChange={(e) => setFormData({ ...formData, study_type: e.target.value })}
                  className="h-10"
                  required
                >
                  <option value="">Select</option>
                  {options.studyTypes.map((t: OptionItem) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-500">
                  Countries <span className="text-red-500">*</span>
                </Label>
                <NativeSelect
                  value={formData.country_id}
                  onChange={(e) => setFormData({ ...formData, country_id: e.target.value })}
                  className="h-10"
                  required
                >
                  <option value="">Select</option>
                  {options.countries.map((c: CountryOption) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-500">
                  Languages <span className="text-red-500">*</span>
                </Label>
                <NativeSelect
                  value={formData.language_id}
                  onChange={(e) => setFormData({ ...formData, language_id: e.target.value })}
                  className="h-10"
                  required
                >
                  <option value="">Select</option>
                  {options.languages.map((l: LanguageOption) => (
                    <option key={l.id} value={l.id}>{l.languageName}</option>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-500">
                  Currency <span className="text-red-500">*</span>
                </Label>
                <NativeSelect
                  value={formData.currency_id}
                  onChange={(e) => setFormData({ ...formData, currency_id: e.target.value })}
                  className="h-10"
                  required
                >
                  <option value="">Select</option>
                  {options.currency.map((cur: CurrencyOption) => (
                    <option key={cur.id} value={cur.id}>{cur.currencyName}</option>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-500">
                  Client&apos;s Budget (CPI) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cpc}
                  onChange={(e) => setFormData({ ...formData, cpc: e.target.value })}
                  placeholder="CPI"
                  className="h-10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-500">
                  Vendor&apos;s Budget (CPI)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.vendor_cpi}
                  onChange={(e) => setFormData({ ...formData, vendor_cpi: e.target.value })}
                  placeholder="Vendor Budget"
                  className="h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-500">
                  Survey Link <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={formData.survey_link}
                  onChange={(e) => setFormData({ ...formData, survey_link: e.target.value })}
                  placeholder="Respondent complete redirects link"
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-500">
                  Survey Test Link
                </Label>
                <Textarea
                  value={formData.survey_test_link}
                  onChange={(e) => setFormData({ ...formData, survey_test_link: e.target.value })}
                  placeholder="Survey sandboxed validation link"
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expected Metrics */}
        <Card className="border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
          <CardHeader className="py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900">
            <CardTitle className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              Expected Metrics & Devices
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-500">
                  Req. Completes <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  value={formData.req_complete}
                  onChange={(e) => setFormData({ ...formData, req_complete: e.target.value })}
                  placeholder="Target completes"
                  className="h-10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-500">
                  Expected IR (%) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  value={formData.ir}
                  onChange={(e) => setFormData({ ...formData, ir: e.target.value })}
                  placeholder="Expected incidence rate"
                  className="h-10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-500">
                  Expected LOI (min) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  value={formData.loi}
                  onChange={(e) => setFormData({ ...formData, loi: e.target.value })}
                  placeholder="Expected length of interview"
                  className="h-10"
                  required
                />
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block">
                Supported Devices <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap items-center gap-4">
                {options.devices.map((dev: OptionItem) => {
                  const isChecked = allDevicesIds.includes(dev.value);
                  return (
                    <div 
                      key={dev.value}
                      onClick={() => handleDeviceToggle(dev.value)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer select-none transition-all ${
                        isChecked 
                          ? "bg-cyan-50 border-cyan-300 text-cyan-800 dark:bg-cyan-950/20 dark:border-cyan-900 dark:text-cyan-400"
                          : "bg-white border-zinc-200 text-zinc-500 dark:bg-zinc-950 dark:border-zinc-800"
                      }`}
                    >
                      {dev.value === "1" && <Monitor size={14} />}
                      {dev.value === "2" && <Smartphone size={14} />}
                      {dev.value === "3" && <Tablet size={14} />}
                      <span>{dev.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignments & Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* People Card */}
          <Card className="border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900">
              <CardTitle className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                People Assignments
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 pb-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-500">
                  Client buyer <span className="text-red-500">*</span>
                </Label>
                <NativeSelect
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="h-10"
                  required
                >
                  <option value="">Select Client</option>
                  {options.clients.map((cl: ClientOption) => (
                    <option key={cl.id} value={cl.id}>{cl.clientName}</option>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-500">
                  Project Manager <span className="text-red-500">*</span>
                </Label>
                <NativeSelect
                  value={formData.project_manager_id}
                  onChange={(e) => setFormData({ ...formData, project_manager_id: e.target.value })}
                  className="h-10"
                  required
                >
                  <option value="">Select PM</option>
                  {options.projectManagers.map((pm: UserOption) => (
                    <option key={pm.id} value={pm.id}>{pm.userName}</option>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-500">
                  Sales Manager <span className="text-red-500">*</span>
                </Label>
                <NativeSelect
                  value={formData.sales_manager_id}
                  onChange={(e) => setFormData({ ...formData, sales_manager_id: e.target.value })}
                  className="h-10"
                  required
                >
                  <option value="">Select SM</option>
                  {options.salesManagers.map((sm: UserOption) => (
                    <option key={sm.id} value={sm.id}>{sm.userName}</option>
                  ))}
                </NativeSelect>
              </div>
            </CardContent>
          </Card>

          {/* Metadata Card */}
          <Card className="border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900">
              <CardTitle className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Memorandum & Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 pb-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-500">Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Internal PM comments"
                    rows={4}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-500">Project Brief</Label>
                  <Textarea
                    value={formData.project_brief}
                    onChange={(e) => setFormData({ ...formData, project_brief: e.target.value })}
                    placeholder="Short summary details"
                    rows={4}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-500">
                  Current Status <span className="text-red-500">*</span>
                </Label>
                <NativeSelect
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="h-10"
                  required
                >
                  {options.statusOptions.map((opt: OptionItem) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </NativeSelect>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/projects")}
            disabled={submitting}
            size="lg"
            className="border-zinc-200"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} size="lg" className="flex items-center gap-2">
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>{isEditMode ? "Update Project" : "Store Project"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
