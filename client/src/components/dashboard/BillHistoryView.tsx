"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import { Pagination } from "@/components/common/Pagination";
import {
  History,
  Search,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CreditCard,
  RefreshCw,
  X,
  Calendar,
  Edit2,
  Trash2,
  ArrowUpDown,
  Building2,
  Smartphone,
  Banknote,
} from "lucide-react";

export type DatePreset = "TODAY" | "YESTERDAY" | "THIS_MONTH" | "THIS_YEAR" | "ALL" | "CUSTOM";

interface FinancialAccountOption {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface BranchExpenseRecord {
  id: string;
  tenantId: string;
  branchId: string;
  financialAccountId: string;
  recurringConfigId?: string | null;
  category?: string;
  title: string;
  expenseMonth: string;
  amount: number;
  paymentDate: string;
  voucherNo?: string | null;
  reference?: string | null;
  notes?: string | null;
  financialAccount?: {
    id: string;
    name: string;
    type: string;
    accountNumber?: string | null;
    bankName?: string | null;
  };
  recordedBy?: {
    id: string;
    name: string;
    username: string;
  };
  createdAt: string;
}

interface BillHistoryViewProps {
  selectedBranchId?: string;
  onNavigate?: (module: OwnerModule) => void;
}

function HistorySkeleton() {
  return (
    <div className="space-y-4 w-full mx-auto animate-pulse">
      <div className="h-10 bg-slate-200 dark:bg-slate-800 w-1/3 rounded-none" />
      <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-none border border-slate-200 dark:border-slate-800" />
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-none overflow-hidden">
        <div className="h-11 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800" />
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 flex items-center px-4 gap-6">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 w-8" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 w-32" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 flex-1" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 w-28" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BillHistoryView({
  selectedBranchId,
  onNavigate,
}: BillHistoryViewProps) {
  const [expenses, setExpenses] = useState<BranchExpenseRecord[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [datePreset, setDatePreset] = useState<DatePreset>("THIS_MONTH");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Edit Expense Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<BranchExpenseRecord | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState<string>("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editVoucher, setEditVoucher] = useState("");
  const [editPaymentDate, setEditPaymentDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editing, setEditing] = useState(false);

  // Delete Expense Modal State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<BranchExpenseRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Compute date range
  const computeDateRange = useCallback((preset: DatePreset) => {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().split("T")[0];

    if (preset === "TODAY") {
      return { start: fmt(now), end: fmt(now) };
    }
    if (preset === "YESTERDAY") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { start: fmt(y), end: fmt(y) };
    }
    if (preset === "THIS_MONTH") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: fmt(first), end: fmt(last) };
    }
    if (preset === "THIS_YEAR") {
      const first = new Date(now.getFullYear(), 0, 1);
      const last = new Date(now.getFullYear(), 11, 31);
      return { start: fmt(first), end: fmt(last) };
    }
    if (preset === "CUSTOM") {
      return { start: startDate, end: endDate };
    }
    return { start: "", end: "" };
  }, [startDate, endDate]);

  const loadExpensesData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const { start, end } = computeDateRange(datePreset);
      const params = new URLSearchParams();
      params.append("limit", "500");
      if (selectedBranchId) params.append("branchId", selectedBranchId);
      if (start) params.append("startDate", start);
      if (end) params.append("endDate", end);

      const [expRes, accRes] = await Promise.all([
        fetchApi<any>(`/accounting/expenses?${params.toString()}`),
        selectedBranchId
          ? fetchApi<FinancialAccountOption[]>(`/accounting/accounts?branchId=${selectedBranchId}`)
          : Promise.resolve({ success: true, data: [] }),
      ]);

      if (expRes.success && expRes.data) {
        const items = Array.isArray(expRes.data)
          ? expRes.data
          : Array.isArray(expRes.data?.items)
          ? expRes.data.items
          : Array.isArray(expRes.data?.data)
          ? expRes.data.data
          : [];
        setExpenses(items);
      }

      if (accRes.success && accRes.data) {
        setAccounts(accRes.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load bill history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadExpensesData();
  }, [selectedBranchId, datePreset, startDate, endDate]);

