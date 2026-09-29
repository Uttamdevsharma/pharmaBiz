"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import { Pagination } from "@/components/common/Pagination";
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
  RefreshCw,
  X,
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

interface BillListViewProps {
  selectedBranchId?: string;
  onNavigate?: (module: OwnerModule) => void;
  onSelectForPayment?: (bill: BillTypeConfig) => void;
}

function BillListSkeleton() {
  return (
    <div className="space-y-4 w-full mx-auto animate-pulse">
      <div className="h-10 bg-slate-200 dark:bg-slate-800 w-1/3 rounded-none" />
      <div className="h-14 bg-slate-100 dark:bg-slate-800/60 rounded-none border border-slate-200 dark:border-slate-800" />
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-none overflow-hidden">
        <div className="h-11 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800" />
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 flex items-center px-4 gap-6">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 w-8" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 flex-1" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BillListView({
  selectedBranchId,
  onNavigate,
  onSelectForPayment,
}: BillListViewProps) {
  const [bills, setBills] = useState<BillTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<BillTypeConfig | null>(null);
  const [editBillName, setEditBillName] = useState("");
  const [editing, setEditing] = useState(false);

  // Delete Modal State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingBill, setDeletingBill] = useState<BillTypeConfig | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadBillTypes = async (isManual = false) => {
    if (!selectedBranchId) return;
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
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
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBillTypes();
  }, [selectedBranchId]);

  const handleOpenEdit = (bill: BillTypeConfig) => {
    setEditingBill(bill);
    setEditBillName(bill.title);
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
        }),
      });

      if (res.success) {
        setSuccessMsg(`Bill name updated to "${nameToSave}"`);
        setIsEditOpen(false);
        setEditingBill(null);
        loadBillTypes(true);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(res.message || "Failed to update bill");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update bill");
    } finally {
      setEditing(false);
    }
  };

  const handleOpenDelete = (bill: BillTypeConfig) => {
    setDeletingBill(bill);
    setIsDeleteOpen(true);
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
        setSuccessMsg(`"${deletingBill.title}" removed successfully.`);
        setIsDeleteOpen(false);
        setDeletingBill(null);
        loadBillTypes(true);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(res.message || "Failed to delete bill");
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete bill");
    } finally {
      setDeleting(false);
    }
  };

  const filteredBills = useMemo(() => {
    if (!searchQuery.trim()) return bills;
    const q = searchQuery.toLowerCase().trim();
    return bills.filter((b) => b.title.toLowerCase().includes(q));
  }, [bills, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredBills.length / pageSize));
  const paginatedBills = filteredBills.slice((page - 1) * pageSize, page * pageSize);

  if (loading && bills.length === 0) {
    return <BillListSkeleton />;
  }

  return (
    <div className="space-y-4 w-full mx-auto">
      {/* Header - Short, clear, no huge descriptions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <List className="h-5 w-5 text-brand-primary" />
            Bill List
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage created bill types for pharmacy expenses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate("exp_create")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-brand-primary bg-brand-primary text-white text-xs sm:text-sm font-semibold hover:opacity-90 transition rounded-none cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Bill
            </button>
          )}

          {onNavigate && (
            <button
              onClick={() => onNavigate("exp_pay")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none cursor-pointer"
            >
              <CreditCard className="h-3.5 w-3.5 text-brand-primary" />
              Pay Bill
            </button>
          )}

          <button
            onClick={() => loadBillTypes(true)}
            disabled={refreshing}
            className="p-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none disabled:opacity-50 cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-brand-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-medium flex items-center gap-2 rounded-none">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-medium flex items-center gap-2 rounded-none">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search & Counter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 rounded-none space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search bill name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm outline-none focus:border-brand-primary dark:text-white"
            />
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total Bills: <span className="font-bold text-slate-800 dark:text-slate-200">{filteredBills.length}</span>
          </div>
        </div>
      </div>

      {/* Table Section - Strictly 2 Columns (Name & Action) plus SL */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-xs sm:text-sm">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-brand-primary" />
            Loading bills...
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs sm:text-sm space-y-2">
            <div>No bills found.</div>
            {onNavigate && (
              <button
                onClick={() => onNavigate("exp_create")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white text-xs font-semibold rounded-none cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Create First Bill
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/75 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">SL</th>
                  <th className="py-3 px-4">Bill Name</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
                {paginatedBills.map((bill, index) => {
                  const sl = (page - 1) * pageSize + index + 1;
                  return (
                    <tr
                      key={bill.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-center text-xs text-slate-400">
                        {sl}
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {bill.title}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {onSelectForPayment && (
                            <button
                              type="button"
                              onClick={() => onSelectForPayment(bill)}
                              className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition rounded-none cursor-pointer"
                              title="Pay this bill"
                            >
                              Pay
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(bill)}
                            className="p-1 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-brand-primary hover:border-brand-primary transition rounded-none cursor-pointer"
                            title="Edit bill name"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDelete(bill)}
                            className="p-1 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:border-rose-500 transition rounded-none cursor-pointer"
                            title="Delete bill"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filteredBills.length}
          pageSize={pageSize}
          onPageChange={setPage}
          alwaysShow={true}
          rounded="none"
        />
      </div>

      {/* Edit Modal */}
      {isEditOpen && editingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-brand-primary" />
                Edit Bill Name
              </h2>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Bill Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editBillName}
                  onChange={(e) => setEditBillName(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-medium outline-none focus:border-brand-primary dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  disabled={editing}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 rounded-none hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="px-4 py-1.5 bg-brand-primary text-white text-xs sm:text-sm font-bold rounded-none hover:opacity-90 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {editing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && deletingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <Trash2 className="h-5 w-5" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Delete Bill</h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">"{deletingBill.title}"</span>? Past payment records will remain safe in Bill History.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                disabled={deleting}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 rounded-none hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-1.5 bg-rose-600 text-white text-xs sm:text-sm font-bold rounded-none hover:bg-rose-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
