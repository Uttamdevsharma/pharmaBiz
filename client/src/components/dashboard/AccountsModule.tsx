"use client";

import React, { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import {
  Wallet,
  Building2,
  Smartphone,
  CreditCard,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  DollarSign,
  Calendar,
  Loader2,
  Receipt,
  Store,
  BarChart3,
  ArrowUpRight,
  Filter,
} from "lucide-react";

interface AccountsModuleProps {
  onNavigate?: (module: any) => void;
}

export function AccountsModule({ onNavigate: _onNavigate }: AccountsModuleProps = {}) {
  // Time filter state
  const [periodPreset, setPeriodPreset] = useState<"thisMonth" | "lastMonth" | "last6Months" | "thisYear" | "custom">("thisMonth");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [branches, setBranches] = useState<any[]>([]);

  // Telemetry data
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active chart view mode
  const [chartMetric, setChartMetric] = useState<"revenue" | "salesCount">("revenue");

  const loadFinancialOverview = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      if (selectedBranchId) params.append("branchId", selectedBranchId);
      if (periodPreset !== "custom") params.append("period", periodPreset);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const [res, branchRes] = await Promise.all([
        fetchApi<any>(`/accounting/overview?${params.toString()}`),
        branches.length === 0 ? fetchApi<any>("/branches") : Promise.resolve({ success: true, data: branches }),
      ]);

      if (res.success && res.data) {
        setData(res.data);
      }
      if (branchRes.success && branchRes.data && branches.length === 0) {
        setBranches(branchRes.data || []);
      }
    } catch (err) {
      console.error("Failed to load financial overview", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFinancialOverview();
  }, [periodPreset, startDate, endDate, selectedBranchId]);

  const handlePeriodChange = (preset: "thisMonth" | "lastMonth" | "last6Months" | "thisYear" | "custom") => {
    setPeriodPreset(preset);
    const now = new Date();

    if (preset === "thisMonth") {
      const s = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const e = now.toISOString().split("T")[0];
      setStartDate(s);
      setEndDate(e);
    } else if (preset === "lastMonth") {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
      const e = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
      setStartDate(s);
      setEndDate(e);
    } else if (preset === "last6Months") {
      const s = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split("T")[0];
      const e = now.toISOString().split("T")[0];
      setStartDate(s);
      setEndDate(e);
    } else if (preset === "thisYear") {
      const s = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
      const e = new Date(now.getFullYear(), 11, 31).toISOString().split("T")[0];
      setStartDate(s);
      setEndDate(e);
    }
  };

  const summary = data?.summary || {
    totalSales: 0,
    cashSales: 0,
    bankCardSales: 0,
    mobileSales: 0,
    bkashSales: 0,
    nagadSales: 0,
    cardSales: 0,
    totalTransactions: 0,
    totalSupplierDues: 0,
    currentCashBalance: 0,
    currentBankBalance: 0,
    currentMobileBalance: 0,
    totalLiquidity: 0,
  };

  const monthlyTrend: any[] = data?.monthlyTrend || [];
  const maxRevenue = Math.max(...monthlyTrend.map((m) => m.revenue || 0), 1000);
  const maxSalesCount = Math.max(...monthlyTrend.map((m) => m.salesCount || 0), 10);

  const recentLedger: any[] = data?.recentLedger || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Accounts Management</span>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300 font-bold">Financial Overview</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Wallet className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Accounts Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Executive financial summary, revenue trends, cash liquidity, and payment distribution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadFinancialOverview(true)}
            disabled={refreshing}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Interactive Period Filter Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Period:</span>
          {[
            { id: "thisMonth", label: "This Month" },
            { id: "lastMonth", label: "Last Month" },
            { id: "last6Months", label: "Last 6 Months" },
            { id: "thisYear", label: "This Year" },
            { id: "custom", label: "Custom Range" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => handlePeriodChange(p.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                periodPreset === p.id
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
                setPeriodPreset("custom");
              }}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodPreset("custom");
              }}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
            />
          </div>

          {branches.length > 1 && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Store className="h-4 w-4 text-slate-400" />
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
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
          <span className="text-xs font-bold">Querying financial analytics...</span>
        </div>
      ) : (
        <>
          {/* 6 EXECUTIVE SUMMARY KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Total Revenue */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg space-y-1 relative overflow-hidden">
              <div className="flex items-center justify-between opacity-80 text-[10px] font-black uppercase tracking-wider">
                <span>Total Sales Revenue</span>
                <DollarSign className="h-4 w-4" />
              </div>
              <div className="text-xl font-black font-mono">
                ৳{summary.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] opacity-80 font-medium">
                {summary.totalTransactions} completed transactions
              </div>
            </div>

            {/* Cash Sales */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase tracking-wider">
                <span>Cash Sales</span>
                <Wallet className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                ৳{summary.cashSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {summary.totalSales > 0 ? `${Math.round((summary.cashSales / summary.totalSales) * 100)}% of sales` : "0%"}
              </div>
            </div>

            {/* Bank & Card Sales */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase tracking-wider">
                <span>Bank / Card Sales</span>
                <CreditCard className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                ৳{summary.bankCardSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">POS Card settlements</div>
            </div>

            {/* Mobile Wallet Sales */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase tracking-wider">
                <span>Mobile Wallet Sales</span>
                <Smartphone className="h-4 w-4 text-pink-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                ৳{summary.mobileSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">bKash & Nagad payments</div>
            </div>

            {/* Outstanding Supplier Dues */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-950 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-rose-500 text-[10px] font-black uppercase tracking-wider">
                <span>Supplier Due</span>
                <TrendingDown className="h-4 w-4 text-rose-500" />
              </div>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
                ৳{summary.totalSupplierDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Total outstanding payables</div>
            </div>

            {/* Total Active Liquidity */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase tracking-wider">
                <span>Cash & Account Balances</span>
                <Building2 className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                ৳{summary.totalLiquidity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Drawer + Bank + Wallets</div>
            </div>
          </div>

          {/* MONTHLY SALES GRAPH & ANALYTICS */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-emerald-600" />
                  Monthly Sales Revenue & Volume Trend
                </h3>
                <p className="text-xs text-slate-400">
                  Real revenue and transaction volume comparison across the last 6 months.
                </p>
              </div>

              {/* Metric Toggle */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setChartMetric("revenue")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    chartMetric === "revenue"
                      ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Revenue (৳)
                </button>
                <button
                  onClick={() => setChartMetric("salesCount")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    chartMetric === "salesCount"
                      ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Sales Count
                </button>
              </div>
            </div>

            {/* Interactive Bar Chart Visualization */}
            <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-64 pt-6 pb-2 border-b border-slate-100 dark:border-slate-800">
              {monthlyTrend.map((m, idx) => {
                const heightPercent =
                  chartMetric === "revenue"
                    ? Math.max(8, Math.round(((m.revenue || 0) / maxRevenue) * 100))
                    : Math.max(8, Math.round(((m.salesCount || 0) / maxSalesCount) * 100));

                const isCurrentMonth = idx === monthlyTrend.length - 1;

                return (
                  <div key={m.monthKey || idx} className="flex flex-col items-center h-full justify-end group">
                    {/* Tooltip on hover */}
                    <div className="text-[11px] font-mono font-black text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity mb-1 whitespace-nowrap">
                      {chartMetric === "revenue" ? `৳${(m.revenue || 0).toLocaleString()}` : `${m.salesCount || 0} sales`}
                    </div>

                    {/* Bar container */}
                    <div className="w-full max-w-[56px] bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden flex flex-col justify-end p-1 relative h-48">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-xl transition-all duration-500 flex flex-col justify-between p-1.5 ${
                          isCurrentMonth
                            ? "bg-gradient-to-t from-emerald-600 to-teal-500 shadow-md shadow-emerald-600/20"
                            : "bg-gradient-to-t from-slate-700 to-slate-500 hover:from-emerald-700 hover:to-emerald-500"
                        }`}
                      >
                        {heightPercent > 30 && (
                          <div className="text-[10px] font-black text-white text-center font-mono truncate">
                            {chartMetric === "revenue" ? `৳${Math.round(m.revenue / 1000)}k` : m.salesCount}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* X-Axis Label */}
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-2 text-center">
                      {m.monthShort}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Monthly Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-3 text-center">Transactions</th>
                    <th className="py-2.5 px-3 text-right">Cash Collected</th>
                    <th className="py-2.5 px-3 text-right">Digital (Card & Mobile)</th>
                    <th className="py-2.5 px-3 text-right">Total Monthly Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {monthlyTrend.map((m) => (
                    <tr key={m.monthKey} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">{m.month}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{m.salesCount}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        ৳{(m.cashAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-purple-600 dark:text-purple-400">
                        ৳{(m.digitalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black font-mono text-slate-900 dark:text-slate-100">
                        ৳{(m.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RECENT FINANCIAL AUDIT TRAIL */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-emerald-600" />
                  Recent Financial Transactions
                </h3>
                <p className="text-xs text-slate-400">Live ledger entries across all till registers and supplier payments.</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Reference & Note</th>
                    <th className="py-3 px-4">Account</th>
                    <th className="py-3 px-4">Authorized Staff</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {recentLedger.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No recent transactions recorded.
                      </td>
                    </tr>
                  ) : (
                    recentLedger.map((tx: any) => {
                      const isExpense =
                        tx.type === "EXPENSE" || tx.type === "PURCHASE_PAYMENT" || tx.type === "REFUND";
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            {new Date(tx.createdAt).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                tx.type === "SALE_PAYMENT"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                                  : isExpense
                                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                                  : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{tx.reference || "N/A"}</div>
                            <div className="text-[10px] text-slate-400">{tx.note || "—"}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {tx.destinationAccount?.name || tx.sourceAccount?.name || "Cash Drawer"}
                          </td>
                          <td className="py-3 px-4 text-slate-500">{tx.user?.name || "System"}</td>
                          <td
                            className={`py-3 px-4 text-right font-black font-mono ${
                              isExpense ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {isExpense ? "-" : "+"}৳{Number(tx.amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
