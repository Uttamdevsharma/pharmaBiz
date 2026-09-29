"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import {
  History,
  ArrowLeftRight,
  Wallet,
  Calendar,
  Search,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface FinancialTransaction {
  id: string;
  type: string;
  amount: number;
  reference?: string | null;
  note?: string | null;
  createdAt: string;
  sourceAccount?: {
    id: string;
    name: string;
    type: string;
  } | null;
  destinationAccount?: {
    id: string;
    name: string;
    type: string;
  } | null;
  user?: {
    id: string;
    name?: string | null;
    username?: string | null;
  } | null;
}

interface FundTransferHistoryViewProps {
  onNavigate?: (module: OwnerModule) => void;
}

type DatePreset = "ALL" | "TODAY" | "YESTERDAY" | "THIS_MONTH" | "THIS_YEAR" | "CUSTOM";

function HistorySkeleton() {
  return (
    <div className="space-y-4 w-full animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="h-7 w-48 bg-slate-200 dark:bg-slate-800 rounded-none" />
        <div className="flex gap-2">
          <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 rounded-none" />
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-none" />
        </div>
      </div>

      {/* Filter Bar Skeleton */}
      <div className="h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none" />

      {/* Table Skeleton */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-none space-y-2">
        <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-none" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-11 bg-slate-50 dark:bg-slate-800/60 rounded-none" />
        ))}
      </div>
    </div>
  );
}

export function FundTransferHistoryView({ onNavigate }: FundTransferHistoryViewProps) {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>("THIS_MONTH");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Compute actual date strings based on preset
  const computeDateRange = useCallback((preset: DatePreset) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === "TODAY") {
      const today = fmt(now);
      return { start: today, end: today };
    }
    if (preset === "YESTERDAY") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = fmt(y);
      return { start: yStr, end: yStr };
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

  const loadTransactions = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      params.append("type", "TRANSFER");

      const { start, end } = computeDateRange(datePreset);
      if (start) params.append("startDate", start);
      if (end) params.append("endDate", end);

      params.append("page", String(page));
      params.append("limit", String(limit));

      const res = await fetchApi<{ data: FinancialTransaction[]; meta: { total: number; page: number } }>(
        `/accounting/transactions?${params.toString()}`
      );

      if (res.success && res.data) {
        if (Array.isArray(res.data)) {
          setTransactions(res.data);
          setTotalCount(res.data.length);
        } else if (res.data.data && Array.isArray(res.data.data)) {
          setTransactions(res.data.data);
          setTotalCount(res.data.meta?.total || res.data.data.length);
        }
      }
    } catch (err) {
      console.error("Failed to load transfer history", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [datePreset, computeDateRange, page, limit]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Client-side search filtering
  const filteredList = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter((t) => {
      const source = t.sourceAccount?.name?.toLowerCase() || "";
      const dest = t.destinationAccount?.name?.toLowerCase() || "";
      const ref = t.reference?.toLowerCase() || "";
      return source.includes(q) || dest.includes(q) || ref.includes(q);
    });
  }, [transactions, search]);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  if (loading && transactions.length === 0) {
    return <HistorySkeleton />;
  }

  return (
    <div className="space-y-4 w-full mx-auto">
      {/* Header - Clean, Compact & No Large Banners */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <History className="h-5 w-5 text-brand-primary" />
          Transfer History
        </h1>

        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate("acc_fund_transfer")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-brand-primary bg-brand-primary text-white text-xs sm:text-sm font-semibold hover:opacity-90 transition rounded-none"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              New Fund Transfer
            </button>
          )}

          {onNavigate && (
            <button
              onClick={() => onNavigate("acc_financial_accounts")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none"
            >
              <Wallet className="h-3.5 w-3.5 text-brand-primary" />
              Account List
            </button>
          )}

          <button
            onClick={() => loadTransactions(true)}
            disabled={refreshing}
            className="p-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none disabled:opacity-50"
            title="Refresh Ledger"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar - Clean, Compact, Product List Style */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 rounded-none space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Enter account name or slip to search..."
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
                className={`px-2.5 py-1 text-xs font-medium rounded-none border transition ${
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

        {/* Count Note */}
        <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
          Total No. of transfers: <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredList.length}</span>
        </div>
      </div>

      {/* Main Table - Exact Product List Font Size & Balanced Spacing */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-xs sm:text-sm">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-brand-primary" />
            Loading transfer records...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs sm:text-sm">
            No transfer records found for the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/75 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">SL</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">From Account</th>
                  <th className="py-3 px-4">To Account</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
                {filteredList.map((trx, index) => {
                  const sl = (page - 1) * limit + index + 1;
                  return (
                    <tr
                      key={trx.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-center text-xs text-slate-400">
                        {sl}
                      </td>

                      <td className="py-3 px-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono">
                        {new Date(trx.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {trx.sourceAccount?.name || "Source Account"}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {trx.destinationAccount?.name || "Destination Account"}
                      </td>

                      <td className="py-3 px-4 text-right font-bold font-mono text-slate-900 dark:text-white whitespace-nowrap">
                        ৳{Number(trx.amount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination Footer - Exactly Matching Product List Style */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/75 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-xs sm:text-sm">
          <div className="text-slate-500">
            Page <span className="font-semibold text-slate-800 dark:text-slate-200">{page}</span> of{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs rounded-none outline-none text-slate-700 dark:text-slate-200"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none"
                title="First Page"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none"
                title="Previous Page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none"
                title="Next Page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none"
                title="Last Page"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
