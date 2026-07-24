"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface ProjectViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
}

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
  id: string;
  projectName: string;
}

interface ProjectStatistics {
  hits: number;
  complete: number;
  disqualify: number;
  quotaFull: number;
  securityTerm: number;
  drop: number;
  epc: number;
  ir: number;
  loi: number;
  abendond: number;
}

interface ProjectDetail {
  id: string;
  projectName: string;
  parentProjectId: string | null;
  studyType: number | string;
  countryId: string;
  countryName?: string;
  languageId: string;
  currencyId: string;
  cpc: number | string;
  vendorCpi: number | string | null;
  startDateFormatted?: string;
  surveyLink: string;
  surveyTestLink: string;
  completeRedirectId?: string;
  disqualifyRedirectId?: string;
  terminateRedirectId?: string;
  quotaFullRedirectId?: string;
  reqComplete: number | string;
  ir: number | string;
  loi: number | string;
  status: number | string;
  notes: string;
  projectBrief: string;
  clientId: string;
  projectManagerId: string;
  salesManagerId: string;
}

interface ProjectFormData {
  success: boolean;
  projectData: ProjectDetail;
  statistics?: ProjectStatistics;
  projects: ProjectOption[];
  studyTypes: OptionItem[];
  countries: CountryOption[];
  languages: LanguageOption[];
  currency: CurrencyOption[];
  clients: ClientOption[];
  projectManagers: UserOption[];
  salesManagers: UserOption[];
  statusOptions: OptionItem[];
  securityChecklist: OptionItem[];
  allDevicesIds: string[];
  allChecklistIds: string[];
}

const DEVICE_LABELS: Record<string, string> = {
  "1": "Monitor",
  "2": "Smartphone",
  "3": "Tablet",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide block">{label}</span>
      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 break-words">
        {value === "" || value === null || value === undefined ? "NA" : value}
      </span>
    </div>
  );
}

