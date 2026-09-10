"use client";

import React, { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import {
  Wallet,
  Building2,
  Smartphone,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
  Loader2,
  Store,
  BarChart3,
  Banknote,
  Layers,
  LayoutDashboard,
} from "lucide-react";

interface AccountsOverviewViewProps {
  onNavigate?: (module: OwnerModule) => void;
}

interface FinancialAccount {
  id: string;
  name: string;
  type: string;
  bankName?: string | null;
  accountNumber?: string | null;
  branchName?: string | null;
  routingNumber?: string | null;
  balance: number;
  isDefault: boolean;
  isActive: boolean;
  description?: string | null;
}

import { useBranchContext } from "@/context/BranchContext";

interface AccountsOverviewViewProps {
  onNavigate?: (module: OwnerModule) => void;
  selectedBranchId?: string;
}

export function AccountsOverviewView({ onNavigate, selectedBranchId: propBranchId }: AccountsOverviewViewProps = {}) {
  const { selectedBranchId: contextBranchId, currentBranch, isAllBranches } = useBranchContext();
  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;

  // Time filter state for KPI summary
  const [periodPreset, setPeriodPreset] = useState<"thisMonth" | "lastMonth" | "last6Months" | "thisYear" | "custom">("thisMonth");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Accounts & Telemetry data
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active chart timeframe tab: Day (Hourly) | Week (7 Days) | Month (30 Days) | 6-Month Trend
  const [chartTimeframe, setChartTimeframe] = useState<"day" | "week" | "month" | "6month">("week");
  const [chartMetric, setChartMetric] = useState<"revenue" | "salesCount">("revenue");

  const loadFinancialOverview = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      if (effectiveBranchId && effectiveBranchId !== "all") {
        params.append("branchId", effectiveBranchId);
      }
      if (periodPreset !== "custom") params.append("period", periodPreset);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const accountsUrl = (effectiveBranchId && effectiveBranchId !== "all")
        ? `/accounting/accounts?branchId=${effectiveBranchId}`
        : "/accounting/accounts";

      const [res, accRes] = await Promise.all([
        fetchApi<any>(`/accounting/overview?${params.toString()}`),
        fetchApi<FinancialAccount[]>(accountsUrl),
      ]);

      if (res.success && res.data) {
        setData(res.data);
      }
      if (accRes.success && accRes.data) {
        setAccounts(accRes.data);
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
  }, [periodPreset, startDate, endDate, effectiveBranchId]);

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
    todayRevenue: 0,
    todaySalesCount: 0,
    todayCash: 0,
    todayBkash: 0,
    todayNagad: 0,
    todayBank: 0,
  };

  // Exact live accounts and balance calculations matching Financial Accounts view
  const rawAccounts: FinancialAccount[] = accounts.length > 0 ? accounts : (data?.accounts || []);

  const totalBalance = rawAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const totalCash = rawAccounts
    .filter((a) => a.type === "CASH")
    .reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const totalBank = rawAccounts
    .filter((a) => a.type === "BANK" || a.type === "CARD_SETTLEMENT")
    .reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const totalMobile = rawAccounts
    .filter(
      (a) =>
        a.type === "BKASH" ||
        a.type === "NAGAD" ||
        a.type === "MOBILE" ||
        a.name?.toLowerCase().includes("bkash") ||
        a.name?.toLowerCase().includes("nagad")
    )
    .reduce((sum, a) => sum + Number(a.balance || 0), 0);

  // Real recorded sales datasets from backend
  const todayHourly: any[] = data?.todayHourly || [];
  const last7Days: any[] = data?.last7Days || [];
  const last30Days: any[] = data?.last30Days || [];
  const monthlyTrend: any[] = data?.monthlyTrend || [];

  let activeChartData: { label: string; subLabel?: string; revenue: number; count: number; dateKey?: string }[] = [];
  if (chartTimeframe === "day") {
    activeChartData = todayHourly.map((h) => ({
      label: h.label,
      revenue: Number(h.revenue || 0),
      count: Number(h.salesCount || 0),
    }));
  } else if (chartTimeframe === "week") {
    activeChartData = last7Days.map((d) => ({
      label: d.dayName,
      subLabel: d.date,
      dateKey: d.dateKey,
      revenue: Number(d.revenue || 0),
      count: Number(d.orderCount || 0),
    }));
  } else if (chartTimeframe === "month") {
    activeChartData = (last30Days.length > 0 ? last30Days : last7Days).map((d) => ({
      label: d.date,
      subLabel: d.dayName,
      dateKey: d.dateKey,
      revenue: Number(d.revenue || 0),
      count: Number(d.orderCount || 0),
    }));
  } else {
    activeChartData = monthlyTrend.map((m) => ({
      label: m.monthShort,
      subLabel: m.month,
      dateKey: m.monthKey,
      revenue: Number(m.revenue || 0),
      count: Number(m.salesCount || 0),
    }));
  }

  const maxVal = Math.max(
    ...activeChartData.map((d) => (chartMetric === "revenue" ? d.revenue : d.count)),
    1
  );

  const totalChartRevenue = activeChartData.reduce((acc, c) => acc + c.revenue, 0);
  const totalChartOrders = activeChartData.reduce((acc, c) => acc + c.count, 0);
  const totalAccountLiquidity = totalBalance > 0 ? totalBalance : rawAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);

  return (
    <div className="space-y-6 2xl:space-y-8 w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs xl:text-sm text-slate-400 mb-1">
            <span>Accounts & Finance</span>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300 font-bold">Overview</span>
          </div>
          <h1 className="text-2xl xl:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <LayoutDashboard className="h-7 w-7 xl:h-8 xl:w-8 text-emerald-600 dark:text-emerald-400" />
            Financial Overview
          </h1>
          <p className="text-xs sm:text-sm xl:text-base text-slate-500 dark:text-slate-400 mt-1">
            Live financial telemetry, revenue trends, real account balances, and sales velocity.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onNavigate && (
            <>
              <button
                onClick={() => onNavigate("acc_expenses")}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <span>Expenses & Bills</span>
              </button>
              <button
                onClick={() => onNavigate("acc_salaries")}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <span>Salary Management</span>
              </button>
            </>
          )}
          <button
            onClick={() => loadFinancialOverview(true)}
            disabled={refreshing}
            className="px-3.5 py-2 xl:px-4 xl:py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs xl:text-sm font-bold transition flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 xl:h-4 xl:w-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Interactive Period Filter Bar */}
      <div className="p-4 sm:p-5 2xl:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs xl:text-sm font-bold text-slate-400 uppercase tracking-wider mr-1">Period:</span>
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
              className={`px-3 py-1.5 xl:px-3.5 xl:py-2 rounded-xl text-xs xl:text-sm font-bold transition ${
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
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 xl:py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriodPreset("custom");
              }}
              className="bg-transparent text-xs xl:text-sm font-bold text-slate-800 dark:text-slate-200 outline-none"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodPreset("custom");
              }}
              className="bg-transparent text-xs xl:text-sm font-bold text-slate-800 dark:text-slate-200 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 xl:py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs xl:text-sm text-slate-600 dark:text-slate-300">
            <Store className="h-4 w-4 text-emerald-500" />
            <span>Scope:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {isAllBranches ? "All Branches" : (currentBranch?.name || "Selected Branch")}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <span className="text-xs xl:text-sm font-bold">Querying financial analytics & account balances...</span>
        </div>
      ) : (
        <>
          {/* 5 EXECUTIVE SUMMARY KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-5 gap-4 2xl:gap-5">
            {/* Total Liquid Funds */}
            <div className="p-5 xl:p-6 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg space-y-1 relative overflow-hidden">
              <div className="flex items-center justify-between opacity-80 text-[10px] xl:text-xs font-black uppercase tracking-wider">
                <span>Total Liquid Funds</span>
                <Wallet className="h-4 w-4" />
              </div>
              <div className="text-xl xl:text-2xl 2xl:text-3xl font-black font-mono">
                ৳{totalBalance.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] xl:text-xs opacity-85 font-medium">Drawer + Banks + Wallets</div>
            </div>

            {/* Cash in Drawer */}
            <div className="p-5 xl:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] xl:text-xs font-black uppercase tracking-wider">
                <span>Cash in Hand</span>
                <Banknote className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-xl xl:text-2xl 2xl:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                ৳{totalCash.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] xl:text-xs text-slate-400 font-medium">Physical till cash</div>
            </div>

            {/* Bank Accounts Total */}
            <div className="p-5 xl:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] xl:text-xs font-black uppercase tracking-wider">
                <span>Bank Accounts</span>
                <Building2 className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-xl xl:text-2xl 2xl:text-3xl font-black text-blue-600 dark:text-blue-400 font-mono">
                ৳{totalBank.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] xl:text-xs text-slate-400 font-medium">DBBL, City, BRAC, etc.</div>
            </div>

            {/* Digital Wallets Total */}
            <div className="p-5 xl:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] xl:text-xs font-black uppercase tracking-wider">
                <span>bKash & Nagad</span>
                <Smartphone className="h-4 w-4 text-pink-500" />
              </div>
              <div className="text-xl xl:text-2xl 2xl:text-3xl font-black text-pink-600 dark:text-pink-400 font-mono">
                ৳{totalMobile.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] xl:text-xs text-slate-400 font-medium">Merchant wallets</div>
            </div>

            {/* Supplier Payables */}
            <div className="p-5 xl:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-950 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-rose-500 text-[10px] xl:text-xs font-black uppercase tracking-wider">
                <span>Supplier Payables</span>
                <TrendingDown className="h-4 w-4 text-rose-500" />
              </div>
              <div className="text-xl xl:text-2xl 2xl:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
                ৳{(summary.totalSupplierDues || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] xl:text-xs text-slate-400 font-medium">Pending supplier dues</div>
            </div>
          </div>

          {/* REAL CREATED FINANCIAL ACCOUNTS LIVE BALANCES */}
          <div className="p-6 2xl:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base xl:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Pharmacy Financial Accounts & Balances
                </h3>
                <p className="text-xs xl:text-sm text-slate-400">
                  Current balances across all accounts created by your pharmacy.
                </p>
              </div>

              {onNavigate && (
                <button
                  onClick={() => onNavigate("acc_financial_accounts")}
                  className="text-xs xl:text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  Manage Accounts &rarr;
                </button>
              )}
            </div>

            {rawAccounts.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-xs xl:text-sm text-slate-500 font-medium">No financial accounts have been created yet.</p>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate("acc_financial_accounts")}
                    className="mt-2 text-xs xl:text-sm font-bold text-emerald-600 hover:underline"
                  >
                    + Create your first account
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3.5 xl:gap-4 2xl:gap-5">
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

          {/* DYNAMIC REAL-DATA SALES GRAPH & ACCOUNT DISTRIBUTION SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 2xl:gap-8">
            {/* Left 8 Cols: Sales Velocity & Revenue Trends Bar Chart */}
            <div className="lg:col-span-8 p-6 2xl:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base xl:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Sales Velocity & Revenue Trends
                  </h3>
                  <p className="text-xs xl:text-sm text-slate-400 mt-0.5">
                    Real recorded sales categorized across hourly, daily, and monthly intervals.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Timeframe Filter (Day / Week / Month / 6-Month) */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {[
                      { id: "day", label: "Today" },
                      { id: "week", label: "Last 7 Days" },
                      { id: "month", label: "Last 30 Days" },
                      { id: "6month", label: "6 Months" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setChartTimeframe(t.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        chartMetric === "revenue"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    >
                      ৳ Revenue
                    </button>
                    <button
                      onClick={() => setChartMetric("salesCount")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        chartMetric === "salesCount"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    >
                      Orders
                    </button>
                  </div>
                </div>
              </div>

              {/* Chart Visualizer */}
              <div className="h-72 sm:h-80 pt-6 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-end justify-between gap-1.5 sm:gap-3 2xl:gap-4 relative">
                {/* Background Reference Lines */}
                <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none opacity-30">
                  <div className="border-b border-dashed border-slate-300 dark:border-slate-700 w-full" />
                  <div className="border-b border-dashed border-slate-300 dark:border-slate-700 w-full" />
                  <div className="border-b border-slate-200 dark:border-slate-800 w-full" />
                </div>

                {activeChartData.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold z-10">
                    No sales recorded for this timeframe.
                  </div>
                ) : (
                  activeChartData.map((d, idx) => {
                    const currentVal = chartMetric === "revenue" ? d.revenue : d.count;
                    const heightPct = maxVal > 0 && currentVal > 0 ? Math.min(100, Math.max(8, Math.round((currentVal / maxVal) * 100))) : 0;
                    const hasSales = currentVal > 0;
                    const isLatest = idx === activeChartData.length - 1;

                    return (
                      <div key={d.label + idx} className="flex-1 flex flex-col items-center h-full justify-end group z-10 min-w-0">
                        {/* Hover Tooltip Floating Card */}
                        <div className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity mb-1 whitespace-nowrap text-center pointer-events-none z-20">
                          {chartMetric === "revenue"
                            ? `৳${d.revenue.toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                            : `${d.count} orders`}
                        </div>

                        {/* Bar Pillar */}
                        <div className="w-full max-w-[48px] rounded-2xl flex flex-col justify-end p-0.5 relative h-52 sm:h-56 bg-slate-50 dark:bg-slate-800/40">
                          {hasSales ? (
                            <div
                              style={{ height: `${heightPct}%` }}
                              className={`w-full rounded-xl transition-all duration-500 flex flex-col justify-between p-1 ${
                                isLatest
                                  ? "bg-gradient-to-t from-emerald-600 to-teal-500 shadow-md shadow-emerald-600/30"
                                  : "bg-gradient-to-t from-slate-700 to-slate-500 hover:from-emerald-700 hover:to-emerald-500"
                              }`}
                            >
                              {heightPct > 30 ? (
                                <div className="text-[9px] font-black text-white text-center font-mono truncate">
                                  {chartMetric === "revenue"
                                    ? `৳${d.revenue >= 1000 ? `${(d.revenue / 1000).toFixed(1)}k` : d.revenue}`
                                    : d.count}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full my-auto opacity-60" />
                          )}
                        </div>

                        {/* Label & Date */}
                        <div className="mt-2 text-center w-full truncate">
                          <span className="text-[11px] xl:text-xs font-bold text-slate-700 dark:text-slate-300 block truncate leading-tight">
                            {d.label}
                          </span>
                          {d.subLabel && chartTimeframe !== "month" && (
                            <span className="text-[9px] text-slate-400 block truncate font-medium">
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs xl:text-sm text-slate-400 gap-2 pt-1">
                <span>
                  Showing:{" "}
                  <strong className="text-slate-700 dark:text-slate-300">
                    {chartTimeframe === "day"
                      ? "Today's Hourly Sales"
                      : chartTimeframe === "week"
                      ? "Last 7 Days Sales"
                      : chartTimeframe === "month"
                      ? "Last 30 Days Sales"
                      : "Last 6 Months Trend"}
                  </strong>
                </span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  Total in view: ৳{totalChartRevenue.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({totalChartOrders} {totalChartOrders === 1 ? "order" : "orders"})
                </span>
              </div>
            </div>

            {/* Right 4 Cols: Account Balance Distribution */}
            <div className="lg:col-span-4 p-6 2xl:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm xl:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Account Balance Distribution
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Share of Funds</span>
                </div>

                {rawAccounts.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-medium">
                    No financial accounts created yet.
                  </div>
                ) : (
                  <div className="space-y-4 pt-4">
                    {rawAccounts.map((acc: any) => {
                      const bal = Number(acc.balance || 0);
                      const pct = totalAccountLiquidity > 0 ? Math.round((bal / totalAccountLiquidity) * 100) : 0;
                      const isBank = acc.type === "BANK" || acc.type === "CARD_SETTLEMENT";
                      const isBkash = acc.type === "BKASH" || acc.name.toLowerCase().includes("bkash");
                      const isNagad = acc.type === "NAGAD" || acc.name.toLowerCase().includes("nagad");

                      return (
                        <div key={acc.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs xl:text-sm">
                            <div className="flex items-center gap-2 truncate max-w-[170px]">
                              <div
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isBank
                                    ? "bg-blue-500"
                                    : isBkash
                                    ? "bg-pink-500"
                                    : isNagad
                                    ? "bg-orange-500"
                                    : "bg-emerald-500"
                                }`}
                              />
                              <span className="font-bold text-slate-700 dark:text-slate-300 truncate">
                                {acc.name}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              ৳{bal.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                              <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${Math.min(100, Math.max(bal > 0 ? 3 : 0, pct))}%` }}
                              className={`h-full rounded-full transition-all duration-500 ${
                                isBank
                                  ? "bg-blue-500"
                                  : isBkash
                                  ? "bg-pink-500"
                                  : isNagad
                                  ? "bg-orange-500"
                                  : "bg-emerald-500"
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Total Liquid Capital</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  ৳{totalBalance.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
