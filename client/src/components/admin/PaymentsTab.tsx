"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import {
  CreditCard,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  RefreshCw,
  X,
} from "lucide-react";

type DatePreset = "ALL" | "TODAY" | "YESTERDAY" | "THIS_MONTH" | "LAST_MONTH" | "THIS_YEAR" | "CUSTOM";

export function PaymentsTab() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Date Filters
  const [dateFilter, setDateFilter] = useState<DatePreset>("ALL");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (dateFilter && dateFilter !== "ALL") params.append("datePreset", dateFilter);
      if (dateFilter === "CUSTOM") {
        if (customStartDate) params.append("startDate", customStartDate);
        if (customEndDate) params.append("endDate", customEndDate);
      }

      const res = await fetchApi<any>(`/super-admin/payments?${params.toString()}`);
      if (res.success && res.data) {
        setPayments(res.data);
      }
    } catch (err) {
      console.error("Failed to load payments", err);
    } finally {
      setLoading(false);
    }
  }, [search, dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPayments();
  };

  // Filter by status if selected
  const filtered = payments.filter((p) => {
    if (statusFilter === "ALL") return true;
    return p.status === statusFilter;
  });

  // Calculate total collected revenue in filtered set
  const totalAmount = filtered
    .filter((p) => p.status === "VALIDATED" || p.status === "ACTIVE" || p.status === "SUCCESS")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Stats - Clean, No Jargon Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-brand-primary/10 text-brand-primary">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Payments & Invoices
            </h2>
          </div>
        </div>

        {/* Quick Stats & Refresh */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <span className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Total: <strong>{filtered.length}</strong> Record{filtered.length === 1 ? "" : "s"}
          </span>

          <span className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            Collected: ৳{totalAmount.toLocaleString()}
          </span>

          <button
            type="button"
            onClick={loadPayments}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer active:scale-95"
            title="Refresh Transactions"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-brand-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* Date Filter & Search Toolbar */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs space-y-4">
        {/* Date Preset Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-bold">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-brand-primary" />
              Date Filter:
            </span>
            {[
              { id: "ALL", label: "All Time" },
              { id: "TODAY", label: "Today" },
              { id: "YESTERDAY", label: "Yesterday" },
              { id: "THIS_MONTH", label: "This Month" },
              { id: "LAST_MONTH", label: "Last Month" },
              { id: "THIS_YEAR", label: "This Year" },
              { id: "CUSTOM", label: "Custom Range" },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDateFilter(preset.id as DatePreset)}
                className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer font-bold ${
                  dateFilter === preset.id
                    ? "bg-brand-primary text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {dateFilter === "CUSTOM" && (
            <div className="flex flex-wrap items-center gap-3 pt-2 sm:pt-0">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
                <span className="text-slate-400">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
                <span className="text-slate-400">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Search & Status Filter Row */}
        <form onSubmit={handleSearchSubmit} className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Pharmacy Name, Transaction ID, Payment Method..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="VALIDATED">Validated (Success)</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </form>
      </div>

      {/* Clean, Important Columns Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary mx-auto" />
            <p className="text-sm font-bold text-slate-500">Loading payment history...</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-500 select-none">
                <tr>
                  <th className="py-4 px-6">Pharmacy</th>
                  <th className="py-4 px-6">Amount</th>
                  <th className="py-4 px-6">Transaction ID</th>
                  <th className="py-4 px-6">Payment Method</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filtered.map((p) => {
                  const isValid = p.status === "VALIDATED" || p.status === "ACTIVE" || p.status === "SUCCESS";
                  const isFailed = p.status === "FAILED";

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* Pharmacy Info */}
                      <td className="py-4 px-6">
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                            {p.tenant?.name || "Independent"}
                          </div>
                          {p.subscription?.plan?.name && (
                            <div className="text-xs font-semibold text-slate-400 mt-0.5">
                              Plan: {p.subscription.plan.name}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                          ৳{Number(p.amount).toLocaleString()}
                        </div>
                      </td>

                      {/* Transaction ID */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="font-mono text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                          {p.tranId || p.transactionId || "—"}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="px-3 py-1 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase">
                          {p.paymentMethod || p.cardType || "SSLCOMMERZ"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-bold border ${
                            isValid
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                              : isFailed
                              ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {isValid && <CheckCircle2 className="h-4 w-4" />}
                          {isFailed && <XCircle className="h-4 w-4" />}
                          {!isValid && !isFailed && <Clock className="h-4 w-4" />}
                          {p.status}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="text-slate-800 dark:text-slate-200 font-bold text-sm">
                          {new Date(p.createdAt).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          {new Date(p.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center space-y-2">
            <CreditCard className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-500">No payment transactions found</p>
            <p className="text-xs text-slate-400">Try adjusting your date range or search keyword</p>
          </div>
        )}
      </div>
    </div>
  );
}
