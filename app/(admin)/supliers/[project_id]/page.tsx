"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FolderKanban, ArrowLeft, Loader2, Plus,
  Eye, Link2, Download, Copy, Check
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { API_BASE_URL, apiFetch } from "@/lib/api";

// Supplier allocation row, as returned by GET /api/projects/{id}/suppliers
// (SupplierListItemDto on the backend) and used for the add/edit modal
// (openEditModal reads the same shape back from a row).
interface Supplier {
  id: string;
  vendorId: string;
  vendorName?: string;
  status: number;
  statusLabel?: string;
  hits?: number;
  quotaFull?: number;
  complete?: number;
  disqualify?: number;
  securityTerm?: number;
  ir?: string;
  costPerComplete?: number;
  completeRequest?: number;
  maxRedirect?: number;
  completeLink?: string;
  disqualifyLink?: string;
  qoutafullLink?: string;
  securityTermlink?: string;
  notes?: string;
  dataRedirectIds?: string[];
}

// Generic {value, label} option, used for both status options and the
// "data to ask on redirect" checklist returned by /api/suppliers/form-metadata.
interface SelectOption {
  value: string | number;
  label: string;
}

interface VendorOption {
  id: string;
  vendorName: string;
}

interface FormMetadata {
  vendors: VendorOption[];
  statusOptions: SelectOption[];
  dataToAskOnRedirect: SelectOption[];
}

// A single click/transaction row shown in the "View Clicks Details" modal
// and exported to CSV - matches SurveyDetailRowDto from GET /api/projects/survey-details.
interface SupplierDetailRow {
  id: string;
  pid: string;
  gid: string;
  vendorName?: string;
  projectName?: string;
  clientName?: string;
  startIpAddress?: string;
  endIpAddress?: string;
  startTime?: string;
  endTime?: string;
  startDate?: string;
  endDate?: string;
  refId?: string;
  userId?: string;
  status?: string;
  countryName?: string;
}

