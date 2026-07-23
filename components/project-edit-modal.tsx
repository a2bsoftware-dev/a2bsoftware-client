"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Save, Monitor, Smartphone, Tablet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface ProjectEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  onSaved: () => void;
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

interface ProjectFormOptions {
  securityChecklist: OptionItem[];
  studyTypes: OptionItem[];
  statusOptions: OptionItem[];
  devices: OptionItem[];
  languages: LanguageOption[];
  countries: CountryOption[];
  clients: ClientOption[];
  currency: CurrencyOption[];
  projects: ProjectOption[];
  projectManagers: UserOption[];
  salesManagers: UserOption[];
}

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  "1": <Monitor size={14} />,
  "2": <Smartphone size={14} />,
  "3": <Tablet size={14} />,
};

const emptyFormData = {
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
};

export default function ProjectEditModal({ isOpen, onClose, projectId, onSaved }: ProjectEditModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [options, setOptions] = useState<ProjectFormOptions>({
    securityChecklist: [],
    studyTypes: [],
    statusOptions: [],
    devices: [],
    languages: [],
    countries: [],
    clients: [],
    currency: [],
    projects: [],
    projectManagers: [],
    salesManagers: [],
  });
  const [formData, setFormData] = useState(emptyFormData);
  const [allDevicesIds, setAllDevicesIds] = useState<string[]>([]);
  const [allChecklistIds, setAllChecklistIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen || !projectId) return;

    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`${API_BASE_URL}/api/projects/form-data?id=${projectId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setOptions(data);
            const p = data.projectData;
            if (p) {
              setFormData({
                id: p.id,
                project_name: p.projectName || "",
                parent_project_id: p.parentProjectId || "",
                study_type: String(p.studyType),
                country_id: p.countryId || "",
                language_id: p.languageId || "",
                currency_id: p.currencyId || "",
                cpc: String(p.cpc),
                vendor_cpi: String(p.vendorCpi ?? ""),
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
            }
          } else {
            toast.error("Failed to load project details");
          }
        } else {
          toast.error("Failed to load project details");
        }
      } catch (err) {
        console.error("Error loading project configuration", err);
        toast.error("Error connecting to server");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, projectId]);

  const handleDeviceToggle = (val: string) => {
    setAllDevicesIds((prev) => (prev.includes(val) ? prev.filter((id) => id !== val) : [...prev, val]));
  };

  const handleChecklistToggle = (val: string) => {
    setAllChecklistIds((prev) => (prev.includes(val) ? prev.filter((id) => id !== val) : [...prev, val]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    if (
      !formData.project_name || !formData.study_type || !formData.country_id ||
      !formData.language_id || !formData.currency_id || !formData.cpc ||
      !formData.survey_link || !formData.req_complete || !formData.ir || !formData.loi ||
      !formData.client_id || !formData.project_manager_id || !formData.sales_manager_id
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (allDevicesIds.length === 0) {
      toast.error("Please support at least one device.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: projectId,
          projectName: formData.project_name,
          parentProjectId: formData.parent_project_id || null,
          studyType: parseInt(formData.study_type),
          countryId: formData.country_id,
          languageId: formData.language_id,
          currencyId: formData.currency_id,
          cpc: parseFloat(formData.cpc),
          vendorCpi: formData.vendor_cpi ? parseFloat(formData.vendor_cpi) : 0,
          surveyLink: formData.survey_link,
          surveyTestLink: formData.survey_test_link,
          reqComplete: parseInt(formData.req_complete),
          loi: parseInt(formData.loi),
          ir: parseInt(formData.ir),
          clientId: formData.client_id,
          projectManagerId: formData.project_manager_id || null,
          salesManagerId: formData.sales_manager_id || null,
          notes: formData.notes,
          projectBrief: formData.project_brief,
          status: parseInt(formData.status),
          allDevicesIds,
          allChecklistIds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || "Project updated successfully");
          onSaved();
          onClose();
        } else {
          toast.error(data.message || "Failed to update project");
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="max-w-[90vw] md:max-w-[75vw] lg:max-w-[65vw] max-h-[85vh] flex flex-col p-6 overflow-hidden bg-white dark:bg-zinc-950">
        <DialogHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-3 flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Edit Project Configurations
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            {projectId ? `Modifying project ID: ${projectId}` : "Loading..."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            <span className="text-sm font-medium text-zinc-500">Loading configuration details...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden">
            <div className="flex-grow overflow-auto my-2 space-y-6 pr-1">
              {/* Core Attributes */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
                  Core Attributes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-500">Self Parent</Label>
                    <NativeSelect
                      value={formData.parent_project_id}
                      onChange={(e) => setFormData({ ...formData, parent_project_id: e.target.value })}
                      className="h-9 w-full"
                    >
                      {options.projects.map((proj) => (
                        <option key={proj.id} value={proj.id}>{proj.projectName} (ID: {proj.id})</option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-500">
                      Project Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.project_name}
                      onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                      placeholder="Project Name"
                      className="h-9"
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
                      className="h-9 w-full"
                      required
                    >
                      <option value="">Select</option>
                      {options.studyTypes.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-500">
                      Country <span className="text-red-500">*</span>
                    </Label>
                    <NativeSelect
                      value={formData.country_id}
                      onChange={(e) => setFormData({ ...formData, country_id: e.target.value })}
                      className="h-9 w-full"
                      required
                    >
                      <option value="">Select</option>
                      {options.countries.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-500">
                      Language <span className="text-red-500">*</span>
                    </Label>
                    <NativeSelect
                      value={formData.language_id}
                      onChange={(e) => setFormData({ ...formData, language_id: e.target.value })}
                      className="h-9 w-full"
                      required
                    >
                      <option value="">Select</option>
                      {options.languages.map((l) => (
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
                      className="h-9 w-full"
                      required
                    >
                      <option value="">Select</option>
                      {options.currency.map((cur) => (
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
                      className="h-9"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-500">Vendor&apos;s Budget (CPI)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.vendor_cpi}
                      onChange={(e) => setFormData({ ...formData, vendor_cpi: e.target.value })}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-500">
                      Survey Link <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      value={formData.survey_link}
                      onChange={(e) => setFormData({ ...formData, survey_link: e.target.value })}
                      rows={2}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-500">Survey Test Link</Label>
                    <Textarea
                      value={formData.survey_test_link}
                      onChange={(e) => setFormData({ ...formData, survey_test_link: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Metrics & Devices */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
                  Expected Metrics & Devices
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-500">
                      Req. Completes <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={formData.req_complete}
                      onChange={(e) => setFormData({ ...formData, req_complete: e.target.value })}
                      className="h-9"
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
                      className="h-9"
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
                      className="h-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block">
                    Supported Devices <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex flex-wrap items-center gap-3">
                    {options.devices.map((dev) => {
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
                          {DEVICE_ICONS[dev.value]}
                          <span>{dev.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block">
                    Quality Control Checklist
                  </Label>
                  <div className="flex flex-wrap items-center gap-3">
                    {options.securityChecklist.map((c) => {
                      const isChecked = allChecklistIds.includes(c.value);
                      return (
                        <div
                          key={c.value}
                          onClick={() => handleChecklistToggle(c.value)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer select-none transition-all ${
                            isChecked
                              ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-500"
                              : "bg-white border-zinc-200 text-zinc-500 dark:bg-zinc-950 dark:border-zinc-800"
                          }`}
                        >
                          <span>{c.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* People & Status */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
                  People Assignments & Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-500">
                      Client <span className="text-red-500">*</span>
                    </Label>
                    <NativeSelect
                      value={formData.client_id}
                      onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                      className="h-9 w-full"
                      required
                    >
                      <option value="">Select Client</option>
                      {options.clients.map((cl) => (
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
                      className="h-9 w-full"
                      required
                    >
                      <option value="">Select PM</option>
                      {options.projectManagers.map((pm) => (
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
                      className="h-9 w-full"
                      required
                    >
                      <option value="">Select SM</option>
                      {options.salesManagers.map((sm) => (
                        <option key={sm.id} value={sm.id}>{sm.userName}</option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-500">
                      Status <span className="text-red-500">*</span>
                    </Label>
                    <NativeSelect
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="h-9 w-full"
                      required
                    >
                      {options.statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-500">Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Internal PM comments"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-500">Project Brief</Label>
                    <Textarea
                      value={formData.project_brief}
                      onChange={(e) => setFormData({ ...formData, project_brief: e.target.value })}
                      placeholder="Short summary details"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-zinc-100 dark:border-zinc-800 pt-3 flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
                size="sm"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} size="sm" className="flex items-center gap-1.5">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Update Project</span>
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
