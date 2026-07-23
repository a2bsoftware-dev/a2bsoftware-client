"use client";

import React, { useEffect, useState } from "react";
import {
  KeyRound, Plus, Search, RefreshCw,
  Edit2, Trash2, Loader2, Link2
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

interface Vendor {
  id: string;
  vendorName: string;
  contactPerson?: string;
  contact?: string;
  email?: string;
  paymentTerms?: string;
  completeLink?: string;
  disqualifyLink?: string;
  qoutafullLink?: string;
  securityTermlink?: string;
  apiToken?: string;
  internalPanel?: number;
}

interface PaymentOption {
  value: string;
  label: string;
}

export default function VendorsPage() {
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([]);

  // Dialog States
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [savingVendor, setSavingVendor] = useState(false);
  const [vendorData, setVendorData] = useState({
    id: "",
    vendorName: "",
    contactPerson: "",
    contact: "",
    email: "",
    paymentTerms: "",
    completeLink: "",
    disqualifyLink: "",
    qoutafullLink: "",
    securityTermlink: "",
  });

  // Fetch vendors
  const loadVendors = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/vendors`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setVendors(data.vendors || []);
          setPaymentOptions(data.paymentTermsOptions || []);
        }
      }
    } catch (err) {
      console.error("Error loading vendors", err);
      toast.error("Failed to load vendors list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Standard fetch-on-mount/param-change pattern: this function's own
    // setState calls are flagged by this rule as if the effect itself sets
    // state, but fetching data on mount/param change is exactly React's
    // documented "synchronize with an external system" use case, not the
    // render-derived-value anti-pattern this rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadVendors();
  }, []);

  const openAddModal = () => {
    setVendorData({
      id: "",
      vendorName: "",
      contactPerson: "",
      contact: "",
      email: "",
      paymentTerms: "",
      completeLink: "",
      disqualifyLink: "",
      qoutafullLink: "",
      securityTermlink: "",
    });
    setVendorModalOpen(true);
  };

  const openEditModal = (vendor: Vendor) => {
    setVendorData({
      id: vendor.id,
      vendorName: vendor.vendorName || "",
      contactPerson: vendor.contactPerson || "",
      contact: vendor.contact || "",
      email: vendor.email || "",
      paymentTerms: vendor.paymentTerms || "",
      completeLink: vendor.completeLink || "",
      disqualifyLink: vendor.disqualifyLink || "",
      qoutafullLink: vendor.qoutafullLink || "",
      securityTermlink: vendor.securityTermlink || "",
    });
    setVendorModalOpen(true);
  };

  const handleSaveVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendorData.vendorName || !vendorData.contactPerson || !vendorData.contact || !vendorData.email || !vendorData.paymentTerms) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSavingVendor(true);
    try {
      const isUpdate = Boolean(vendorData.id);
      const res = await apiFetch(
        isUpdate ? `${API_BASE_URL}/api/vendors/${vendorData.id}` : `${API_BASE_URL}/api/vendors`,
        {
          method: isUpdate ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(vendorData),
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || "Vendor details saved successfully");
          setVendorModalOpen(false);
          loadVendors();
        } else {
          toast.error(data.message || "Failed to save vendor details");
        }
      }
    } catch (err) {
      console.error("Error saving vendor details", err);
      toast.error("Error connecting to server to save vendor details");
    } finally {
      setSavingVendor(false);
    }
  };

  const handleDeleteVendor = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this vendor?")) return;

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/vendors/${id}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || "Vendor deleted successfully");
          loadVendors();
        } else {
          toast.error(data.error || "Failed to delete vendor");
        }
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete vendor");
      }
    } catch (err) {
      console.error("Error deleting vendor", err);
      toast.error("Failed to delete vendor");
    }
  };

  // Filter vendors client-side
  const filteredVendors = vendors.filter(v => 
    v.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.email && v.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (v.contactPerson && v.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* 1. Header Band */}
      <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-zinc-500" />
            Vendors Management
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure supplier properties, API security tokens, callbacks, and track active accounts.
          </p>
        </div>
        <Button
          onClick={openAddModal}
          size="sm"
          className="flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={15} />
          <span>Add Vendor</span>
        </Button>
      </div>

      {/* 2. Filter Search Card */}
      <Card className="border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
        <CardContent className="pt-4 pb-4 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search vendors by name, contact person, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button
            onClick={() => setSearchTerm("")}
            variant="outline"
            size="sm"
            className="flex items-center gap-1 border-zinc-200 hover:bg-zinc-50 text-zinc-600 shadow-sm"
          >
            <RefreshCw size={13} />
            <span>Clear</span>
          </Button>
        </CardContent>
      </Card>

      {/* 3. Table / Results Card */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden bg-white dark:bg-zinc-900">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
              <span className="text-sm font-medium text-zinc-500">Querying supplier directories...</span>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
              <span className="text-sm font-bold text-zinc-600">No Vendors Found</span>
              <span className="text-xs text-zinc-400">Try modifying search term or register a new vendor.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border-collapse">
                <TableHeader className="bg-zinc-50/70 dark:bg-zinc-900">
                  <TableRow className="border-b border-zinc-200">
                    <TableHead className="font-semibold text-zinc-600 h-10 w-12 text-center">SN</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">Vendor Name</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">Email Address</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">Contact Person</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">Contact Number</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">Payment Terms</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">API Token</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 w-24 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.map((v, idx) => {
                    const paymentLabel = paymentOptions.find(opt => opt.value === String(v.paymentTerms))?.label || `${v.paymentTerms || "15"} Days`;
                    const isInternal = v.internalPanel === 1;

                    return (
                      <TableRow key={v.id} className="border-b border-zinc-150 hover:bg-zinc-50/50 transition-colors">
                        <TableCell className="text-center font-medium text-zinc-400 py-3.5">{idx + 1}</TableCell>
                        <TableCell className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <span>{v.vendorName}</span>
                          {isInternal && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900 dark:text-indigo-400 font-bold uppercase tracking-wider scale-90">
                              System
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-600 font-medium">{v.email || "NA"}</TableCell>
                        <TableCell className="text-zinc-700 dark:text-zinc-300 font-medium">{v.contactPerson || "NA"}</TableCell>
                        <TableCell className="text-zinc-500 font-mono text-xs">{v.contact || "NA"}</TableCell>
                        <TableCell className="text-zinc-700 dark:text-zinc-300 font-medium">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400">
                            {paymentLabel}
                          </span>
                        </TableCell>
                        <TableCell className="text-zinc-500 font-mono text-[10px] max-w-[120px] truncate" title={v.apiToken}>{v.apiToken || "NA"}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              onClick={() => openEditModal(v)}
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                              title="Edit vendor details"
                            >
                              <Edit2 size={14} />
                            </Button>

                            {!isInternal && (
                              <Button
                                onClick={() => handleDeleteVendor(v.id)}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                title="Remove vendor profile"
                              >
                                <Trash2 size={14} />
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

      {/* 4. Add / Update Vendor Dialog Modal */}
      <Dialog open={vendorModalOpen} onOpenChange={setVendorModalOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleSaveVendorSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                <Link2 className="h-5 w-5 text-zinc-500" />
                {vendorData.id ? "Update Vendor profile" : "Register Vendor supplier"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="vendorNameInput" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                    Vendor Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="vendorNameInput"
                    placeholder="Supplier Panel Name"
                    value={vendorData.vendorName}
                    onChange={(e) => setVendorData({ ...vendorData, vendorName: e.target.value })}
                    required
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="vendorContactPersonInput" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                    Contact Person <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="vendorContactPersonInput"
                    placeholder="Primary manager name"
                    value={vendorData.contactPerson}
                    onChange={(e) => setVendorData({ ...vendorData, contactPerson: e.target.value })}
                    required
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="vendorContactInput" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                    Contact Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="vendorContactInput"
                    placeholder="Phone line"
                    value={vendorData.contact}
                    onChange={(e) => setVendorData({ ...vendorData, contact: e.target.value })}
                    required
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="vendorEmailInput" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="vendorEmailInput"
                    type="email"
                    placeholder="account@supplier.com"
                    value={vendorData.email}
                    onChange={(e) => setVendorData({ ...vendorData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="vendorPaymentTermsSelect" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  Payment Terms <span className="text-red-500">*</span>
                </Label>
                <NativeSelect
                  id="vendorPaymentTermsSelect"
                  value={vendorData.paymentTerms}
                  onChange={(e) => setVendorData({ ...vendorData, paymentTerms: e.target.value })}
                  required
                >
                  <option value="">Select Invoicing Term</option>
                  {paymentOptions.map((opt: PaymentOption) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </NativeSelect>
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-4">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide block">
                  Supplier Panel Callback URLs
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="vendorCompleteLink" className="text-xs font-semibold text-zinc-500">
                      Complete Callback Link
                    </Label>
                    <Textarea
                      id="vendorCompleteLink"
                      placeholder="e.g. https://panel.vendor.com/redirect?status=complete&uid=[uid]"
                      value={vendorData.completeLink}
                      onChange={(e) => setVendorData({ ...vendorData, completeLink: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="vendorDisqualifyLink" className="text-xs font-semibold text-zinc-500">
                      Disqualify Callback Link
                    </Label>
                    <Textarea
                      id="vendorDisqualifyLink"
                      placeholder="e.g. https://panel.vendor.com/redirect?status=disqualify&uid=[uid]"
                      value={vendorData.disqualifyLink}
                      onChange={(e) => setVendorData({ ...vendorData, disqualifyLink: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="vendorQuotaFullLink" className="text-xs font-semibold text-zinc-500">
                      Quota Full Callback Link
                    </Label>
                    <Textarea
                      id="vendorQuotaFullLink"
                      placeholder="e.g. https://panel.vendor.com/redirect?status=quota_full&uid=[uid]"
                      value={vendorData.qoutafullLink}
                      onChange={(e) => setVendorData({ ...vendorData, qoutafullLink: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="vendorSecurityTermLink" className="text-xs font-semibold text-zinc-500">
                      Security Term Callback Link
                    </Label>
                    <Textarea
                      id="vendorSecurityTermLink"
                      placeholder="e.g. https://panel.vendor.com/redirect?status=security&uid=[uid]"
                      value={vendorData.securityTermlink}
                      onChange={(e) => setVendorData({ ...vendorData, securityTermlink: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setVendorModalOpen(false)}
                disabled={savingVendor}
                size="sm"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingVendor} size="sm" className="flex items-center gap-1.5">
                {savingVendor && <Loader2 size={14} className="animate-spin" />}
                <span>{vendorData.id ? "Update Details" : "Create Profile"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
