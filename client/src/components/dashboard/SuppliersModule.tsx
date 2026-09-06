"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Supplier } from "@/types";
import { useAuth } from "@/context/AuthContext";
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  Receipt,
  Edit2,
  Loader2,
  AlertCircle,
  X,
  CreditCard,
  History,
  Store,
} from "lucide-react";

interface SuppliersModuleProps {
  subAction?: string;
}

export function SuppliersModule({ subAction }: SuppliersModuleProps = {}) {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || "");
  const [financialAccounts, setFinancialAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail / Ledger Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNotes, setPayNotes] = useState("");
  const [paying, setPaying] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    company: "",
    contactPerson: "",
  });

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      const res = await fetchApi(`/suppliers?${params.toString()}`);
      if (res.success && res.data) {
        setSuppliers(res.data);
      }
    } catch (err) {
      console.error("Failed to load suppliers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  // Handle subAction from sidebar
  useEffect(() => {
    if (subAction === "supplier:suppliers") {
      setDetailModalOpen(false);
      setPaymentModalOpen(false);
      setModalOpen(false);
    }
  }, [subAction]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadSuppliers();
  };

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      company: "",
      contactPerson: "",
    });
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setFormData({
      name: s.name,
      phone: s.phone,
      email: s.email || "",
      address: s.address || "",
      company: s.company || "",
      contactPerson: s.contactPerson || "",
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      if (editingSupplier) {
        const res = await fetchApi(`/suppliers/${editingSupplier.id}`, {
          method: "PATCH",
          body: JSON.stringify(formData),
        });
        if (!res.success) throw new Error(res.message || "Failed to update supplier");
      } else {
        const res = await fetchApi("/suppliers", {
          method: "POST",
          body: JSON.stringify(formData),
        });
        if (!res.success) throw new Error(res.message || "Failed to create supplier");
      }

      setModalOpen(false);
      loadSuppliers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDetails = async (supplierId: string) => {
    try {
      setDetailLoading(true);
      setDetailModalOpen(true);
      const res = await fetchApi(`/suppliers/${supplierId}`);
      if (res.success && res.data) {
        setSelectedSupplier(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch supplier details", err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetchApi<any[]>("/branches");
        if (res.success && res.data && res.data.length > 0) {
          setBranches(res.data);
          if (!selectedBranchId) {
            setSelectedBranchId(user?.branchId || res.data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load branches", err);
      }
    }
    loadBranches();
  }, [user]);

  useEffect(() => {
    async function loadAccounts() {
      if (!selectedBranchId) return;
      try {
        const res = await fetchApi<any[]>(`/accounting/accounts?branchId=${selectedBranchId}`);
        if (res.success && res.data) {
          setFinancialAccounts(res.data);
          if (res.data.length > 0) {
            setSelectedAccountId(res.data[0].id);
          } else {
            setSelectedAccountId("");
          }
        }
      } catch (err) {
        console.error("Failed to load financial accounts", err);
      }
    }
    loadAccounts();
  }, [selectedBranchId]);

  const handleOpenPayment = (s: Supplier) => {
    setSelectedSupplier(s);
    setPayAmount(Number(s.totalDue) || 0);
    setPayNotes("");
    setPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || payAmount <= 0) return;
    if (!selectedAccountId) {
      alert("A valid financial account created for the selected branch is required to record supplier payment.");
      return;
    }
    try {
      setPaying(true);
      const res = await fetchApi(`/suppliers/${selectedSupplier.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(payAmount),
          branchId: selectedBranchId,
          financialAccountId: selectedAccountId,
          notes: payNotes || "Due balance payment",
        }),
      });

      if (res.success) {
        setPaymentModalOpen(false);
        loadSuppliers();
        if (detailModalOpen && selectedSupplier) {
          handleOpenDetails(selectedSupplier.id);
        }
      } else {
        alert(res.message || "Payment recording failed");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPaying(false);
    }
  };

  // Financial summary metrics
  const totalPurchases = suppliers.reduce((acc, s) => acc + Number(s.totalPurchased || 0), 0);
  const totalPaid = suppliers.reduce((acc, s) => acc + Number(s.totalPaid || 0), 0);
  const totalDue = suppliers.reduce((acc, s) => acc + Number(s.totalDue || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="h-6 w-6 text-brand-primary" />
            Supplier & Vendor Hub
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track pharmacy medicine distributors, purchase orders, paid amounts, and outstanding payable balances.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:opacity-95 transition"
        >
          <Plus className="h-4 w-4" />
          Add New Supplier
        </button>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Purchased</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            ৳{totalPurchases.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">All inward batches recorded</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Total Settled / Paid
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ৳{totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Total payments to distributors</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Outstanding Due Balance
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
            ৳{totalDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-rose-500 mt-1">Payables pending settlement</div>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search suppliers by name, company, phone, or contact person..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-primary/20 outline-none dark:text-white"
          />
        </form>
      </div>

      {/* Supplier List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
            <p className="text-xs">Loading supplier directory...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Truck className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No suppliers registered</p>
            <p className="text-xs mt-1">Add your medicine vendors and distributors to track batch purchases.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3.5 px-4">Supplier & Company</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Total Purchases</th>
                  <th className="py-3.5 px-4">Total Paid</th>
                  <th className="py-3.5 px-4">Due Balance</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {suppliers.map((s) => {
                  const due = Number(s.totalDue || 0);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-sm shrink-0">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <button
                              onClick={() => handleOpenDetails(s.id)}
                              className="font-bold text-slate-900 dark:text-white hover:text-brand-primary transition text-left"
                            >
                              {s.name}
                            </button>
                            <div className="text-[11px] text-slate-400">
                              {s.company ? `${s.company} • ` : ""}
                              {s.contactPerson ? `Contact: ${s.contactPerson}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {s.phone}
                        </div>
                        {s.email && (
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            <Mail className="h-3 w-3" />
                            {s.email}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        ৳{Number(s.totalPurchased || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-bold">
                        ৳{Number(s.totalPaid || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-black ${
                            due > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 font-normal"
                          }`}
                        >
                          ৳{due.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {due > 0 && (
                            <button
                              onClick={() => handleOpenPayment(s)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                            >
                              <CreditCard className="h-3 w-3" />
                              Pay Due
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenDetails(s.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Purchase History & Ledger"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Edit Supplier"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT SUPPLIER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Truck className="h-5 w-5 text-brand-primary" />
                  {editingSupplier ? "Edit Supplier Profile" : "Register New Supplier"}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Company / Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Square Pharmaceuticals Ltd, Beximco Pharma, Incepta"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-primary/20 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Representative
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Md. Karim (Sales Rep / SR)"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 01711223344"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. orders@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Warehouse / Office Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tejgaon Industrial Area, Dhaka"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-brand-primary text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingSupplier ? "Save Changes" : "Register Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPPLIER PROFILE & PURCHASE HISTORY MODAL */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-brand-primary" />
                  Supplier Ledger & Purchase History
                </h3>
              </div>
              <button onClick={() => setDetailModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
                <p className="text-xs">Loading ledger history...</p>
              </div>
            ) : selectedSupplier ? (
              <div className="mt-4 space-y-6">
                {/* Profile Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-6 justify-between items-center">
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-base">{selectedSupplier.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedSupplier.company} • {selectedSupplier.phone} • {selectedSupplier.address || "—"}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Total Purchased</div>
                      <div className="font-black text-sm text-slate-900 dark:text-white">
                        ৳{Number(selectedSupplier.totalPurchased || 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-emerald-600 font-bold uppercase">Total Settled</div>
                      <div className="font-black text-sm text-emerald-600">
                        ৳{Number(selectedSupplier.totalPaid || 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-rose-600 font-bold uppercase">Current Due</div>
                      <div className="font-black text-sm text-rose-600">
                        ৳{Number(selectedSupplier.totalDue || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Purchases Table */}
                <div>
                  <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-slate-400" />
                    Inward Purchase Orders & Batch Receipts
                  </h5>
                  {(!selectedSupplier.purchases || selectedSupplier.purchases.length === 0) ? (
                    <p className="text-xs text-slate-400 italic">No purchase history recorded for this supplier.</p>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-[10px] font-bold uppercase">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Invoice #</th>
                            <th className="py-2.5 px-3">Branch</th>
                            <th className="py-2.5 px-3">Items Supplied</th>
                            <th className="py-2.5 px-3">Total Amount</th>
                            <th className="py-2.5 px-3">Paid / Due</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {selectedSupplier.purchases.map((p: any) => (
                            <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="py-2.5 px-3">{new Date(p.purchaseDate).toLocaleDateString()}</td>
                              <td className="py-2.5 px-3 font-mono font-bold">{p.invoiceNo}</td>
                              <td className="py-2.5 px-3">{p.branch?.name || "—"}</td>
                              <td className="py-2.5 px-3">
                                {p.items?.map((item: any) => item.product?.name).join(", ") || "—"}
                              </td>
                              <td className="py-2.5 px-3 font-bold">৳{Number(p.totalAmount).toFixed(2)}</td>
                              <td className="py-2.5 px-3">
                                <div>Paid: ৳{Number(p.paidAmount).toFixed(2)}</div>
                                <div className="text-[10px] text-rose-500 font-bold">
                                  Due: ৳{Number(p.dueAmount).toFixed(2)}
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                    p.paymentStatus === "PAID"
                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40"
                                      : p.paymentStatus === "PARTIAL"
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-rose-50 text-rose-700"
                                  }`}
                                >
                                  {p.paymentStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* RECORD SUPPLIER PAYMENT MODAL */}
      {paymentModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-rose-600" />
                Settle Supplier Due Balance
              </h3>
              <button onClick={() => setPaymentModalOpen(false)} className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="mt-4 space-y-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900">
                <div className="text-xs text-rose-700 dark:text-rose-300 font-bold">
                  Paying to: {selectedSupplier.name}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Outstanding Payable Due:{" "}
                  <span className="font-bold text-rose-600">৳{Number(selectedSupplier.totalDue).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Paying Branch *
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Payment Account (Debited) *
                </label>
                {financialAccounts.length === 0 ? (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-bold">
                    ⚠️ No active financial account created for this branch. Please create an account in Accounts & Finance first.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    {financialAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type}){acc.accountNumber ? ` - A/C: ${acc.accountNumber}` : ""} [Balance: ৳{Number(acc.balance).toFixed(2)}]
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount ৳ *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Note / Bank Voucher #
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bank Transfer Ref #12345"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying || payAmount <= 0 || financialAccounts.length === 0 || !selectedAccountId}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  {paying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