  // Client search filter
  const filteredExpenses = useMemo(() => {
    if (!search.trim()) return expenses;
    const q = search.toLowerCase().trim();
    return expenses.filter((e) => {
      const titleMatch = (e.title || "").toLowerCase().includes(q);
      const accMatch = (e.financialAccount?.name || "").toLowerCase().includes(q);
      const refMatch = (e.voucherNo || e.reference || "").toLowerCase().includes(q);
      const notesMatch = (e.notes || "").toLowerCase().includes(q);
      return titleMatch || accMatch || refMatch || notesMatch;
    });
  }, [expenses, search]);

  useEffect(() => {
    setPage(1);
  }, [search, datePreset, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
  const paginatedExpenses = filteredExpenses.slice((page - 1) * pageSize, page * pageSize);

  const totalSpent = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [filteredExpenses]);

  // Edit Handlers
  const handleOpenEdit = (exp: BranchExpenseRecord) => {
    setEditingExpense(exp);
    setEditTitle(exp.title);
    setEditAmount(String(exp.amount));
    setEditAccountId(exp.financialAccountId);
    setEditVoucher(exp.voucherNo || exp.reference || "");
    setEditPaymentDate(exp.paymentDate ? exp.paymentDate.split("T")[0] : "");
    setEditNotes(exp.notes || "");
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    const numAmount = Number(editAmount);
    if (!editTitle.trim()) {
      setError("Bill title is required");
      return;
    }
    if (!editAmount || numAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      setEditing(true);
      setError(null);
      const res = await fetchApi(`/accounting/expenses/${editingExpense.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editTitle.trim(),
          amount: numAmount,
          financialAccountId: editAccountId || editingExpense.financialAccountId,
          voucherNo: editVoucher.trim() || null,
          reference: editVoucher.trim() || null,
          notes: editNotes.trim() || null,
          paymentDate: editPaymentDate || undefined,
        }),
      });

      if (res.success) {
        setSuccessMsg(`Bill payment for "${editTitle}" updated successfully.`);
        setIsEditOpen(false);
        setEditingExpense(null);
        loadExpensesData(true);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(res.message || "Failed to update bill payment");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update bill payment");
    } finally {
      setEditing(false);
    }
  };

  // Delete Handlers
  const handleOpenDelete = (exp: BranchExpenseRecord) => {
    setDeletingExpense(exp);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingExpense) return;
    try {
      setDeleting(true);
      setError(null);
      const res = await fetchApi(`/accounting/expenses/${deletingExpense.id}`, {
        method: "DELETE",
      });

      if (res.success) {
        setSuccessMsg(
          `Bill payment for "${deletingExpense.title}" deleted. ৳${Number(deletingExpense.amount).toLocaleString()} refunded to account balance.`
        );
        setIsDeleteOpen(false);
        setDeletingExpense(null);
        loadExpensesData(true);
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setError(res.message || "Failed to delete bill payment");
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete bill payment");
    } finally {
      setDeleting(false);
    }
  };

  if (loading && expenses.length === 0) {
    return <HistorySkeleton />;
  }

  return (
    <div className="space-y-4 w-full mx-auto">
      {/* Top Header - Compact Typography */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="h-5 w-5 text-brand-primary" />
            Bill History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit log of all paid pharmacy bills and account deductions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate("exp_pay")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-brand-primary bg-brand-primary text-white text-xs sm:text-sm font-semibold hover:opacity-90 transition rounded-none cursor-pointer"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Pay Bill
            </button>
          )}

          <button
            onClick={() => loadExpensesData(true)}
            disabled={refreshing}
            className="p-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none disabled:opacity-50 cursor-pointer"
            title="Refresh History"
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

      {/* Filter Bar - Exact standard of FundTransferHistoryView */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 rounded-none space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search bill name or account..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm outline-none focus:border-brand-primary dark:text-white"
            />
          </div>

          {/* Date Range Presets */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Period:
            </span>
            {(
              [
                { id: "TODAY", label: "Today" },
                { id: "YESTERDAY", label: "Yesterday" },
                { id: "THIS_MONTH", label: "This Month" },
                { id: "THIS_YEAR", label: "This Year" },
                { id: "ALL", label: "All" },
                { id: "CUSTOM", label: "Custom" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setDatePreset(p.id);
                  setPage(1);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-none border transition cursor-pointer ${
                  datePreset === p.id
                    ? "bg-brand-primary text-white border-brand-primary"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Pickers */}
        {datePreset === "CUSTOM" && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs outline-none focus:border-brand-primary dark:text-white"
            />
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs outline-none focus:border-brand-primary dark:text-white"
            />
          </div>
        )}

        {/* Count & Spent Summary Note */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div>
            Total Paid Bills: <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredExpenses.length}</span>
          </div>
          <div>
            Total Disbursed:{" "}
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              ৳{totalSpent.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Main Table - Exact Product List & Fund Transfer Standard */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-xs sm:text-sm">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-brand-primary" />
            Loading bill history...
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs sm:text-sm space-y-2">
            <div>No bill payment records found for the selected period.</div>
            {onNavigate && (
              <button
                onClick={() => onNavigate("exp_pay")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white text-xs font-semibold rounded-none cursor-pointer"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Pay First Bill
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/75 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">SL</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Bill Name</th>
                  <th className="py-3 px-4">Paid From Account</th>
                  <th className="py-3 px-4 text-right">Amount (৳)</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
                {paginatedExpenses.map((exp, index) => {
                  const sl = (page - 1) * pageSize + index + 1;
                  return (
                    <tr
                      key={exp.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-center text-xs text-slate-400">
                        {sl}
                      </td>

                      <td className="py-3 px-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono">
                        {new Date(exp.paymentDate || exp.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {exp.title}
                        {exp.expenseMonth && (
                          <span className="block text-[11px] font-mono text-slate-400">
                            Month: {exp.expenseMonth}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {exp.financialAccount?.name || "Account"}
                        </span>
                        {exp.financialAccount?.accountNumber && (
                          <span className="block text-[11px] font-mono text-slate-400">
                            {exp.financialAccount.accountNumber}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ৳{Number(exp.amount || 0).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(exp)}
                            className="p-1 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-brand-primary hover:border-brand-primary transition rounded-none cursor-pointer"
                            title="Edit payment"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDelete(exp)}
                            className="p-1 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:border-rose-500 transition rounded-none cursor-pointer"
                            title="Delete payment"
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
          totalItems={filteredExpenses.length}
          pageSize={pageSize}
          onPageChange={setPage}
          alwaysShow={true}
          rounded="none"
        />
      </div>

      {/* Edit Payment Modal */}
      {isEditOpen && editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-brand-primary" />
                Edit Bill Payment Record
              </h2>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Bill Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-medium outline-none focus:border-brand-primary dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Amount (৳) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-bold font-mono outline-none focus:border-brand-primary dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Payment Account
                  </label>
                  <select
                    value={editAccountId}
                    onChange={(e) => setEditAccountId(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-medium outline-none focus:border-brand-primary dark:text-white"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Voucher / Slip No.
                  </label>
                  <input
                    type="text"
                    value={editVoucher}
                    onChange={(e) => setEditVoucher(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-medium outline-none focus:border-brand-primary dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={editPaymentDate}
                    onChange={(e) => setEditPaymentDate(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-medium outline-none focus:border-brand-primary dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
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
      {isDeleteOpen && deletingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <Trash2 className="h-5 w-5" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Delete Bill Payment</h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to delete payment record for <span className="font-bold text-slate-900 dark:text-white">"{deletingExpense.title}"</span> of <span className="font-mono font-bold text-slate-900 dark:text-white">৳{Number(deletingExpense.amount).toLocaleString()}</span>?
            </p>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
              <strong>Account Refund:</strong> This ৳{Number(deletingExpense.amount).toLocaleString()} will be automatically refunded back to the account balance.
            </div>

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
                <span>Delete & Refund</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
