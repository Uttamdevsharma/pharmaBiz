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
  ArrowLeftRight,
  Banknote,
  Filter,
  PieChart as PieChartIcon,
  Layers,
  ChevronRight,
} from "lucide-react";

interface AccountsModuleProps {
  onNavigate?: (module: any) => void;
}

export function AccountsModule({ onNavigate }: AccountsModuleProps = {}) {
  // Time filter state for KPI summary
  const [periodPreset, setPeriodPreset] = useState<"thisMonth" | "lastMonth" | "last6Months" | "thisYear" | "custom">("thisMonth");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [branches, setBranches] = useState<any[]>([]);

  // Telemetry data
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active chart timeframe tab: Day | Week | Month
  const [chartTimeframe, setChartTimeframe] = useState<"day" | "week" | "month">("week");
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
    bkashSales: 0,
    nagadSales: 0,
    bankSales: 0,
    otherSales: 0,
    totalTransactions: 0,
    totalSupplierDues: 0,
    currentCashBalance: 0,
    currentBkashBalance: 0,
    currentNagadBalance: 0,
    currentBankBalance: 0,
    totalLiquidity: 0,
    todayRevenue: 0,
    todaySalesCount: 0,
    todayCash: 0,
    todayBkash: 0,
    todayNagad: 0,
    todayBank: 0,
  };

  const paymentBreakdown = data?.paymentBreakdown || {
    cash: 0,
    bkash: 0,
    nagad: 0,
    bank: 0,
    other: 0,
    grandTotal: 0,
  };

  const rawAccounts: any[] = data?.accounts || [];

  // Chart dataset selection based on active timeframe tab
  const todayHourly: any[] = data?.todayHourly || [];
  const last7Days: any[] = data?.last7Days || [];
  const monthlyTrend: any[] = data?.monthlyTrend || [];

  let activeChartData: { label: string; subLabel?: string; revenue: number; count: number }[] = [];
  if (chartTimeframe === "day") {
    activeChartData = todayHourly.map((h) => ({
      label: h.label,
      revenue: h.revenue || 0,
      count: h.salesCount || 0,
    }));
  } else if (chartTimeframe === "week") {
    activeChartData = last7Days.map((d) => ({
      label: d.dayName,
      subLabel: d.date,
      revenue: d.revenue || 0,
      count: d.orderCount || 0,
    }));
  } else {
    activeChartData = monthlyTrend.map((m) => ({
      label: m.monthShort,
      subLabel: m.month,
      revenue: m.revenue || 0,
      count: m.salesCount || 0,
    }));
  }

  const maxVal = Math.max(
    ...activeChartData.map((d) => (chartMetric === "revenue" ? d.revenue : d.count)),
    chartMetric === "revenue" ? 500 : 5
  );

  // Total sales calculation for payment method distribution
  const totalPaymentSum =
    (paymentBreakdown.cash || 0) +
    (paymentBreakdown.bkash || 0) +
    (paymentBreakdown.nagad || 0) +
    (paymentBreakdown.bank || 0) +
    (paymentBreakdown.other || 0);

  const paymentChannels = [
    {
      name: "Cash",
      amount: paymentBreakdown.cash || 0,
      color: "bg-emerald-500",
      textColor: "text-emerald-600 dark:text-emerald-400",
      pct: totalPaymentSum > 0 ? Math.round(((paymentBreakdown.cash || 0) / totalPaymentSum) * 100) : 0,
      icon: Banknote,
    },
    {
      name: "bKash",
      amount: paymentBreakdown.bkash || 0,
      color: "bg-pink-500",
      textColor: "text-pink-600 dark:text-pink-400",
      pct: totalPaymentSum > 0 ? Math.round(((paymentBreakdown.bkash || 0) / totalPaymentSum) * 100) : 0,
      icon: Smartphone,
    },
    {
      name: "Nagad",
      amount: paymentBreakdown.nagad || 0,
      color: "bg-orange-500",
      textColor: "text-orange-600 dark:text-orange-400",
      pct: totalPaymentSum > 0 ? Math.round(((paymentBreakdown.nagad || 0) / totalPaymentSum) * 100) : 0,
      icon: Smartphone,
    },
    {
      name: "Bank / POS",
      amount: paymentBreakdown.bank || 0,
      color: "bg-blue-500",
      textColor: "text-blue-600 dark:text-blue-400",
      pct: totalPaymentSum > 0 ? Math.round(((paymentBreakdown.bank || 0) / totalPaymentSum) * 100) : 0,
      icon: Building2,
    },
  ];

  const totalAccountLiquidity = rawAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);

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
            Live financial telemetry, revenue trends, real account balances, and payment distribution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadFinancialOverview(true)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
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
        <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <span className="text-xs font-bold">Querying financial analytics & account balances...</span>
        </div>
      ) : (
        <>
          {/* Quick Navigation Action Shortcuts */}
          {onNavigate && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {[
                { id: "acc_financial_accounts", label: "Financial Accounts", icon: Wallet, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40" },
                { id: "acc_fund_transfer", label: "Fund Transfer", icon: ArrowLeftRight, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
                { id: "acc_payment_sales", label: "Payment Sales", icon: CreditCard, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40" },
                { id: "acc_product_sales", label: "Product Sales", icon: BarChart3, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40" },
                { id: "reports", label: "Sales Reports", icon: Receipt, color: "text-teal-600 bg-teal-50 dark:bg-teal-950/40" },
                { id: "sup_payments_due", label: "Supplier Dues", icon: TrendingDown, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/40" },
                { id: "acc_transaction_history", label: "Ledger History", icon: Filter, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition flex flex-col items-center gap-1.5 text-center group shadow-2xs"
                  >
                    <div className={`p-2 rounded-xl ${item.color} group-hover:scale-110 transition-transform`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 truncate w-full">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 5 EXECUTIVE SUMMARY KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Total Liquid Funds */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg space-y-1 relative overflow-hidden">
              <div className="flex items-center justify-between opacity-80 text-[10px] font-black uppercase tracking-wider">
                <span>Total Liquid Funds</span>
                <Wallet className="h-4 w-4" />
              </div>
              <div className="text-xl font-black font-mono">
                ৳{(summary.totalLiquidity || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] opacity-85 font-medium">Drawer + Banks + Wallets</div>
            </div>

            {/* Cash in Drawer */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase tracking-wider">
                <span>Cash in Hand</span>
                <Banknote className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                ৳{(summary.currentCashBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Physical till cash</div>
            </div>

            {/* Bank Accounts Total */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase tracking-wider">
                <span>Bank Accounts</span>
                <Building2 className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono">
                ৳{(summary.currentBankBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">DBBL, City, BRAC, etc.</div>
            </div>

            {/* Digital Wallets Total */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase tracking-wider">
                <span>bKash & Nagad</span>
                <Smartphone className="h-4 w-4 text-pink-500" />
              </div>
              <div className="text-xl font-black text-pink-600 dark:text-pink-400 font-mono">
                ৳{((summary.currentBkashBalance || 0) + (summary.currentNagadBalance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Merchant wallets</div>
            </div>

            {/* Supplier Payables */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-950 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-rose-500 text-[10px] font-black uppercase tracking-wider">
                <span>Supplier Payables</span>
                <TrendingDown className="h-4 w-4 text-rose-500" />
              </div>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
                ৳{(summary.totalSupplierDues || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Pending supplier dues</div>
            </div>
          </div>

          {/* REAL CREATED FINANCIAL ACCOUNTS LIVE BALANCES */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Pharmacy Financial Accounts & Balances
                </h3>
                <p className="text-xs text-slate-400">
                  Real-time balances across all accounts created by your pharmacy.
                </p>
              </div>

              {onNavigate && (
                <button
                  onClick={() => onNavigate("acc_financial_accounts")}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  Manage Accounts &rarr;
                </button>
              )}
            </div>

            {rawAccounts.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 font-medium">No financial accounts have been created yet.</p>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate("acc_financial_accounts")}
                    className="mt-2 text-xs font-bold text-emerald-600 hover:underline"
                  >
                    + Create your first account
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {rawAccounts.map((acc: any) => {
                  const isBank = acc.type === "BANK" || acc.type === "CARD_SETTLEMENT";
                  const isBkash = acc.type === "BKASH" || acc.name.toLowerCase().includes("bkash");
                  const isNagad = acc.type === "NAGAD" || acc.name.toLowerCase().includes("nagad");

                  return (
                    <div
                      key={acc.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between space-y-3 hover:border-emerald-500/50 transition shadow-2xs"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`p-2.5 rounded-xl ${
                              isBank
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                                : isBkash
                                ? "bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-400"
                                : isNagad
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                            }`}
                          >
                            {isBank ? (
                              <Building2 className="h-4 w-4" />
                            ) : isBkash || isNagad ? (
                              <Smartphone className="h-4 w-4" />
                            ) : (
                              <Banknote className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate max-w-[140px]">
                              {acc.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {acc.accountNumber || acc.bankName || acc.type}
                            </div>
                          </div>
                        </div>

                        {acc.isDefault && (
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Balance</span>
                        <span className="font-black text-sm font-mono text-slate-900 dark:text-white">
                          ৳{Number(acc.balance || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DYNAMIC REAL-DATA CHARTS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 Cols: Sales Revenue / Volume Trend Bar Chart */}
            <div className="lg:col-span-8 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Sales Velocity & Revenue Trends
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real recorded sales categorized across hourly, daily, and monthly intervals.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Timeframe Filter (Day / Week / Month) */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {[
                      { id: "day", label: "Day (Hourly)" },
                      { id: "week", label: "Week (7 Days)" },
                      { id: "month", label: "Month (6 Mo)" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setChartTimeframe(t.id as any)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          chartTimeframe === t.id
                            ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Metric Toggle */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      onClick={() => setChartMetric("revenue")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        chartMetric === "revenue"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      ৳ Revenue
                    </button>
                    <button
                      onClick={() => setChartMetric("salesCount")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        chartMetric === "salesCount"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Orders
                    </button>
                  </div>
                </div>
              </div>

              {/* Chart Visualizer */}
              <div className="h-64 pt-6 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-end justify-between gap-2 sm:gap-4">
                {activeChartData.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                    No sales recorded for this timeframe.
                  </div>
                ) : (
                  activeChartData.map((d, idx) => {
                    const currentVal = chartMetric === "revenue" ? d.revenue : d.count;
                    const heightPct = Math.max(6, Math.round((currentVal / maxVal) * 100));
                    const isLatest = idx === activeChartData.length - 1;

                    return (
                      <div key={d.label + idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                        {/* Hover Tooltip */}
                        <div className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity mb-1 whitespace-nowrap text-center">
                          {chartMetric === "revenue" ? `৳${d.revenue.toLocaleString()}` : `${d.count} orders`}
                        </div>

                        {/* Bar */}
                        <div className="w-full max-w-[48px] bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden flex flex-col justify-end p-1 relative h-48">
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-full rounded-xl transition-all duration-500 flex flex-col justify-between p-1 ${
                              isLatest
                                ? "bg-gradient-to-t from-emerald-600 to-teal-500 shadow-md shadow-emerald-600/20"
                                : "bg-gradient-to-t from-slate-700 to-slate-500 hover:from-emerald-700 hover:to-emerald-500"
                            }`}
                          >
                            {heightPct > 35 && (
                              <div className="text-[9px] font-black text-white text-center font-mono truncate">
                                {chartMetric === "revenue"
                                  ? `৳${Math.round(d.revenue / 1000)}k`
                                  : d.count}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Label */}
                        <div className="mt-2 text-center">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block leading-tight">
                            {d.label}
                          </span>
                          {d.subLabel && (
                            <span className="text-[9px] text-slate-400 block font-medium">
                              {d.subLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Summary footnote */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>
                  Showing: <strong className="text-slate-700 dark:text-slate-300">{chartTimeframe === "day" ? "Today's Hourly Sales" : chartTimeframe === "week" ? "Last 7 Days Sales" : "Last 6 Months Trend"}</strong>
                </span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  Total in view: ৳{activeChartData.reduce((acc, c) => acc + c.revenue, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Right 4 Cols: Payment Distribution & Account Liquidity Share */}
            <div className="lg:col-span-4 space-y-6">
              {/* Payment Method Distribution */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-emerald-600" />
                    Payment Channel Distribution
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Period Share</span>
                </div>

                {/* Progress bar visualizer */}
                <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  {paymentChannels.map((p) =>
                    p.pct > 0 ? (
                      <div
                        key={p.name}
                        style={{ width: `${p.pct}%` }}
                        className={`${p.color} h-full transition-all duration-500`}
                        title={`${p.name}: ${p.pct}%`}
                      />
                    ) : null
                  )}
                </div>

                {/* Legend list */}
                <div className="space-y-2.5 pt-1">
                  {paymentChannels.map((p) => {
                    const Icon = p.icon;
                    return (
                      <div key={p.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${p.color}`} />
                          <span className="font-bold text-slate-700 dark:text-slate-300">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="font-black text-slate-900 dark:text-white">
                            ৳{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 w-8 text-right">
                            {p.pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Account Balance Liquidity Share */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="h-4 w-4 text-blue-600" />
                    Account Balance Distribution
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Where Funds Are</span>
                </div>

                {rawAccounts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">No accounts created</p>
                ) : (
                  <div className="space-y-3">
                    {rawAccounts.slice(0, 5).map((acc: any) => {
                      const bal = Number(acc.balance || 0);
                      const pct = totalAccountLiquidity > 0 ? Math.round((bal / totalAccountLiquidity) * 100) : 0;

                      return (
                        <div key={acc.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                              {acc.name}
                            </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              ৳{bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                              <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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
                      <td colSpan={6} className="py-8 text-center text-slate-400">
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
