"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import {
  CreditCard,
  Banknote,
  Smartphone,
  Wallet,
  Calendar,
  Filter,
  Loader2,
  Receipt,
  Store,
  DollarSign,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface PaymentMethodSalesViewProps {
  onNavigate?: (module: any) => void;
}

export function PaymentMethodSalesView({ onNavigate: _onNavigate }: PaymentMethodSalesViewProps = {}) {
  // Date range filtering
  const [datePreset, setDatePreset] = useState<"today" | "yesterday" | "last7" | "thisMonth" | "custom">("today");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [branches, setBranches] = useState<any[]>([]);

  // Telemetry Data
  const [dailyData, setDailyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMethodFilter, setSelectedMethodFilter] = useState<string>("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const loadPaymentSales = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (selectedBranchId) params.append("branchId", selectedBranchId);

      const [res, branchRes] = await Promise.all([
        fetchApi<any>(`/reports/sales/daily?${params.toString()}`),
        branches.length === 0 ? fetchApi<any>("/branches") : Promise.resolve({ success: true, data: branches }),
      ]);

      if (res.success && res.data) {
        setDailyData(res.data);
      }
      if (branchRes.success && branchRes.data && branches.length === 0) {
        setBranches(branchRes.data || []);
      }
    } catch (err) {
      console.error("Failed to load payment method sales", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPaymentSales();
  }, [startDate, endDate, selectedBranchId]);

  const handlePresetChange = (preset: "today" | "yesterday" | "last7" | "thisMonth" | "custom") => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === "today") {
      const d = now.toISOString().split("T")[0];
      setStartDate(d);
      setEndDate(d);
    } else if (preset === "yesterday") {
      const y = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setStartDate(y);
      setEndDate(y);
    } else if (preset === "last7") {
      const s = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const e = now.toISOString().split("T")[0];
      setStartDate(s);
      setEndDate(e);
    } else if (preset === "thisMonth") {
      const s = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const e = now.toISOString().split("T")[0];
      setStartDate(s);
      setEndDate(e);
    }
  };

  const summary = dailyData?.summary || {
    totalSales: 0,
    transactionCount: 0,
    totalUnitsSold: 0,
    averageOrderValue: 0,
  };

  const paymentBreakdown = dailyData?.paymentBreakdown || {
    cash: 0,
    bkash: 0,
    nagad: 0,
    card: 0,
    other: 0,
    grandTotal: 0,
  };

  const filteredTransactions = (dailyData?.transactions || []).filter((t: any) => {
    if (selectedMethodFilter !== "ALL") {
      if (selectedMethodFilter === "CASH" && t.paymentMethod !== "CASH") return false;
      if (selectedMethodFilter === "CARD" && t.paymentMethod !== "CARD") return false;
      if (selectedMethodFilter === "BKASH" && !t.paymentDetail?.toLowerCase().includes("bkash")) return false;
      if (selectedMethodFilter === "NAGAD" && !t.paymentDetail?.toLowerCase().includes("nagad")) return false;
      if (selectedMethodFilter === "OTHER" && (t.paymentMethod === "CASH" || t.paymentMethod === "CARD" || t.paymentDetail?.toLowerCase().includes("bkash") || t.paymentDetail?.toLowerCase().includes("nagad"))) return false;
    }
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      return (
        t.receiptNo?.toLowerCase().includes(s) ||
        t.customerName?.toLowerCase().includes(s) ||
        t.cashier?.name?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Accounts Management</span>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300 font-bold">Payment Method Sales</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <CreditCard className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Payment Method Sales
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time breakdown of sales collected by Cash Drawer, bKash, Nagad, Card/POS, and other gateways.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadPaymentSales(true)}
            disabled={refreshing}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" /> : <Filter className="h-3.5 w-3.5" />}
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Date & Filter Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Period:</span>
          {[
            { id: "today", label: "Today" },
            { id: "yesterday", label: "Yesterday" },
            { id: "last7", label: "Last 7 Days" },
            { id: "thisMonth", label: "This Month" },
            { id: "custom", label: "Custom Range" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => {
                handlePresetChange(p.id as any);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                datePreset === p.id
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date Pickers & Branch Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset("custom");
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset("custom");
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
            />
          </div>

          {branches.length > 1 && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Store className="h-4 w-4 text-slate-400" />
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <span className="text-xs font-bold">Querying payment method telemetry...</span>
        </div>
      ) : (
        <>
          {/* SUMMARY CARDS FOR PAYMENT CHANNELS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Total Sales */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md space-y-1">
              <div className="flex items-center justify-between opacity-80 text-[10px] font-black uppercase tracking-wider">
                <span>Total Sales</span>
                <DollarSign className="h-3.5 w-3.5" />
              </div>
              <div className="text-xl font-black font-mono">
                ৳{paymentBreakdown.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] opacity-85 font-medium">{summary.transactionCount} transactions</div>
            </div>

            {/* Cash */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase tracking-wider">
                <span>Cash Drawer</span>
                <Banknote className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                ৳{paymentBreakdown.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {summary.totalSales > 0 ? `${Math.round((paymentBreakdown.cash / summary.totalSales) * 100)}% of total` : "0%"}
              </div>
            </div>

            {/* bKash */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase tracking-wider">
                <span>bKash</span>
                <Smartphone className="h-3.5 w-3.5 text-pink-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                ৳{paymentBreakdown.bkash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {summary.totalSales > 0 ? `${Math.round((paymentBreakdown.bkash / summary.totalSales) * 100)}% of total` : "0%"}
              </div>
            </div>

            {/* Nagad */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase tracking-wider">
                <span>Nagad</span>
                <Smartphone className="h-3.5 w-3.5 text-orange-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                ৳{paymentBreakdown.nagad.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {summary.totalSales > 0 ? `${Math.round((paymentBreakdown.nagad / summary.totalSales) * 100)}% of total` : "0%"}
              </div>
            </div>

            {/* Card / POS */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase tracking-wider">
                <span>Card / POS</span>
                <CreditCard className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                ৳{paymentBreakdown.card.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {summary.totalSales > 0 ? `${Math.round((paymentBreakdown.card / summary.totalSales) * 100)}% of total` : "0%"}
              </div>
            </div>

            {/* Other Methods */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase tracking-wider">
                <span>Other Methods</span>
                <Wallet className="h-3.5 w-3.5 text-purple-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                ৳{paymentBreakdown.other.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {summary.totalSales > 0 ? `${Math.round((paymentBreakdown.other / summary.totalSales) * 100)}% of total` : "0%"}
              </div>
            </div>
          </div>

          {/* PAYMENT TRANSACTIONS TABLE */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-emerald-600" />
                  Payment Transactions Ledger
                </h3>
                <p className="text-xs text-slate-400">
                  Detailed list of customer invoices and verified payment collection methods.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search invoice, customer, cashier..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                  />
                </div>

                <select
                  value={selectedMethodFilter}
                  onChange={(e) => {
                    setSelectedMethodFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
                >
                  <option value="ALL">All Methods</option>
                  <option value="CASH">Cash Drawer</option>
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="CARD">Card / POS</option>
                  <option value="OTHER">Other Methods</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Cashier</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No transactions found for the selected payment criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400 font-mono">
                          {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono">
                          {new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {t.receiptNo}
                        </td>
                        <td className="py-3 px-4 font-medium">{t.customerName || "Walk-in Customer"}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{t.cashier?.name || "Staff"}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              t.paymentMethod === "CASH"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                                : t.paymentMethod === "CARD"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                                : t.paymentDetail?.toLowerCase().includes("nagad")
                                ? "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400"
                                : "bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-400"
                            }`}
                          >
                            {t.paymentDetail}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{t.branchName || "Main Branch"}</td>
                        <td className="py-3 px-4 text-right font-black font-mono text-emerald-600 dark:text-emerald-400">
                          ৳{Number(t.totalAmount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 text-xs text-slate-500">
                <div>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}{" "}
                  transactions
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-200"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-3 font-bold">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-200"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
