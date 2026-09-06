"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import {
  List,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  CreditCard,
  Sparkles,
  Check,
  X,
  ShieldAlert,
  Tag,
} from "lucide-react";

export interface BillTypeConfig {
  id: string;
  branchId: string;
  category?: string;
  title: string;
  notes?: string | null;
  isActive: boolean;
  branch?: { id: string; name: string };
  createdAt?: string;
}

const COMMON_BILL_SUGGESTIONS = [
  "Electricity Bill",
  "Shop Rent",
  "Internet",
  "Guard Salary",
  "Generator Fuel",
  "Maintenance",
  "Water Bill",
  "Trash & Cleaning",
  "Software Subscription",
];

interface BillListViewProps {
  selectedBranchId?: string;
  onNavigate?: (module: OwnerModule) => void;
  onSelectForPayment?: (bill: BillTypeConfig) => void;
}

export function BillListView({
  selectedBranchId,
  onNavigate,
  onSelectForPayment,
}: BillListViewProps) {
  const [bills, setBills] = useState<BillTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Bill Name input state for new bill creation
  const [newBillName, setNewBillName] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<BillTypeConfig | null>(null);
  const [editBillName, setEditBillName] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editing, setEditing] = useState(false);

  // Delete Modal State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingBill, setDeletingBill] = useState<BillTypeConfig | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadBillTypes = async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<BillTypeConfig[]>(
        `/accounting/recurring-expenses?branchId=${selectedBranchId}&includeInactive=true`
      );
      if (res.success && res.data) {
        setBills(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load bill list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillTypes();
  }, [selectedBranchId]);

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameToSave = newBillName.trim();
    if (!selectedBranchId) {
      setError("Please select a branch first");
      return;
    }
    if (!nameToSave) {
      setError("Please enter a bill name");
      return;
    }

    try {
      setCreating(true);
      setError(null);
      const res = await fetchApi<BillTypeConfig>("/accounting/recurring-expenses", {
        method: "POST",
        body: JSON.stringify({
          branchId: selectedBranchId,
          category: "OTHER",
          title: nameToSave,
        }),
      });

      if (res.success) {
        setSuccessMsg(`Bill type "${nameToSave}" created successfully!`);
        setNewBillName("");
        loadBillTypes();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setError(res.message || "Failed to create bill type");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create bill type");
    } finally {
      setCreating(false);
    }
  };

  const handleAddSuggestion = (name: string) => {
    setNewBillName(name);
  };

  const handleOpenEdit = (bill: BillTypeConfig) => {
    setEditingBill(bill);
    setEditBillName(bill.title);
    setEditIsActive(bill.isActive);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBill) return;
    const nameToSave = editBillName.trim();
    if (!nameToSave) {
      setError("Bill name is required");
      return;
    }

    try {
      setEditing(true);
      setError(null);
      const res = await fetchApi(`/accounting/recurring-expenses/${editingBill.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: nameToSave,
          isActive: editIsActive,
        }),
      });

      if (res.success) {
        setSuccessMsg(`Bill updated to "${nameToSave}"!`);
        setIsEditOpen(false);
        setEditingBill(null);
        loadBillTypes();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setError(res.message || "Failed to update bill type");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update bill type");
    } finally {
      setEditing(false);
    }
  };

  const handleToggleActive = async (bill: BillTypeConfig) => {
    try {
      const nextState = !bill.isActive;
      const res = await fetchApi(`/accounting/recurring-expenses/${bill.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: nextState }),
      });
      if (res.success) {
        setSuccessMsg(`"${bill.title}" marked as ${nextState ? "Active" : "Inactive"}.`);
        loadBillTypes();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingBill) return;
    try {
      setDeleting(true);
      setError(null);
      const res = await fetchApi(`/accounting/recurring-expenses/${deletingBill.id}`, {
        method: "DELETE",
      });

      if (res.success) {
        setSuccessMsg(`"${deletingBill.title}" removed. All past payment records remain intact.`);
        setIsDeleteOpen(false);
        setDeletingBill(null);
        loadBillTypes();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setError(res.message || "Failed to delete bill type");
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete bill type");
    } finally {
      setDeleting(false);
    }
  };

  const filteredBills = bills.filter((b) => {
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && b.isActive) ||
      (statusFilter === "INACTIVE" && !b.isActive);
    return matchesSearch && matchesStatus;
  });

  const existingTitles = new Set(bills.map((b) => b.title.toLowerCase()));

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <List className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Bill List</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Create and manage dynamic bill/expense types for your branch.
            </p>
          </div>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate("exp_pay")}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Go to Pay Bill</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400 text-xs font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* ULTRA SIMPLE CREATE BILL FORM */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" />
            Add New Bill Type
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Type any bill or expense name (e.g., Shop Rent, Electricity Bill, Internet, Guard Salary, Generator Fuel).
          </p>
        </div>

        <form onSubmit={handleCreateBill} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Tag className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              placeholder="Enter Bill Name (e.g. Electricity Bill, Generator Fuel, Shop Rent...)"
              value={newBillName}
              onChange={(e) => setNewBillName(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={creating || !newBillName.trim()}
            className="w-full sm:w-auto px-7 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>Save Bill</span>
          </button>
        </form>

        {/* Quick Suggestion Pills */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>Suggested Bill Names:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {COMMON_BILL_SUGGESTIONS.map((name) => {
              const exists = existingTitles.has(name.toLowerCase());
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleAddSuggestion(name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                    exists
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent"
                      : "bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <span>{name}</span>
                  {exists && <Check className="w-3 h-3 text-emerald-500" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search configured bills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          {(["ALL", "ACTIVE", "INACTIVE"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === st
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              {st === "ALL" ? "All Bills" : st === "ACTIVE" ? "Active Only" : "Inactive Only"}
            </button>
          ))}
        </div>
      </div>

      {/* Bill List Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-xs font-bold">Loading branch bill types...</span>
        </div>
      ) : filteredBills.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-16 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <List className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">No bill types created yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Enter a Bill Name above (e.g. Electricity Bill, Shop Rent) and click Save Bill.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBills.map((bill) => (
            <div
              key={bill.id}
              className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border transition shadow-2xs flex flex-col justify-between space-y-4 ${
                bill.isActive
                  ? "border-slate-200 dark:border-slate-800 hover:border-emerald-500/50"
                  : "border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50/50 dark:bg-slate-900/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-white">{bill.title}</h4>
                    <span className="text-[10px] text-slate-400 font-medium">Branch Bill Type</span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleActive(bill)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition cursor-pointer ${
                    bill.isActive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200"
                  }`}
                  title="Click to toggle active state"
                >
                  {bill.isActive ? "Active" : "Inactive"}
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(bill)}
                    className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition cursor-pointer"
                    title="Edit Bill Name"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDeletingBill(bill);
                      setIsDeleteOpen(true);
                    }}
                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                    title="Delete Bill Type"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {onSelectForPayment && bill.isActive && (
                  <button
                    onClick={() => onSelectForPayment(bill)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition shadow-2xs cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay Bill</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal (Bill Name Only) */}
      {isEditOpen && editingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Edit Bill Name</h3>
                  <p className="text-xs text-slate-400">Past payment records remain unaffected</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Bill Name *
                </label>
                <input
                  type="text"
                  required
                  value={editBillName}
                  onChange={(e) => setEditBillName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="editIsActive" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Active (appears in Pay Bill dropdown)
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editing || !editBillName.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {editing && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && deletingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-500/10 rounded-2xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Delete Bill Type</h3>
                <p className="text-xs text-slate-400">Confirm bill removal</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-white">&ldquo;{deletingBill.title}&rdquo;</strong>?
            </p>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl text-[11px] text-slate-500 space-y-1">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
                Historical Guarantee:
              </span>
              <span>
                All past payments recorded for this bill will remain permanently intact in your Bill History and accounting ledgers.
              </span>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete Bill Type
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