export default function SuppliersPage() {
  const params = useParams();
  const router = useRouter();
  const project_id = Array.isArray(params?.project_id) ? params.project_id[0] : params?.project_id || "";

  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Allocations data
  const [dataset, setDataset] = useState<Supplier[]>([]);
  const [projectCPC, setProjectCPC] = useState(0);
  const [projectName, setProjectName] = useState("");

  // Lookup options
  const [options, setOptions] = useState<FormMetadata>({
    vendors: [],
    statusOptions: [],
    dataToAskOnRedirect: [],
  });

  // Modal 1: Add/Edit Supplier allocation states
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [supplierData, setSupplierData] = useState({
    id: "",
    vendorId: "",
    costPerComplete: "",
    completeRequest: "",
    maxRedirect: "",
    completeLink: "",
    disqualifyLink: "",
    qoutafullLink: "",
    securityTermlink: "",
    notes: "",
    status: "2", // Testing
    dataRedirectIds: [] as string[],
  });

  // Modal 2: View Clicks Details popup states
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsSupplier, setDetailsSupplier] = useState<Supplier | null>(null);
  const [detailsList, setDetailsList] = useState<SupplierDetailRow[]>([]);
  const [exportingDetails, setExportingDetails] = useState(false);

  // Fetch supplier allocations list
  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/projects/${project_id}/suppliers`);

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDataset(data.suppliers || []);
          if (data.project) {
            setProjectCPC(data.project.cpc || 0);
            setProjectName(data.project.projectName || "");
          }
        }
      }
    } catch (err) {
      console.error("Error loading suppliers list", err);
      toast.error("Failed to load suppliers allocation list");
    } finally {
      setLoading(false);
    }
  }, [project_id]);

  // Fetch lookup lists
  const loadFormMetadata = async () => {
    try {
      const res = await apiFetch("/api/suppliers/form-metadata");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setOptions(data);
        }
      }
    } catch (err) {
      console.error("Error loading form metadata", err);
    }
  };

  useEffect(() => {
    if (project_id) {
      // Standard fetch-on-mount/param-change pattern: these functions' own
      // setState calls are flagged by this rule as if the effect itself sets
      // state, but fetching data in response to a changed project_id is
      // exactly React's documented "synchronize with an external system" use
      // case, not the render-derived-value anti-pattern this rule targets.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadSuppliers();
      loadFormMetadata();
    }
  }, [project_id, loadSuppliers]);

  // Handle autocomplete Vendor Details to prefill callback links
  const handleVendorChange = async (vendorId: string) => {
    setSupplierData(prev => ({ ...prev, vendorId }));
    if (!vendorId) return;

    try {
      const res = await apiFetch(`/api/suppliers/vendor/${vendorId}`);

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.vendor) {
          const v = data.vendor;
          setSupplierData(prev => ({
            ...prev,
            completeLink: v.completeLink || "",
            disqualifyLink: v.disqualifyLink || "",
            qoutafullLink: v.qoutafullLink || "",
            securityTermlink: v.securityTermlink || "",
          }));
        }
      }
    } catch (err) {
      console.error("Error fetching vendor details", err);
    }
  };

  const handleDataAskToggle = (val: string) => {
    const current = [...supplierData.dataRedirectIds];
    if (current.includes(val)) {
      setSupplierData({
        ...supplierData,
        dataRedirectIds: current.filter(id => id !== val)
      });
    } else {
      setSupplierData({
        ...supplierData,
        dataRedirectIds: [...current, val]
      });
    }
  };

  const openAddModal = () => {
    setSupplierData({
      id: "",
      vendorId: "",
      costPerComplete: String(projectCPC * 0.6), // Autofill CPC proposal
      completeRequest: "",
      maxRedirect: "",
      completeLink: "",
      disqualifyLink: "",
      qoutafullLink: "",
      securityTermlink: "",
      notes: "",
      status: "2",
      dataRedirectIds: [],
    });
    setSupplierModalOpen(true);
  };

  const openEditModal = (sup: Supplier) => {
    setSupplierData({
      id: sup.id,
      vendorId: String(sup.vendorId),
      costPerComplete: String(sup.costPerComplete ?? ""),
      completeRequest: String(sup.completeRequest ?? ""),
      maxRedirect: String(sup.maxRedirect ?? ""),
      completeLink: sup.completeLink || "",
      disqualifyLink: sup.disqualifyLink || "",
      qoutafullLink: sup.qoutafullLink || "",
      securityTermlink: sup.securityTermlink || "",
      notes: sup.notes || "",
      status: String(sup.status),
      dataRedirectIds: sup.dataRedirectIds || [],
    });
    setSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierData.vendorId || !supplierData.costPerComplete ||
        !supplierData.completeRequest || !supplierData.maxRedirect ||
        !supplierData.completeLink || !supplierData.disqualifyLink ||
        !supplierData.qoutafullLink || !supplierData.securityTermlink ||
        !supplierData.status) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSavingSupplier(true);
    try {
      const isUpdate = Boolean(supplierData.id);
      const body = {
        vendorId: supplierData.vendorId,
        costPerComplete: Number(supplierData.costPerComplete),
        completeRequest: Number(supplierData.completeRequest),
        maxRedirect: Number(supplierData.maxRedirect),
        completeLink: supplierData.completeLink,
        disqualifyLink: supplierData.disqualifyLink,
        qoutafullLink: supplierData.qoutafullLink,
        securityTermlink: supplierData.securityTermlink,
        notes: supplierData.notes,
        status: Number(supplierData.status),
        dataRedirectIds: supplierData.dataRedirectIds,
      };

      const res = await apiFetch(
        isUpdate ? `/api/suppliers/${supplierData.id}` : `/api/projects/${project_id}/suppliers`,
        {
          method: isUpdate ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || "Supplier allocation details saved");
          setSupplierModalOpen(false);
          loadSuppliers();
        } else {
          toast.error(data.message || "Failed to save details");
        }
      }
    } catch (err) {
      console.error("Error saving supplier details", err);
      toast.error("Error connecting to server to save details");
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleRemoveSupplier = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this supplier allocation?")) return;

    try {
      const res = await apiFetch(`/api/suppliers/${id}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || "Supplier allocation removed successfully");
          loadSuppliers();
        } else {
          toast.error(data.message || "Failed to remove supplier allocation");
        }
      }
    } catch (err) {
      console.error("Error removing supplier allocation", err);
      toast.error("Failed to remove supplier allocation");
    }
  };

  // View clicks table in detail modal - reuses the project-wide survey-details
  // endpoint, scoped to this vendor via gid (the vendor's own id, not this
  // allocation's id - see SurveyRouterController/ManageSupplier).
  const openDetailsModal = async (sup: Supplier, statusFilter: number | null = null) => {
    setDetailsSupplier(sup);
    setDetailsList([]);
    setDetailsModalOpen(true);
    setLoadingDetails(true);

    try {
      const query = new URLSearchParams({ projectId: String(project_id), gid: String(sup.vendorId) });
      if (statusFilter !== null) {
        query.set("status", String(statusFilter));
      }
      const res = await apiFetch(`/api/projects/survey-details?${query.toString()}`);

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDetailsList(data.surveyInformations || []);
        }
      }
    } catch (err) {
      console.error("Error loading supplier details clicks", err);
      toast.error("Failed to load details list");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleExportDetails = () => {
    if (detailsList.length === 0) return;
    setExportingDetails(true);

    try {
      let csvContent = "SN,Project ID,Supplier ID,Supplier Name,Our PO,Client,Start IP,End IP,Start Time,End Time,Start Date,End Date,Ref ID,UID,Status,Country\n";
      detailsList.forEach((row, idx) => {
        const escapeCsv = (str: string | number | null | undefined) => `"${String(str || "").replace(/"/g, '""')}"`;
        csvContent += `${idx + 1},${row.pid},${row.gid},${escapeCsv(row.vendorName)},${escapeCsv(row.projectName)},${escapeCsv(row.clientName)},${row.startIpAddress},${row.endIpAddress},${row.startTime},${row.endTime},${row.startDate},${row.endDate},${escapeCsv(row.refId)},${escapeCsv(row.userId)},${row.status},${escapeCsv(row.countryName)}\n`;
      });

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `survey_supplier_details_${detailsSupplier?.vendorName || "supplier"}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("CSV export downloaded successfully");
    } catch (err) {
      console.error("Error exporting details", err);
      toast.error("Failed to export details");
    } finally {
      setExportingDetails(false);
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

  const copySurveyUrl = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    toast.success("Survey link copied to clipboard");
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // The link vendors actually get sent - hits the Spring Boot backend's public
  // routing gateway directly (SurveyRouterController, /api/public/survey/**),
  // not this frontend. pid/gid are UUIDs so encoding is a no-op today, but the
  // vendor-appended user_id can contain arbitrary characters, so every part is
  // still run through encodeURIComponent rather than string-concatenated raw.
  const buildSurveyStartUrl = () => {
    const query = `pid=${encodeURIComponent(project_id)}&gid=${encodeURIComponent(supplierData.vendorId)}&user_id=`;
    return `${API_BASE_URL}/api/public/survey/start?${query}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Band */}
      <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
            <Link2 className="h-6 w-6 text-zinc-500" />
            Supplier Allocations
          </h1>
          {projectName && (
            <p className="text-xs text-zinc-500 mt-0.5">
              Configuring panels for: <strong>{projectName}</strong> (ID: {project_id}). Project CPC: <strong>${projectCPC}</strong>.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={openAddModal}
            size="sm"
            className="flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={15} />
            <span>Add Supplier</span>
          </Button>
          <Button
            onClick={() => router.push("/projects")}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 border-zinc-200 text-zinc-600 shadow-sm"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </Button>
        </div>
      </div>

      {/* 2. Grid Table Card */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden bg-white dark:bg-zinc-900">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
              <span className="text-sm font-medium text-zinc-500">Querying supplier allocations...</span>
            </div>
          ) : dataset.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
              <span className="text-sm font-bold text-zinc-600">No Supplier Allocations Found</span>
              <span className="text-xs text-zinc-400">Allocate a supplier panel to begin collecting response clicks.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border-collapse text-xs">
                <TableHeader className="bg-zinc-50/70 dark:bg-zinc-900">
                  <TableRow className="border-b border-zinc-200">
                    <TableHead className="font-semibold text-zinc-600 h-10 w-12 text-center">SN</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">Panel Name</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 text-center">Status</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 text-center">Hits</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 text-center">Quota Full</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 text-center">Complete</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 text-center">Disqualified</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 text-center">Security Term</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 text-center">IR %</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 text-center">CPC Budget</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 w-36 text-center">#</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataset.map((supplier, idx) => {
                    return (
                      <TableRow key={supplier.id} className="border-b border-zinc-150 hover:bg-zinc-50/50 transition-colors">
                        <TableCell className="text-center font-medium text-zinc-400 py-3">{idx + 1}</TableCell>
                        <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {supplier.vendorName || "Internal Team"}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusColor(supplier.status)}`}>
                            {supplier.statusLabel}
                          </span>
                        </TableCell>

                        <TableCell className="text-center font-mono font-semibold text-zinc-600">{supplier.hits}</TableCell>

                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetailsModal(supplier, 3)}
                            className="h-7 px-2 font-mono hover:bg-zinc-100 text-zinc-600 select-text"
                          >
                            {supplier.quotaFull}
                          </Button>
                        </TableCell>

                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetailsModal(supplier, 1)}
                            className="h-7 px-2 font-mono hover:bg-cyan-50 hover:text-cyan-700 text-cyan-600 dark:text-cyan-400 select-text"
                          >
                            {supplier.complete}
                          </Button>
                        </TableCell>

                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetailsModal(supplier, 2)}
                            className="h-7 px-2 font-mono hover:bg-red-50 hover:text-red-700 text-red-600 dark:text-red-400 select-text"
                          >
                            {supplier.disqualify}
                          </Button>
                        </TableCell>

                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetailsModal(supplier, 4)}
                            className="h-7 px-2 font-mono hover:bg-zinc-100 text-zinc-600 select-text"
                          >
                            {supplier.securityTerm}
                          </Button>
                        </TableCell>

                        <TableCell className="text-center font-mono font-bold text-zinc-700 dark:text-zinc-300">{supplier.ir}%</TableCell>
                        <TableCell className="text-center font-mono text-zinc-600 font-medium">${supplier.costPerComplete}</TableCell>

                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              onClick={() => openDetailsModal(supplier, null)}
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-zinc-600 hover:text-zinc-900 border-zinc-200 flex items-center gap-1"
                            >
                              <Eye size={12} />
                              <span>View</span>
                            </Button>
                            <Button
                              onClick={() => openEditModal(supplier)}
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-indigo-600 hover:text-indigo-700 border-zinc-200"
                            >
                              Edit
                            </Button>
                            <Button
                              onClick={() => handleRemoveSupplier(supplier.id)}
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </Button>
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

      {/* 3. Add / Edit Supplier Dialog Modal */}
      <Dialog open={supplierModalOpen} onOpenChange={setSupplierModalOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleSaveSupplier}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                <Link2 className="h-5 w-5 text-zinc-500" />
                {Boolean(supplierData.id) ? "Update Supplier Allocation" : "Allocate Supplier Panel"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="supplierVendorSelect" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                    Select Vendor <span className="text-red-500">*</span>
                  </Label>
                  <NativeSelect
                    id="supplierVendorSelect"
                    value={supplierData.vendorId}
                    onChange={(e) => handleVendorChange(e.target.value)}
                    required
                  >
                    <option value="">Select Vendor</option>
                    {options.vendors.map((v: VendorOption) => (
                      <option key={v.id} value={v.id}>{v.vendorName}</option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="supplierCpcInput" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                    Cost Per Complete (proposed: Project CPI * 0.6) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="supplierCpcInput"
                    type="number"
                    step="0.01"
                    placeholder="CPC payout"
                    value={supplierData.costPerComplete}
                    onChange={(e) => setSupplierData({ ...supplierData, costPerComplete: e.target.value })}
                    required
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="supplierReqComplete" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                    Req. Completes <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="supplierReqComplete"
                    type="number"
                    placeholder="Target completes requested"
                    value={supplierData.completeRequest}
                    onChange={(e) => setSupplierData({ ...supplierData, completeRequest: e.target.value })}
                    required
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="supplierMaxRedirect" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                    Max Redirects <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="supplierMaxRedirect"
                    type="number"
                    placeholder="Max redirects clicks allowed"
                    value={supplierData.maxRedirect}
                    onChange={(e) => setSupplierData({ ...supplierData, maxRedirect: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="supplierCompleteLink" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                    Completion Link <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="supplierCompleteLink"
                    placeholder="Redirect Complete Callback"
                    value={supplierData.completeLink}
                    onChange={(e) => setSupplierData({ ...supplierData, completeLink: e.target.value })}
                    rows={2}
                    required
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="supplierDisqualifyLink" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                    Disqualify Link <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="supplierDisqualifyLink"
                    placeholder="Redirect Disqualify Callback"
                    value={supplierData.disqualifyLink}
                    onChange={(e) => setSupplierData({ ...supplierData, disqualifyLink: e.target.value })}
                    rows={2}
                    required
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="supplierQoutafullLink" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                    Quota Full Link <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="supplierQoutafullLink"
                    placeholder="Redirect Quota Full Callback"
                    value={supplierData.qoutafullLink}
                    onChange={(e) => setSupplierData({ ...supplierData, qoutafullLink: e.target.value })}
                    rows={2}
                    required
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="supplierSecurityLink" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                    Security Term Link <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="supplierSecurityLink"
                    placeholder="Redirect Security Term Callback"
                    value={supplierData.securityTermlink}
                    onChange={(e) => setSupplierData({ ...supplierData, securityTermlink: e.target.value })}
                    rows={2}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="supplierNotes" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                    Notes <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="supplierNotes"
                    placeholder="Internal PM comments"
                    value={supplierData.notes}
                    onChange={(e) => setSupplierData({ ...supplierData, notes: e.target.value })}
                    rows={2}
                    required
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="supplierStatus" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                    Allocation Status <span className="text-red-500">*</span>
                  </Label>
                  <NativeSelect
                    id="supplierStatus"
                    value={supplierData.status}
                    onChange={(e) => setSupplierData({ ...supplierData, status: e.target.value })}
                    required
                  >
                    {options.statusOptions.map((opt: SelectOption) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </NativeSelect>
                </div>
              </div>

              <div className="space-y-1.5 mt-2">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block">
                  Data to ask on redirect <span className="text-red-500">*</span>
                </Label>
                <div className="flex flex-wrap items-center gap-3">
                  {options.dataToAskOnRedirect.map((opt: SelectOption) => {
                    const isChecked = supplierData.dataRedirectIds.includes(String(opt.value));
                    return (
                      <div
                        key={opt.value}
                        onClick={() => handleDataAskToggle(String(opt.value))}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold cursor-pointer select-none transition-all ${
                          isChecked
                            ? "bg-cyan-50 border-cyan-300 text-cyan-800 dark:bg-cyan-950/20 dark:border-cyan-900"
                            : "bg-white border-zinc-200 text-zinc-500 dark:bg-zinc-950 dark:border-zinc-800"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500 scale-90"
                        />
                        <span>{opt.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {Boolean(supplierData.vendorId) && (
                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-3">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide block">
                    Link Configuration
                  </span>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-zinc-400">Supplier Survey Link</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        readOnly
                        value={buildSurveyStartUrl()}
                        className="font-mono text-[10px] bg-zinc-50 select-all cursor-pointer h-8 py-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copySurveyUrl(buildSurveyStartUrl(), "survey-link")}
                        className="h-8 w-8 flex items-center justify-center shrink-0 border-zinc-200"
                      >
                        {copiedKey === "survey-link" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </Button>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      Give this link to the vendor - they append their own respondent id after <code>user_id=</code>.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSupplierModalOpen(false)}
                disabled={savingSupplier}
                size="sm"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingSupplier} size="sm" className="flex items-center gap-1.5">
                {savingSupplier && <Loader2 size={14} className="animate-spin" />}
                <span>{Boolean(supplierData.id) ? "Update Allocation" : "Create Allocation"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. View Clicks Details Dialog Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5 justify-between pr-8">
              <span className="flex items-center gap-1.5">
                <FolderKanban className="h-5 w-5 text-zinc-500" />
                Supplier Click Details
              </span>
              <Button
                onClick={handleExportDetails}
                disabled={exportingDetails || loadingDetails || detailsList.length === 0}
                variant="secondary"
                size="sm"
                className="flex items-center gap-1 shadow-sm font-semibold text-xs h-7 py-0 px-2"
              >
                {exportingDetails ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Download size={12} />
                )}
                <span>Export CSV</span>
              </Button>
            </DialogTitle>
            {detailsSupplier && (
              <p className="text-xs text-zinc-500">
                Auditing transactions for supplier: <strong>{detailsSupplier.vendorName || "Internal Team"}</strong> (Allocation ID: {detailsSupplier.id})
              </p>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-[300px] py-4 border-t border-zinc-100 dark:border-zinc-800">
            {loadingDetails ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                <span className="text-sm font-medium text-zinc-500">Retrieving supplier logs...</span>
              </div>
            ) : detailsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-1">
                <span className="text-sm font-bold text-zinc-600">No Clicks Found</span>
                <span className="text-xs text-zinc-400">There are no respondent redirection transactions recorded for this supplier.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="border-collapse text-[10px] w-full">
                  <TableHeader className="bg-zinc-50/70 dark:bg-zinc-900">
                    <TableRow className="border-b border-zinc-200">
                      <TableHead className="font-semibold text-zinc-600 h-8 w-8 text-center">SN</TableHead>
                      <TableHead className="font-semibold text-zinc-600 h-8 text-center">PID</TableHead>
                      <TableHead className="font-semibold text-zinc-600 h-8 text-center">GID</TableHead>
                      <TableHead className="font-semibold text-zinc-600 h-8">PO Name</TableHead>
                      <TableHead className="font-semibold text-zinc-600 h-8">Start IP</TableHead>
                      <TableHead className="font-semibold text-zinc-600 h-8">End IP</TableHead>
                      <TableHead className="font-semibold text-zinc-600 h-8">Start Time</TableHead>
                      <TableHead className="font-semibold text-zinc-600 h-8">End Time</TableHead>
                      <TableHead className="font-semibold text-zinc-600 h-8">Ref ID</TableHead>
                      <TableHead className="font-semibold text-zinc-600 h-8">UID</TableHead>
                      <TableHead className="font-semibold text-zinc-600 h-8 text-center">Status</TableHead>
                      <TableHead className="font-semibold text-zinc-600 h-8">Country</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailsList.map((row, idx) => {
                      return (
                        <TableRow key={row.id} className="border-b border-zinc-150 hover:bg-zinc-50/50 transition-colors">
                          <TableCell className="text-center font-medium text-zinc-400 py-2">{idx + 1}</TableCell>
                          <TableCell className="text-center font-bold text-zinc-800 dark:text-zinc-200">{row.pid}</TableCell>
                          <TableCell className="text-center text-zinc-500 font-mono">{row.gid}</TableCell>
                          <TableCell className="font-medium text-zinc-700 dark:text-zinc-300 max-w-[100px] truncate" title={row.projectName}>{row.projectName}</TableCell>
                          <TableCell className="text-zinc-500 font-mono">{row.startIpAddress}</TableCell>
                          <TableCell className="text-zinc-500 font-mono">{row.endIpAddress}</TableCell>
                          <TableCell className="text-zinc-600 font-mono">{row.startDate} {row.startTime}</TableCell>
                          <TableCell className="text-zinc-600 font-mono">{row.endDate} {row.endTime}</TableCell>
                          <TableCell className="text-zinc-500 font-mono max-w-[80px] truncate" title={row.refId}>{row.refId}</TableCell>
                          <TableCell className="text-zinc-500 font-mono max-w-[80px] truncate" title={row.userId}>{row.userId}</TableCell>
                          <TableCell className="text-center">
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${
                              row.status === "Complete"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400"
                                : row.status === "Disqualify"
                                ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400"
                                : row.status === "quotaFull"
                                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400"
                                : row.status === "securityTerm"
                                ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400"
                                : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400"
                            }`}>
                              {row.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-zinc-600 font-medium">{row.countryName}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDetailsModalOpen(false)}
              size="sm"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
