"use client";

import React, { useEffect, useState } from "react";
import {
  Building2, Plus, Search, RefreshCw,
  Edit2, Trash2, Loader2, Landmark
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { API_BASE_URL, apiFetch } from "@/lib/api";

interface Client {
  id: string;
  clientName: string;
  contactPerson?: string;
  contact?: string;
  email?: string;
  paymentTerms?: string;
}

interface PaymentOption {
  value: string;
  label: string;
}

export default function ClientsPage() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([]);

  // Dialog States
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [clientData, setClientData] = useState({
    id: "",
    clientName: "",
    contactPerson: "",
    contact: "",
    email: "",
    paymentTerms: "",
  });

  // Fetch clients
  const loadClients = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/clients`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setClients(data.clients || []);
          setPaymentOptions(data.paymentTermsOptions || []);
        }
      }
    } catch (err) {
      console.error("Error loading clients", err);
      toast.error("Failed to load clients list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Standard fetch-on-mount pattern: loadClients's own setState calls are
    // flagged by this rule as if the effect itself sets state, but fetching
    // data on mount is exactly React's documented "synchronize with an
    // external system" use case, not the render-derived-value anti-pattern
    // this rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadClients();
  }, []);

  const openAddModal = () => {
    setClientData({
      id: "",
      clientName: "",
      contactPerson: "",
      contact: "",
      email: "",
      paymentTerms: "",
    });
    setClientModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setClientData({
      id: client.id,
      clientName: client.clientName || "",
      contactPerson: client.contactPerson || "",
      contact: client.contact || "",
      email: client.email || "",
      paymentTerms: client.paymentTerms || "",
    });
    setClientModalOpen(true);
  };

  const handleSaveClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientData.clientName || !clientData.contactPerson || !clientData.contact || !clientData.email || !clientData.paymentTerms) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSavingClient(true);
    try {
      const isUpdate = Boolean(clientData.id);
      const res = await apiFetch(
        isUpdate ? `${API_BASE_URL}/api/clients/${clientData.id}` : `${API_BASE_URL}/api/clients`,
        {
          method: isUpdate ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clientData),
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || "Client details saved successfully");
          setClientModalOpen(false);
          loadClients();
        } else {
          toast.error(data.message || "Failed to save client details");
        }
      }
    } catch (err) {
      console.error("Error saving client details", err);
      toast.error("Error connecting to server to save client details");
    } finally {
      setSavingClient(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/clients/${id}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || "Client deleted successfully");
          loadClients();
        } else {
          toast.error(data.error || "Failed to delete client");
        }
      }
    } catch (err) {
      console.error("Error deleting client", err);
      toast.error("Failed to delete client");
    }
  };

  // Filter clients client-side
  const filteredClients = clients.filter(c => 
    c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.contactPerson && c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* 1. Header Band */}
      <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-zinc-500" />
            Clients Management
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure client properties, points of contacts, invoicing terms, and manage accounts.
          </p>
        </div>
        <Button
          onClick={openAddModal}
          size="sm"
          className="flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={15} />
          <span>Add Client</span>
        </Button>
      </div>

      {/* 2. Filter Search Card */}
      <Card className="border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
        <CardContent className="pt-4 pb-4 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search clients by name, contact person, or email..."
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
              <span className="text-sm font-medium text-zinc-500">Querying client directories...</span>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
              <span className="text-sm font-bold text-zinc-600">No Clients Found</span>
              <span className="text-xs text-zinc-400">Try modifying search term or register a new client.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border-collapse">
                <TableHeader className="bg-zinc-50/70 dark:bg-zinc-900">
                  <TableRow className="border-b border-zinc-200">
                    <TableHead className="font-semibold text-zinc-600 h-10 w-12 text-center">SN</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">Client Name</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">Email Address</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">Contact Person</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">Contact Number</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10">Payment Terms</TableHead>
                    <TableHead className="font-semibold text-zinc-600 h-10 w-24 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((c, idx) => {
                    const paymentLabel = paymentOptions.find(opt => opt.value === String(c.paymentTerms))?.label || `${c.paymentTerms || "15"} Days`;
                    return (
                      <TableRow key={c.id} className="border-b border-zinc-150 hover:bg-zinc-50/50 transition-colors">
                        <TableCell className="text-center font-medium text-zinc-400 py-3.5">{idx + 1}</TableCell>
                        <TableCell className="font-bold text-zinc-900 dark:text-zinc-100">{c.clientName}</TableCell>
                        <TableCell className="text-zinc-600 font-medium">{c.email || "NA"}</TableCell>
                        <TableCell className="text-zinc-700 dark:text-zinc-300 font-medium">{c.contactPerson || "NA"}</TableCell>
                        <TableCell className="text-zinc-500 font-mono text-xs">{c.contact || "NA"}</TableCell>
                        <TableCell className="text-zinc-700 dark:text-zinc-300 font-medium">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/20 dark:text-cyan-400">
                            {paymentLabel}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              onClick={() => openEditModal(c)}
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                              title="Edit client details"
                            >
                              <Edit2 size={14} />
                            </Button>

                            <Button
                              onClick={() => handleDeleteClient(c.id)}
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                              title="Remove client profile"
                            >
                              <Trash2 size={14} />
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

      {/* 4. Add / Update Client Dialog Modal */}
      <Dialog open={clientModalOpen} onOpenChange={setClientModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSaveClientSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                <Landmark className="h-5 w-5 text-zinc-500" />
                {clientData.id ? "Update Client details" : "Add Client profile"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="clientNameInput" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  Client Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="clientNameInput"
                  placeholder="Company Name"
                  value={clientData.clientName}
                  onChange={(e) => setClientData({ ...clientData, clientName: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="clientContactPersonInput" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  Contact Person <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="clientContactPersonInput"
                  placeholder="Primary contact full name"
                  value={clientData.contactPerson}
                  onChange={(e) => setClientData({ ...clientData, contactPerson: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="clientContactInput" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  Contact Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="clientContactInput"
                  placeholder="Phone number"
                  value={clientData.contact}
                  onChange={(e) => setClientData({ ...clientData, contact: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="clientEmailInput" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="clientEmailInput"
                  type="email"
                  placeholder="billing@company.com"
                  value={clientData.email}
                  onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="clientPaymentTermsSelect" className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  Payment Terms <span className="text-red-500">*</span>
                </Label>
                <NativeSelect
                  id="clientPaymentTermsSelect"
                  value={clientData.paymentTerms}
                  onChange={(e) => setClientData({ ...clientData, paymentTerms: e.target.value })}
                  required
                >
                  <option value="">Select Invoicing Term</option>
                  {paymentOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setClientModalOpen(false)}
                disabled={savingClient}
                size="sm"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingClient} size="sm" className="flex items-center gap-1.5">
                {savingClient && <Loader2 size={14} className="animate-spin" />}
                <span>{clientData.id ? "Update Details" : "Create Profile"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
