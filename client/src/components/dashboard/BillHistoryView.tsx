"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import { BillTypeConfig } from "./BillListView";
import {
  History,
  Search,
  Receipt,
  CheckCircle2,
  Loader2,
  CreditCard,
  RefreshCw,
  X,
  Calendar,
} from "lucide-react";

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

export function BillHistoryView({
  selectedBranchId,
  onNavigate,
}: BillHistoryViewProps) {
  const [expenses, setExpenses] = useState<BranchExpenseRecord[]>([]);
  const [configuredBills, setConfiguredBills] = useState<BillTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 4 Focused Filters
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [billNameFilter, setBillNameFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const loadExpensesData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const expUrl = selectedBranchId
        ? `/accounting/expenses?branchId=${selectedBranchId}&limit=500`
        : `/accounting/expenses?limit=500`;
      const billsUrl = selectedBranchId
        ? `/accounting/recurring-expenses?branchId=${selectedBranchId}&includeInactive=true`
        : `/accounting/recurring-expenses?includeInactive=true`;

      const [expRes, billsRes] = await Promise.all([
        fetchApi<any>(expUrl),
        fetchApi<any>(billsUrl),
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
      if (billsRes.success && billsRes.data) {
        const bills = Array.isArray(billsRes.data)
          ? billsRes.data
          : Array.isArray(billsRes.data?.data)
          ? billsRes.data.data
          : [];
        setConfiguredBills(bills);
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
  }, [selectedBranchId]);

  // Dynamically extract all unique bill names from configured bill types + historical expenses
  const allDynamicBillNames = Array.from(
    new Set([
      ...configuredBills.map((b) => b.title),
      ...expenses.map((e) => e.title),
    ])
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  // Precise multi-filter logic
  const filteredExpenses = expenses.filter((exp) => {
    // 1. Month Filter
    if (monthFilter && exp.expenseMonth !== monthFilter) {
      return false;
    }

    // 2. Bill Name Filter
    if (
      billNameFilter !== "ALL" &&
      exp.title.trim().toLowerCase() !== billNameFilter.trim().toLowerCase()
    ) {
      return false;
    }

    // 3. Custom Date Range Filter
    if (startDate || endDate) {
      const pDate = new Date(exp.paymentDate);
      if (startDate) {
        const sDate = new Date(startDate);
        sDate.setHours(0, 0, 0, 0);
        if (pDate < sDate) return false;
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        if (pDate > eDate) return false;
      }
    }

    // 4. Search Filter (Bill Name, Voucher/Reference, Account Name, Recorded By)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const nameMatch = exp.title.toLowerCase().includes(q);
      const refMatch =
        (exp.reference || "").toLowerCase().includes(q) ||
        (exp.voucherNo || "").toLowerCase().includes(q);
      const accMatch = (exp.financialAccount?.name || "").toLowerCase().includes(q);
      const userMatch = (exp.recordedBy?.name || exp.recordedBy?.username || "").toLowerCase().includes(q);

      if (!nameMatch && !refMatch && !accMatch && !userMatch) {
        return false;
      }
    }

    return true;
  });

  const hasActiveFilters = Boolean(
    monthFilter || billNameFilter !== "ALL" || startDate || endDate || searchQuery.trim()
  );

  const resetFilters = () => {
    setMonthFilter("");
    setBillNameFilter("ALL");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Bill History</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Complete historical record of all actual bill payments recorded for this branch.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadExpensesData(true)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            <span>Refresh</span>
          </button>

          {onNavigate && (
            <button
              onClick={() => onNavigate("exp_pay")}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>+ Pay Bill</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Filter Bar (4 Focused Filters) */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-600" /> Filter Payment History
          </span>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Filter 1: Bill Month */}
          <div>
            <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
              Bill Month
            </label>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Filter 2: Dynamic Bill Name */}
          <div>
            <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
              Bill Name / Bill Type
            </label>
            <select
              value={billNameFilter}
              onChange={(e) => setBillNameFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="ALL">All Bill Types</option>
              {allDynamicBillNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 3: Custom Date Range */}
          <div>
            <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
              Custom Date Range
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-1/2 px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold text-slate-800 dark:text-slate-200 outline-none"
              />
              <span className="text-slate-400 text-xs font-bold">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-1/2 px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold text-slate-800 dark:text-slate-200 outline-none"
              />
            </div>
          </div>

          {/* Filter 4: Search */}
          <div>
            <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
              Search Text
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search bill, voucher, account..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bill Payment History Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="text-xs font-bold">Loading payment records from database...</span>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <Receipt className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">No payment history records found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {hasActiveFilters
                ? "No bill payments match your selected filter criteria. Try clearing filters."
                : "No actual bill payments have been recorded for this branch yet."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-4">Bill Name</th>
                  <th className="py-4 px-4">Bill Month</th>
                  <th className="py-4 px-4">Paid From Account</th>
                  <th className="py-4 px-4">Payment Date</th>
                  <th className="py-4 px-4">Voucher / Reference</th>
                  <th className="py-4 px-4">Recorded By</th>
                  <th className="py-4 px-4 text-right">Actual Paid Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    {/* Bill Name */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white">{exp.title}</div>
                          <div className="text-[10px] text-slate-400">Paid Expense</div>
                        </div>
                      </div>
                    </td>

                    {/* Bill Month */}
                    <td className="py-4 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {exp.expenseMonth}
                    </td>

                    {/* Paid From Account */}
                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {exp.financialAccount?.name || "Account"}
                      </span>
                      {exp.financialAccount?.accountNumber && (
                        <span className="block text-[10px] text-slate-400 font-mono">
                          {exp.financialAccount.accountNumber}
                        </span>
                      )}
                    </td>

                    {/* Payment Date */}
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono">
                      {new Date(exp.paymentDate).toLocaleDateString([], {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* Voucher / Reference */}
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-300 font-mono">
                      {exp.voucherNo || exp.reference || "—"}
                    </td>

                    {/* Recorded By */}
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-300">
                      {exp.recordedBy?.name || exp.recordedBy?.username || "System"}
                    </td>

                    {/* Actual Paid Amount */}
                    <td className="py-4 px-4 text-right font-black font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                      ৳{Number(exp.amount || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