// Termination callback URL, one per outcome (SurveyRouterController's
// /c_{id}, /d_{id}, /t_{id}, /q_{id}) - the client pastes this into their own
// survey platform's exit-redirect settings so it can report back per-respondent
// outcomes; auto-generated once at project creation, always the same after that.
function LinkField({ label, url }: { label: string; url?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1">
      <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide block">{label}</span>
      {url ? (
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 break-all">{url}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={copy}
            className="h-6 w-6 shrink-0 text-zinc-500 hover:text-zinc-950"
            title={`Copy ${label}`}
          >
            {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
          </Button>
        </div>
      ) : (
        <span className="text-sm text-zinc-400">NA</span>
      )}
    </div>
  );
}

export default function ProjectViewModal({ isOpen, onClose, projectId }: ProjectViewModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProjectFormData | null>(null);

  useEffect(() => {
    if (!isOpen || !projectId) return;

    const load = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await apiFetch(`${API_BASE_URL}/api/projects/form-data?id=${projectId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setData(json);
          } else if (!silent) {
            toast.error("Failed to load project details");
          }
        } else if (!silent) {
          toast.error("Failed to load project details");
        }
      } catch (err) {
        console.error("Error loading project details", err);
        if (!silent) toast.error("Error connecting to server");
      } finally {
        if (!silent) setLoading(false);
      }
    };

    load();
    // Live hit counts: silently refresh while the modal stays open so the
    // stats strip reflects new survey activity without closing/reopening it.
    const interval = setInterval(() => load(true), 5000);
    return () => clearInterval(interval);
  }, [isOpen, projectId]);

  const p = data?.projectData;
  const stats = data?.statistics;

  const redirectUrl = (marker: string, id?: string) =>
    id ? `${API_BASE_URL}/api/public/survey/${marker}_${id}?uid=` : undefined;

  const lookup = <T extends object>(
    list: T[] | undefined,
    id: unknown,
    idKey: keyof T,
    labelKey: keyof T
  ): T[keyof T] | undefined =>
    list?.find((item) => String(item[idKey]) === String(id))?.[labelKey];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] md:max-w-[75vw] lg:max-w-[60vw] max-h-[85vh] flex flex-col p-6 overflow-hidden bg-white dark:bg-zinc-950">
        <DialogHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-3 flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {p ? p.projectName : "Project Details"}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            {p ? `Project ID: ${p.id} · Localized: ${p.countryName || "NA"}` : "Loading project information..."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-auto my-2 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
              <span className="text-sm font-medium text-zinc-500">Loading project details...</span>
            </div>
          ) : !p ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
              <span className="text-sm font-bold text-zinc-600">Project not found</span>
            </div>
          ) : (
            <>
              {/* Statistics strip */}
              {stats && (
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {[
                    { label: "Hits", val: stats.hits },
                    { label: "Completed", val: stats.complete },
                    { label: "Disqualified", val: stats.disqualify },
                    { label: "Quota Full", val: stats.quotaFull },
                    { label: "Security Term", val: stats.securityTerm },
                    { label: "Drop", val: stats.drop },
                    { label: "EPC", val: `$${Number(stats.epc || 0).toFixed(2)}` },
                    { label: "IR", val: `${stats.ir}%` },
                    { label: "Avg LOI", val: stats.loi },
                    { label: "Abandon", val: `${stats.abendond}%` },
                  ].map((s, i) => (
                    <div key={i} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-center bg-zinc-50/50 dark:bg-zinc-900/50">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">{s.label}</span>
                      <span className="text-base font-extrabold text-zinc-800 dark:text-zinc-100">{s.val}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Core attributes */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
                  Core Attributes
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Self Parent" value={p.parentProjectId ? (lookup(data?.projects, p.parentProjectId, "id", "projectName") ?? p.parentProjectId) : "Self Project"} />
                  <Field label="Study Type" value={lookup(data?.studyTypes, p.studyType, "value", "label")} />
                  <Field label="Country" value={p.countryName || lookup(data?.countries, p.countryId, "id", "name")} />
                  <Field label="Language" value={lookup(data?.languages, p.languageId, "id", "languageName")} />
                  <Field label="Currency" value={lookup(data?.currency, p.currencyId, "id", "currencyName")} />
                  <Field label="Client's Budget (CPI)" value={p.cpc} />
                  <Field label="Vendor's Budget (CPI)" value={p.vendorCpi} />
                  <Field label="Start Date" value={p.startDateFormatted} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Survey Link" value={p.surveyLink} />
                  <Field label="Survey Test Link" value={p.surveyTestLink} />
                </div>
              </div>

              {/* Termination callback URLs */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
                  Termination Callback URLs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LinkField label="Complete Redirect URL" url={redirectUrl("c", p.completeRedirectId)} />
                  <LinkField label="Disqualify Redirect URL" url={redirectUrl("d", p.disqualifyRedirectId)} />
                  <LinkField label="Terminate Redirect URL" url={redirectUrl("t", p.terminateRedirectId)} />
                  <LinkField label="Quota Full Redirect URL" url={redirectUrl("q", p.quotaFullRedirectId)} />
                </div>
              </div>

              {/* Metrics & devices */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
                  Expected Metrics & Devices
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Req. Completes" value={p.reqComplete} />
                  <Field label="Expected IR (%)" value={p.ir} />
                  <Field label="Expected LOI (min)" value={p.loi} />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide block">Supported Devices</span>
                  <div className="flex flex-wrap gap-2">
                    {(data?.allDevicesIds || []).length === 0 ? (
                      <span className="text-sm text-zinc-400">NA</span>
                    ) : (
                      data?.allDevicesIds.map((d: string) => (
                        <span key={d} className="px-2.5 py-1 rounded-md text-xs font-semibold bg-cyan-50 border border-cyan-200 text-cyan-800 dark:bg-cyan-950/20 dark:border-cyan-900 dark:text-cyan-400">
                          {DEVICE_LABELS[d] || d}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide block">Quality Control</span>
                  <div className="flex flex-wrap gap-2">
                    {(data?.allChecklistIds || []).length === 0 ? (
                      <span className="text-sm text-zinc-400">NA</span>
                    ) : (
                      data?.allChecklistIds.map((c: string) => (
                        <span key={c} className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-500">
                          {lookup(data?.securityChecklist, c, "value", "label") || c}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* People & status */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
                  People & Status
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Field label="Client" value={lookup(data?.clients, p.clientId, "id", "clientName")} />
                  <Field label="Project Manager" value={lookup(data?.projectManagers, p.projectManagerId, "id", "userName")} />
                  <Field label="Sales Manager" value={lookup(data?.salesManagers, p.salesManagerId, "id", "userName")} />
                  <Field label="Status" value={lookup(data?.statusOptions, p.status, "value", "label")} />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
                  Memorandum
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Notes" value={p.notes} />
                  <Field label="Project Brief" value={p.projectBrief} />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="border-t border-zinc-100 dark:border-zinc-800 pt-3 flex-shrink-0">
          <Button onClick={onClose} className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
