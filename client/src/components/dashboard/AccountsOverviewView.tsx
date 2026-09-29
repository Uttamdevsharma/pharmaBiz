"use client";

import React, { useState, useEffect, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import { useBranchContext } from "@/context/BranchContext";
import {
  Wallet,
  Building2,
  Smartphone,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
  Store,
  Banknote,
  AlertCircle,
  PlusCircle,
  ArrowRightLeft,
  ChevronDown,
  PieChart as PieIcon,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";

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
  branchId?: string;
  branchNameStr?: string;
}

interface AccountsOverviewViewProps {
  onNavigate?: (module: OwnerModule) => void;
  selectedBranchId?: string;
}

/**
 * 🌟 Skeleton Loading State for Accounts Overview
 */
function AccountsOverviewSkeleton() {
  return (
    <div className="space-y-3.5 w-full animate-pulse">
      {/* 3 KPI Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 rounded-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded-none" />
              <div className="h-6 w-6 bg-slate-200 dark:bg-slate-800 rounded-none" />
            </div>
            <div className="h-8 w-44 bg-slate-200 dark:bg-slate-800 rounded-none" />
            <div className="h-3 w-36 bg-slate-100 dark:bg-slate-800/60 rounded-none" />
          </div>
        ))}
      </div>

      {/* Active Financial Accounts Skeleton */}
      <div className="p-4 rounded-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded-none" />
          <div className="h-4 w-44 bg-slate-200 dark:bg-slate-800 rounded-none" />
          <div className="h-4 w-6 bg-slate-200 dark:bg-slate-800 rounded-none" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((c) => (
            <div
              key={c}
              className="p-3.5 rounded-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-none bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-700 rounded-none" />
                </div>
                <div className="h-4 w-14 bg-slate-100 dark:bg-slate-800 rounded-none" />
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="h-6 w-28 bg-slate-200 dark:bg-slate-700 rounded-none" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payables Banner Skeleton */}
      <div className="p-3.5 rounded-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-none bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-1">
            <div className="h-3 w-36 bg-slate-200 dark:bg-slate-800 rounded-none" />
            <div className="h-6 w-28 bg-slate-200 dark:bg-slate-800 rounded-none" />
          </div>
        </div>
        <div className="h-7 w-28 bg-slate-200 dark:bg-slate-800 rounded-none" />
      </div>

      {/* Full-Width Telemetry Bar Chart Skeleton */}
      <div className="w-full p-4 rounded-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded-none" />
          <div className="h-6 w-32 bg-slate-100 dark:bg-slate-800 rounded-none" />
        </div>
        <div className="h-56 flex items-end justify-between gap-3 pt-4 px-4">
          {[40, 75, 55, 90, 65, 80, 45].map((h, idx) => (
            <div key={idx} className="flex-1 flex items-end justify-center gap-1.5 h-full">
              <div style={{ height: `${h}%` }} className="w-4 bg-emerald-200/80 dark:bg-emerald-950/60 rounded-none" />
              <div style={{ height: `${Math.round(h * 0.4)}%` }} className="w-4 bg-rose-200/80 dark:bg-rose-950/60 rounded-none" />
            </div>
          ))}
        </div>
      </div>

      {/* Capital Breakdown Donut Skeleton */}
      <div className="w-full p-4 rounded-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="h-4 w-44 bg-slate-200 dark:bg-slate-800 rounded-none pb-3 border-b border-slate-100 dark:border-slate-800" />
        <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
          <div className="w-32 h-32 rounded-full border-8 border-slate-200 dark:border-slate-800" />
          <div className="space-y-3 w-full max-w-md">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-none" />
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-850 rounded-none" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AccountsOverviewView({ onNavigate, selectedBranchId: propBranchId }: AccountsOverviewViewProps = {}) {
  const {
    branches,
    selectedBranchId: contextBranchId,
    setSelectedBranchId: setContextBranchId,
    canSwitchBranch,
  } = useBranchContext();

  const [localBranchId, setLocalBranchId] = useState<string>(
    propBranchId !== undefined ? propBranchId : "all"
  );

  useEffect(() => {
    if (propBranchId !== undefined) {
      setLocalBranchId(propBranchId);
    }
  }, [propBranchId]);

  // Filters
  const [periodPreset, setPeriodPreset] = useState<"today" | "thisWeek" | "thisMonth" | "custom">("thisMonth");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Chart timeframe and display mode states
  const [chartTimeframe, setChartTimeframe] = useState<"week" | "month">("week");
  const [chartMode, setChartMode] = useState<"comparison" | "net">("comparison");

  // Accounts & Overview Data
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active hover point for bar chart tooltip
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const handlePeriodChange = (preset: "today" | "thisWeek" | "thisMonth" | "custom") => {
    setPeriodPreset(preset);
    const now = new Date();

    if (preset === "today") {
      const todayStr = now.toISOString().split("T")[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "thisWeek") {
      const firstDay = new Date(now);
      firstDay.setDate(now.getDate() - now.getDay());
      setStartDate(firstDay.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "thisMonth") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      setStartDate(startOfMonth);
      setEndDate(now.toISOString().split("T")[0]);
    }
  };

  const loadFinancialOverview = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      params.append("branchId", localBranchId || "all");
      if (periodPreset !== "custom") {
        params.append("period", periodPreset);
      }
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const accountsUrl = `/accounting/accounts?branchId=${localBranchId || "all"}`;
      const suppliersUrl =
        localBranchId && localBranchId !== "all"
          ? `/suppliers?branchId=${localBranchId}`
          : "/suppliers";

      const [res, accRes, supRes] = await Promise.all([
        fetchApi<any>(`/accounting/overview?${params.toString()}`, { skipCache: true }),
        fetchApi<FinancialAccount[]>(accountsUrl, { skipCache: true }),
        fetchApi<any>(suppliersUrl, { skipCache: true }),
      ]);

      let supplierDueFromSuppliersList = 0;
      if (supRes?.success && Array.isArray(supRes?.data)) {
        supplierDueFromSuppliersList = supRes.data.reduce(
          (sum: number, s: any) => sum + Number(s.totalDue || s.periodDue || 0),
          0
        );
      }

      if (res.success && res.data) {
        if (res.data.summary) {
          res.data.summary.totalSupplierDues = Math.max(
            Number(res.data.summary.totalSupplierDues || 0),
            supplierDueFromSuppliersList
          );
        }
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
  }, [localBranchId, periodPreset, startDate, endDate]);

  const handleBranchChange = (newBranchId: string) => {
    setLocalBranchId(newBranchId);
    if (canSwitchBranch) {
      setContextBranchId(newBranchId === "all" ? "" : newBranchId);
    }
  };

  // Data computations
  const summary = data?.summary || {
    totalSales: 0,
    totalExpenses: 0,
    netInflow: 0,
    totalSupplierDues: 0,
    totalCustomerDues: 0,
    todayRevenue: 0,
    todayExpenses: 0,
    todayNet: 0,
  };

  const rawAccounts: FinancialAccount[] = accounts.length > 0 ? accounts : (data?.accounts || []);
  const totalBalance = rawAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);

  // Fund category aggregates for the Donut Chart
  const fundCategories = useMemo(() => {
    let cash = 0;
    let bkash = 0;
    let nagad = 0;
    let bank = 0;
    let other = 0;

    for (const acc of rawAccounts) {
      const b = Number(acc.balance || 0);
      const t = String(acc.type || "").toUpperCase();
      const n = (acc.name || "").toLowerCase();

      if (t === "CASH") cash += b;
      else if (t === "BKASH" || n.includes("bkash")) bkash += b;
      else if (t === "NAGAD" || n.includes("nagad")) nagad += b;
      else if (t === "BANK" || t === "CARD_SETTLEMENT") bank += b;
      else other += b;
    }

    const items = [
      { id: "cash", label: "Cash Drawers", amount: cash, color: "#10b981", bgClass: "bg-emerald-500" },
      { id: "bkash", label: "bKash MFS", amount: bkash, color: "#ec4899", bgClass: "bg-pink-500" },
      { id: "nagad", label: "Nagad MFS", amount: nagad, color: "#f97316", bgClass: "bg-orange-500" },
      { id: "bank", label: "Bank Accounts", amount: bank, color: "#3b82f6", bgClass: "bg-blue-500" },
      { id: "other", label: "Other Channels", amount: other, color: "#8b5cf6", bgClass: "bg-purple-500" },
    ].filter((i) => i.amount > 0);

    return items;
  }, [rawAccounts]);

  // Chart data
  const chartDataList = chartTimeframe === "week" ? (data?.last7Days || []) : (data?.last30Days || []);

  const maxChartVal = useMemo(() => {
    return Math.max(
      ...chartDataList.map((d: any) => Math.max(Number(d.revenue || 0), Number(d.expense || 0))),
      1
    );
  }, [chartDataList]);

  const maxNetVal = useMemo(() => {
    return Math.max(
      ...chartDataList.map((d: any) => Math.abs(Number(d.revenue || 0) - Number(d.expense || 0))),
      1
    );
  }, [chartDataList]);

  // Donut chart math
  const donutRadius = 60;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let accumulatedLength = 0;

  return (
    <div className="space-y-3.5 w-full max-w-[1920px] mx-auto pb-10">
      {/* 1. Header (Clean, Title and Top Actions only) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5 font-medium">
            <span>Accounts</span>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">Overview</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Accounts Overview
          </h1>
        </div>

        {/* Quick Top Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {onNavigate && (
            <>
              <button
                onClick={() => onNavigate("acc_financial_accounts")}
                className="px-3 py-1.5 rounded-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>New Account</span>
              </button>
              <button
                onClick={() => onNavigate("acc_fund_transfer")}
                className="px-3 py-1.5 rounded-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 text-blue-500" />
                <span>Transfer Funds</span>
              </button>
              <button
                onClick={() => onNavigate("acc_expenses")}
                className="px-3 py-1.5 rounded-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
              >
                <PlusCircle className="h-3.5 w-3.5 text-rose-500" />
                <span>Record Expense</span>
              </button>
            </>
          )}

          <button
            onClick={() => loadFinancialOverview(true)}
            disabled={refreshing}
            className="px-2.5 py-1.5 rounded-none bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition flex items-center gap-1.5"
            title="Refresh Overview"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="p-2.5 rounded-none bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Branch Filter */}
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Branch:</span>
          <div className="relative">
            <select
              value={localBranchId}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold py-1.5 pl-2.5 pr-7 rounded-none focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">🏢 All Branches (Consolidated)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  📍 {b.name}
                </option>
              ))}
            </select>
            <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Time Period Filter */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">Period:</span>
          {[
            { id: "today", label: "Today" },
            { id: "thisWeek", label: "This Week" },
            { id: "thisMonth", label: "This Month" },
            { id: "custom", label: "Custom" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => handlePeriodChange(p.id as any)}
              className={`px-2.5 py-1 rounded-none text-xs font-semibold transition ${
                periodPreset === p.id
                  ? "bg-emerald-600 text-white shadow-2xs font-bold"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {p.label}
            </button>
          ))}

          {periodPreset === "custom" && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-none border border-slate-200 dark:border-slate-700 text-xs ml-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 outline-hidden"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 outline-hidden"
              />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        /* 🚀 High-Fidelity Skeleton Loading */
        <AccountsOverviewSkeleton />
      ) : (
        <>
          {/* 3. Primary KPI Cards - All 3 Light-Mode Consistent & Sharp Borders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Total Balance - Light mode consistent */}
            <div className="p-4 sm:p-4.5 rounded-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <span>Total Balance</span>
                <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-none">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                ৳{totalBalance.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-400 font-medium">Cash Drawers + Bank + Mobile Wallets</div>
            </div>

            {/* Total Inflow */}
            <div className="p-4 sm:p-4.5 rounded-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <span>Total Inflow (Cash In)</span>
                <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-none">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                +৳{Number(summary.totalSales || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Sales & Collections</span>
                {summary.todayRevenue > 0 && (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    Today: ৳{Number(summary.todayRevenue).toLocaleString("en-BD")}
                  </span>
                )}
              </div>
            </div>

            {/* Total Outflow */}
            <div className="p-4 sm:p-4.5 rounded-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <span>Total Outflow (Cash Out)</span>
                <div className="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-none">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono tracking-tight">
                -৳{Number(summary.totalExpenses || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Expenses & Salaries</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Net: ৳{(Number(summary.totalSales || 0) - Number(summary.totalExpenses || 0)).toLocaleString("en-BD")}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Active Financial Accounts Section (Clean, Modern, No Redundant Tabs) */}
          <div className="p-3.5 sm:p-4 rounded-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Active Financial Accounts
              </h3>
              <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-none font-bold font-mono">
                {rawAccounts.length}
              </span>
            </div>

            {rawAccounts.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-none border border-dashed border-slate-200 dark:border-slate-700">
                <Wallet className="h-6 w-6 text-slate-400 mx-auto mb-1.5 opacity-60" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  No active financial accounts found
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
                {rawAccounts.map((acc: any) => {
                  const isBank = acc.type === "BANK" || acc.type === "CARD_SETTLEMENT";
                  const isBkash = acc.type === "BKASH" || (acc.name || "").toLowerCase().includes("bkash");
                  const isNagad = acc.type === "NAGAD" || (acc.name || "").toLowerCase().includes("nagad");
                  const bal = Number(acc.balance || 0);

                  const badgeLabel = isBank ? "Bank" : isBkash ? "bKash" : isNagad ? "Nagad" : "Cash Drawer";
                  const badgeColor = isBank
                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900"
                    : isBkash
                    ? "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-900"
                    : isNagad
                    ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-900"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900";

                  return (
                    <div
                      key={acc.id}
                      className="p-3.5 rounded-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-none flex items-center justify-center shrink-0 border ${
                              isBank
                                ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900"
                                : isBkash
                                ? "bg-pink-50 text-pink-600 border-pink-200 dark:bg-pink-950/40 dark:text-pink-400 dark:border-pink-900"
                                : isNagad
                                ? "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900"
                                : "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900"
                            }`}
                          >
                            {isBank ? (
                              <Building2 className="h-3.5 w-3.5" />
                            ) : isBkash || isNagad ? (
                              <Smartphone className="h-3.5 w-3.5" />
                            ) : (
                              <Banknote className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {acc.name}
                          </span>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-none border shrink-0 ${badgeColor}`}>
                          {badgeLabel}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="font-black text-base sm:text-lg font-mono text-slate-900 dark:text-white">
                          ৳{bal.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {acc.branchNameStr && (
                          <span className="text-[10px] text-slate-400 font-medium truncate max-w-[100px]">
                            {acc.branchNameStr}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. Supplier Payables Banner (Clean, Crisp, Sharp) */}
          <div className="p-3.5 sm:p-4 rounded-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 rounded-none border border-rose-200 dark:border-rose-900/60 shrink-0">
                <AlertCircle className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                  Supplier Payables (Outstanding Dues)
                </span>
                <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                  ৳{Number(summary.totalSupplierDues || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {onNavigate && (
              <button
                onClick={() => onNavigate("sup_payments_due")}
                className="px-3.5 py-1.5 rounded-none bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs self-start sm:self-auto cursor-pointer"
              >
                <span>View Due Invoices</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* 6. FULL-WIDTH FINANCIAL CASH FLOW TELEMETRY CHART */}
          <div className="w-full p-4 sm:p-5 rounded-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3.5">
            {/* Short Heading and Controls Only (No redundant descriptions) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Financial Cash Flow Telemetry
                </h3>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {/* Mode Selector */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-none text-[11px] font-semibold">
                  <button
                    onClick={() => setChartMode("comparison")}
                    className={`px-2.5 py-0.5 rounded-none transition ${
                      chartMode === "comparison"
                        ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                    title="Dual Bar Inflow vs Outflow Comparison"
                  >
                    Dual Bars
                  </button>
                  <button
                    onClick={() => setChartMode("net")}
                    className={`px-2.5 py-0.5 rounded-none transition ${
                      chartMode === "net"
                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                    title="Net Daily Cash Margin (Profit / Deficit)"
                  >
                    Net Flow
                  </button>
                </div>

                {/* Timeframe Selector */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-none text-[11px] font-semibold">
                  <button
                    onClick={() => setChartTimeframe("week")}
                    className={`px-2.5 py-0.5 rounded-none transition ${
                      chartTimeframe === "week"
                        ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    7 Days
                  </button>
                  <button
                    onClick={() => setChartTimeframe("month")}
                    className={`px-2.5 py-0.5 rounded-none transition ${
                      chartTimeframe === "month"
                        ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    30 Days
                  </button>
                </div>
              </div>
            </div>

            {/* Chart Canvas Area (Full width) */}
            <div className="h-64 sm:h-72 relative flex flex-col justify-end pt-3 pb-2">
              {/* Horizontal Guide Grid Lines with currency scale marks */}
              <div className="absolute inset-x-0 top-3 bottom-7 flex flex-col justify-between pointer-events-none">
                {[1, 0.66, 0.33, 0].map((ratio, i) => {
                  const val = Math.round(maxChartVal * ratio);
                  return (
                    <div key={i} className="flex items-center gap-2 w-full text-[9px] font-mono text-slate-400/80">
                      <span className="w-12 text-right shrink-0 select-none">
                        {val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                      </span>
                      <div className={`flex-1 border-b ${i === 3 ? "border-slate-300 dark:border-slate-700" : "border-slate-200/60 dark:border-slate-800 border-dashed"}`} />
                    </div>
                  );
                })}
              </div>

              {chartDataList.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-semibold z-10">
                  No transactions recorded for this selected timeframe.
                </div>
              ) : (
                <div className="flex items-end justify-between gap-1 sm:gap-3 pl-14 pr-2 h-52 sm:h-60 relative z-10">
                  {chartDataList.map((d: any, idx: number) => {
                    const rev = Number(d.revenue || 0);
                    const exp = Number(d.expense || 0);
                    const net = rev - exp;
                    const isHovered = hoveredBarIndex === idx;

                    const revHeightPct = maxChartVal > 0 && rev > 0 ? Math.min(100, Math.max(5, (rev / maxChartVal) * 100)) : 0;
                    const expHeightPct = maxChartVal > 0 && exp > 0 ? Math.min(100, Math.max(5, (exp / maxChartVal) * 100)) : 0;
                    const netHeightPct = maxNetVal > 0 && Math.abs(net) > 0 ? Math.min(100, Math.max(6, (Math.abs(net) / maxNetVal) * 100)) : 0;

                    return (
                      <div
                        key={d.dateKey || d.date || idx}
                        className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                        onMouseEnter={() => setHoveredBarIndex(idx)}
                        onMouseLeave={() => setHoveredBarIndex(null)}
                      >
                        {/* Column hover background highlight */}
                        <div
                          className={`absolute inset-x-0 bottom-6 top-0 rounded-none transition-colors pointer-events-none ${
                            isHovered ? "bg-slate-100/90 dark:bg-slate-800/60" : "hover:bg-slate-50/50"
                          }`}
                        />

                        {/* Hover Tooltip Card with exact data breakdown */}
                        {isHovered && (
                          <div className="absolute -top-16 z-30 bg-slate-900 text-white text-[10px] font-mono py-1.5 px-2.5 rounded-none shadow-xl border border-slate-700 pointer-events-none text-left whitespace-nowrap min-w-[130px]">
                            <div className="font-bold text-slate-300 pb-1 mb-1 border-b border-slate-800 flex items-center justify-between gap-2">
                              <span>{d.date} ({d.dayName})</span>
                              {d.orderCount !== undefined && (
                                <span className="text-[9px] text-slate-400 font-normal">{d.orderCount} sales</span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2 text-emerald-400 font-semibold">
                              <span>Inflow:</span>
                              <span>+৳{rev.toLocaleString("en-BD")}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-rose-400 font-semibold">
                              <span>Outflow:</span>
                              <span>-৳{exp.toLocaleString("en-BD")}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 pt-0.5 mt-0.5 border-t border-slate-800 font-bold">
                              <span className="text-slate-400">Net:</span>
                              <span className={net >= 0 ? "text-emerald-400" : "text-rose-400"}>
                                {net >= 0 ? "+" : ""}৳{net.toLocaleString("en-BD")}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Render Bar Graphics based on selected chartMode */}
                        <div className="w-full max-w-[28px] sm:max-w-[36px] flex items-end justify-center gap-1 sm:gap-1.5 h-44 sm:h-52 relative z-10 pb-0.5">
                          {chartMode === "comparison" ? (
                            <>
                              {/* Income Bar Pillar */}
                              <div
                                style={{ height: `${revHeightPct}%` }}
                                className={`w-full rounded-none transition-all duration-300 ${
                                  rev > 0
                                    ? "bg-gradient-to-t from-emerald-600 to-emerald-400 hover:from-emerald-500 hover:to-emerald-300 shadow-2xs"
                                    : "bg-transparent"
                                }`}
                              />
                              {/* Expense Bar Pillar */}
                              <div
                                style={{ height: `${expHeightPct}%` }}
                                className={`w-full rounded-none transition-all duration-300 ${
                                  exp > 0
                                    ? "bg-gradient-to-t from-rose-600 to-rose-400 hover:from-rose-500 hover:to-rose-300 shadow-2xs"
                                    : "bg-transparent"
                                }`}
                              />
                            </>
                          ) : (
                            /* Net Cash Margin Mode */
                            <div
                              style={{ height: `${netHeightPct}%` }}
                              className={`w-full max-w-[18px] rounded-none transition-all duration-300 ${
                                net >= 0
                                  ? "bg-gradient-to-t from-emerald-600 to-emerald-400"
                                  : "bg-gradient-to-t from-rose-600 to-rose-400"
                              }`}
                            />
                          )}
                        </div>

                        {/* Date and Day Label below the baseline */}
                        <div className="mt-1 text-center w-full truncate relative z-10">
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
                            {chartTimeframe === "week" ? d.dayName : d.date}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chart Legend & Status Footer */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
              {chartMode === "comparison" ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-none bg-emerald-500" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Cash Inflow</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-none bg-rose-500" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Cash Outflow</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-none bg-emerald-500" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Net Profit Margin</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-none bg-rose-500" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Operating Deficit</span>
                  </div>
                </div>
              )}

              <span className="text-[10px] text-slate-400 font-mono">
                {chartTimeframe === "week" ? "Trailing 7 Days" : "Trailing 30 Days"}
              </span>
            </div>
          </div>

          {/* 7. CAPITAL BREAKDOWN & PIE/DONUT CHART (Placed Below Telemetry Chart) */}
          <div className="w-full p-4 sm:p-5 rounded-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Capital Breakdown & Fund Distribution
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Liquid:</span>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                  ৳{totalBalance.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {fundCategories.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-semibold my-auto">
                No active account funds found.
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center justify-around gap-6 py-2">
                {/* SVG Donut Circle */}
                <div className="relative w-36 h-36 shrink-0">
                  <svg className="w-full h-full" viewBox="0 0 160 160">
                    <circle
                      cx="80"
                      cy="80"
                      r={donutRadius}
                      fill="transparent"
                      stroke="#e2e8f0"
                      className="dark:stroke-slate-800"
                      strokeWidth="14"
                    />

                    {fundCategories.map((cat) => {
                      const pct = totalBalance > 0 ? cat.amount / totalBalance : 0;
                      const dashLength = pct * donutCircumference;
                      const dashOffset = -accumulatedLength;
                      accumulatedLength += dashLength;

                      return (
                        <circle
                          key={cat.id}
                          cx="80"
                          cy="80"
                          r={donutRadius}
                          fill="transparent"
                          stroke={cat.color}
                          strokeWidth="14"
                          strokeDasharray={`${dashLength} ${donutCircumference - dashLength}`}
                          strokeDashoffset={dashOffset}
                          transform="rotate(-90 80 80)"
                          className="transition-all duration-500"
                        />
                      );
                    })}
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
                    <span className="text-xs font-black font-mono text-slate-900 dark:text-white truncate max-w-[90px]">
                      ৳{totalBalance >= 100000 ? `${(totalBalance / 1000).toFixed(0)}k` : totalBalance.toFixed(0)}
                    </span>
                  </div>
                </div>

                {/* Fund Allocation Details with Progress Bars */}
                <div className="space-y-3 w-full max-w-xl">
                  {fundCategories.map((cat) => {
                    const pct = totalBalance > 0 ? Math.round((cat.amount / totalBalance) * 100) : 0;
                    return (
                      <div key={cat.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <span className={`w-2.5 h-2.5 rounded-none shrink-0 ${cat.bgClass}`} />
                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate text-xs">
                              {cat.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                              ৳{cat.amount.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs w-8 text-right">
                              {pct}%
                            </span>
                          </div>
                        </div>
                        {/* Mini Progress Bar */}
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-none overflow-hidden">
                          <div
                            style={{ width: `${pct}%`, backgroundColor: cat.color }}
                            className="h-full rounded-none transition-all duration-300"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
