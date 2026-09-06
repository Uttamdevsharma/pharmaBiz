"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import { CATEGORY_META, RecurringConfig } from "./ExpensesRecurringView";
import {
  Sliders,
  Building2,
  Edit2,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Search,
  Check,
  X,
  ShieldCheck,
  Layers,
  ArrowLeft,
  DollarSign,
  AlertTriangle,
  Info,
} from "lucide-react";

interface BillSettingsViewProps {
  selectedBranchId?: string;
  onNavigate?: (module: OwnerModule) => void;
}

export function BillSettingsView({ selectedBranchId, onNavigate }: BillSettingsViewProps) {
  const [bills, setBills] = useState<RecurringConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringConfig | null>(null);
  const [editFormData, setEditFormData] = useState({
    category: "SHOP_RENT" as RecurringConfig["category"],
    title: "",
    estimatedAmount: "" as number | "",
    dueDay: "" as number | "",
    notes: "",
    isActive: true,
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete Confirm Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingBill, setDeletingBill] = useState<RecurringConfig | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const loadAllBills = async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<RecurringConfig[]>(
        `/accounting/recurring-expenses?branchId=${selectedBranchId}&includeInactive=true`
      );
      if (res.success && res.data) {
        setBills(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load recurring bills");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllBills();
  }, [selectedBranchId]);

  const handleOpenEdit = (bill: RecurringConfig) => {
    setEditingBill(bill);
    setEditFormData({
      category: bill.category,
      title: bill.title,
      estimatedAmount: bill.estimatedAmount,
      dueDay: bill.dueDay ?? "",
      notes: bill.notes ?? "",
      isActive: bill.isActive,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBill) return;
    if (!editFormData.title.trim()) {
      setError("Bill title is required");
      return;
    }
    if (!editFormData.estimatedAmount || Number(editFormData.estimatedAmount) <= 0) {
      setError("Valid estimated amount is required");
      return;
    }

    try {
      setSubmittingEdit(true);
      setError(null);
      const res = await fetchApi(`/accounting/recurring-expenses/${editingBill.id}`, {
        method: "PUT",
        body: JSON.stringify({
          category: editFormData.category,
          title: editFormData.title.trim(),
          estimatedAmount: Number(editFormData.estimatedAmount),
          dueDay: editFormData.dueDay ? Number(editFormData.dueDay) : null,
          notes: editFormData.notes.trim() || null,
          isActive: editFormData.isActive,
        }),
      });

      if (res.success) {
        setSuccessMsg(`"${editFormData.title}" updated successfully! Historical payment records remain unchanged.`);
        setIsEditModalOpen(false);
        setEditingBill(null);
        loadAllBills();
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        setError(res.message || "Failed to update recurring bill");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update recurring bill");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleToggleStatus = async (bill: RecurringConfig) => {
    try {
      const updatedStatus = !bill.isActive;
      const res = await fetchApi(`/accounting/recurring-expenses/${bill.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: updatedStatus }),
      });
      if (res.success) {
        setSuccessMsg(`"${bill.title}" marked as ${updatedStatus ? "Active" : "Inactive"}.`);
        loadAllBills();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    }
  };

  const handleOpenDelete = (bill: RecurringConfig) => {
    setDeletingBill(bill);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingBill) return;
    try {
      setSubmittingDelete(true);
      setError(null);
      const res = await fetchApi(`/accounting/recurring-expenses/${deletingBill.id}`, {
        method: "DELETE",
      });

      if (res.success) {
        setSuccessMsg(`"${deletingBill.title}" removed. All past payment records remain completely preserved.`);
        setIsDeleteModalOpen(false);
        setDeletingBill(null);
        loadAllBills();
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        setError(res.message || "Failed to delete recurring bill");
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete recurring bill");
    } finally {
      setSubmittingDelete(false);
    }
  };

  const filteredBills = bills.filter((bill) => {
    const matchesSearch =
      bill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bill.notes && bill.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && bill.isActive) ||
      (statusFilter === "INACTIVE" && !bill.isActive);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bill Settings</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                View, edit, toggle, or delete recurring bills for this branch. Previous payment history is always protected.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate?.("exp_recurring")}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Recurring Bills
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Historical Guarantee Callout */}
      <div className="flex items-start gap-3 p-4 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-800 dark:text-indigo-300">
        <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Historical Data Integrity Policy:</span> Editing or deleting any recurring bill template will <span className="underline font-bold">never alter or overwrite past expense records</span>. Every historical monthly payment remains permanently archived with its original amount, date, financial account, and receipt voucher.
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search bill configurations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          {(["ALL", "ACTIVE", "INACTIVE"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === st
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {st === "ALL" ? "All Bills" : st === "ACTIVE" ? "Active Only" : "Inactive Only"}
            </button>
          ))}
        </div>
      </div>

      {/* Bill Settings Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            <p className="mt-3 text-sm text-slate-500">Loading bill settings...</p>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="p-4 bg-purple-500/10 text-purple-600 rounded-2xl mb-4">
              <Sliders className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No bill settings found</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-md">
              Create recurring bills under Recurring Bills to configure monthly expenses for this branch.
            </p>
            <button
              onClick={() => onNavigate?.("exp_recurring")}
              className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition shadow-md shadow-purple-600/20"
            >
              <Plus className="w-4 h-4" />
              Go to Recurring Bills
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Bill Name / Title</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Est. Amount</th>
                  <th className="py-3.5 px-4">Due Schedule</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Notes / Info</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredBills.map((bill) => {
                  const meta = CATEGORY_META[bill.category] || CATEGORY_META.OTHER;
                  const Icon = meta.icon;

                  return (
                    <tr
                      key={bill.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${meta.bg} ${meta.text}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          {bill.title}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${meta.bg} ${meta.text}`}>
                          {meta.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          ৳{Number(bill.estimatedAmount).toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          {bill.dueDay ? `${bill.dueDay}th of month` : "Flexible"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(bill)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                            bill.isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200"
                          }`}
                          title="Click to toggle active status"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${bill.isActive ? "bg-emerald-500" : "bg-slate-400"}`}
                          />
                          {bill.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs truncate text-xs text-slate-500">
                        {bill.notes || "—"}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(bill)}
                            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-500/10 rounded-lg transition"
                            title="Edit / Update Bill Template"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(bill)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition"
                            title="Delete Bill Template"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Edit Modal */}
      {isEditModalOpen && editingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Recurring Bill</h3>
                  <p className="text-xs text-slate-500">Past payment records will never be affected</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Category
                </label>
                <select
                  value={editFormData.category}
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  {Object.entries(CATEGORY_META).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Bill Title *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                    Estimated Amount (৳) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editFormData.estimatedAmount}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        estimatedAmount: e.target.value === "" ? "" : parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                    Due Day (1-31)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={editFormData.dueDay}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        dueDay: e.target.value === "" ? "" : parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Notes / Details
                </label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editFormData.isActive}
                  onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="editIsActive" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Active (appears in monthly expense quick picks)
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl transition shadow-md shadow-purple-600/20 disabled:opacity-50"
                >
                  {submittingEdit && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-500/10 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Recurring Bill</h3>
                <p className="text-xs text-slate-500">Confirm template removal</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">&ldquo;{deletingBill.title}&rdquo;</span>?
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs text-slate-500 space-y-1">
              <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Safety Assurance:
              </div>
              <p>
                All past payments recorded for this bill will remain permanently intact in your transaction history and monthly expense logs.
              </p>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submittingDelete}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {submittingDelete && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
