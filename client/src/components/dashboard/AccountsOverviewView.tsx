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
  Loader2,
  Store,
  Banknote,
  AlertCircle,
  PlusCircle,
  ArrowRightLeft,
  ChevronDown,
  PieChart as PieIcon,
  BarChart3,
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

export function AccountsOverviewView({ onNavigate, selectedBranchId: propBranchId }: AccountsOverviewViewProps = {}) {
  const {
    branches,
    selectedBranchId: contextBranchId,
    setSelectedBranchId: setContextBranchId,
    canSwitchBranch,
  } = useBranchContext();

  // Default to 'all' so Accounts Overview provides a consolidated multi-branch financial view
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

  // Chart timeframe state
  const [chartTimeframe, setChartTimeframe] = useState<"week" | "month">("week");

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
      if (localBranchId && localBranchId !== "all") {
        params.append("branchId", localBranchId);
      }
      if (periodPreset !== "custom") {
        params.append("period", periodPreset);
      }
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const accountsUrl =
        localBranchId && localBranchId !== "all"
          ? `/accounting/accounts?branchId=${localBranchId}`
          : "/accounting/accounts";

      const suppliersUrl =
        localBranchId && localBranchId !== "all"
          ? `/suppliers?branchId=${localBranchId}`
          : "/suppliers";

      const [res, accRes, supRes] = await Promise.all([
        fetchApi<any>(`/accounting/overview?${params.toString()}`),
        fetchApi<FinancialAccount[]>(accountsUrl),
        fetchApi<any>(suppliersUrl),
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
      { id: "cash", label: "Cash Drawer", amount: cash, color: "#10b981", borderClass: "border-emerald-500", bgClass: "bg-emerald-500" },
      { id: "bkash", label: "bKash", amount: bkash, color: "#ec4899", borderClass: "border-pink-500", bgClass: "bg-pink-500" },
      { id: "nagad", label: "Nagad", amount: nagad, color: "#f97316", borderClass: "border-orange-500", bgClass: "bg-orange-500" },
      { id: "bank", label: "Bank Accounts", amount: bank, color: "#3b82f6", borderClass: "border-blue-500", bgClass: "bg-blue-500" },
      { id: "other", label: "Other Accounts", amount: other, color: "#8b5cf6", borderClass: "border-purple-500", bgClass: "bg-purple-500" },
    ].filter((i) => i.amount > 0);

    return items;
  }, [rawAccounts]);

  // Chart data
  const chartDataList = chartTimeframe === "week" ? (data?.last7Days || []) : (data?.last30Days || []);
  const maxChartVal = Math.max(
    ...chartDataList.map((d: any) => Math.max(Number(d.revenue || 0), Number(d.expense || 0))),
    1
  );

  // Donut chart math
  const donutRadius = 60;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let accumulatedLength = 0;

  return (
    <div className="space-y-5 w-full max-w-[1920px] mx-auto pb-10">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
            <span>Accounts</span>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">Overview</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            Accounts Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time balances, income vs expense telemetry, and multi-channel liquidity.
          </p>
        </div>

        {/* Quick Top Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {onNavigate && (
            <>
              <button
                onClick={() => onNavigate("acc_expenses")}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="h-3.5 w-3.5 text-rose-500" />
                <span>New Expense</span>
              </button>
              <button
                onClick={() => onNavigate("acc_fund_transfer")}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 text-blue-500" />
                <span>Transfer</span>
              </button>
            </>
          )}

          <button
            onClick={() => loadFinancialOverview(true)}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition flex items-center gap-1.5"
            title="Refresh Overview"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Branch Filter */}
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Branch:</span>
          <div className="relative">
            <select
              value={localBranchId}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold py-1.5 pl-2.5 pr-7 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">All Branches (Consolidated)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Time Period Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
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
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                periodPreset === p.id
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {p.label}
            </button>
          ))}

          {periodPreset === "custom" && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs ml-1">
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
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-2">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
          <span className="text-xs font-semibold">Loading accounts data...</span>
        </div>
      ) : (
        <>
          {/* 3. Primary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {/* Total Balance */}
            <div className="p-6 sm:p-7 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-sm space-y-2.5 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">
                <span>Total Balance</span>
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <Wallet className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono tracking-tight text-white">
                ৳{totalBalance.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs sm:text-sm text-slate-400">Cash Drawers + Bank Accounts + Digital Wallets</div>
            </div>

            {/* Total Inflow */}
            <div className="p-6 sm:p-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <span>Total Inflow (Cash In)</span>
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                +৳{Number(summary.totalSales || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center justify-between text-xs sm:text-sm text-slate-400">
                <span>Sales, Collections & Deposits</span>
                {summary.todayRevenue > 0 && (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    Today: ৳{Number(summary.todayRevenue).toLocaleString("en-BD")}
                  </span>
                )}
              </div>
            </div>

            {/* Total Outflow */}
            <div className="p-6 sm:p-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <span>Total Outflow (Cash Out)</span>
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg">
                  <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
                -৳{Number(summary.totalExpenses || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center justify-between text-xs sm:text-sm text-slate-400">
                <span>Bills, Rent, Salaries & Expenses</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Net: ৳{(Number(summary.totalSales || 0) - Number(summary.totalExpenses || 0)).toLocaleString("en-BD")}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Dynamic Financial Accounts Section */}
          <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Active Financial Accounts</h3>
                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full font-bold">
                  {rawAccounts.length}
                </span>
              </div>

              {onNavigate && (
                <button
                  onClick={() => onNavigate("acc_financial_accounts")}
                  className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Manage Accounts &rarr;
                </button>
              )}
            </div>

            {rawAccounts.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <Wallet className="h-8 w-8 text-slate-400 mx-auto mb-2 opacity-60" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No financial accounts found</p>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate("acc_financial_accounts")}
                    className="mt-3 px-4 py-1.5 bg-emerald-600 text-white text-xs sm:text-sm font-bold rounded-lg hover:bg-emerald-700 transition"
                  >
                    + Create First Account
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {rawAccounts.map((acc: any) => {
                  const isBank = acc.type === "BANK" || acc.type === "CARD_SETTLEMENT";
                  const isBkash = acc.type === "BKASH" || acc.name.toLowerCase().includes("bkash");
                  const isNagad = acc.type === "NAGAD" || acc.name.toLowerCase().includes("nagad");
                  const bal = Number(acc.balance || 0);
                  const pct = totalBalance > 0 ? Math.round((bal / totalBalance) * 100) : 0;

                  return (
                    <div
                      key={acc.id}
                      className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3.5 hover:border-slate-400 dark:hover:border-slate-600 transition shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`p-2.5 rounded-lg shrink-0 ${
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
                              <Building2 className="h-5 w-5" />
                            ) : isBkash || isNagad ? (
                              <Smartphone className="h-5 w-5" />
                            ) : (
                              <Banknote className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                              {acc.name}
                            </div>
                            <div className="text-xs text-slate-400 font-mono truncate">
                              {isBank
                                ? acc.bankName || "Bank"
                                : isBkash
                                ? "bKash Wallet"
                                : isNagad
                                ? "Nagad Wallet"
                                : "Cash Till"}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {acc.isDefault && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded">
                              Default
                            </span>
                          )}
                          {acc.branchNameStr && (
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium px-2 py-0.5 rounded truncate max-w-[85px]">
                              {acc.branchNameStr}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">
                          Balance <span className="text-slate-400 font-normal">({pct}%)</span>
                        </span>
                        <span className="font-black text-base sm:text-lg lg:text-xl font-mono text-slate-900 dark:text-white">
                          ৳{bal.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. Supplier Payables (Dues) */}
          <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold text-rose-500 uppercase tracking-wider block">
                  Supplier Payables (Company Dues)
                </span>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                  ৳{Number(summary.totalSupplierDues || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {onNavigate && (
              <button
                onClick={() => onNavigate("sup_payments_due")}
                className="px-4 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
              >
                <span>View Due Invoices</span>
                <span>&rarr;</span>
              </button>
            )}
          </div>

          {/* 6. Visual Charts Section: Income vs Expense & Fund Distribution Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 7 cols: Income vs Expense Bar Visualizer */}
            <div className="lg:col-span-7 p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Income vs Expense</h3>
                </div>

                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                  <button
                    onClick={() => setChartTimeframe("week")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                      chartTimeframe === "week"
                        ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    7 Days
                  </button>
                  <button
                    onClick={() => setChartTimeframe("month")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                      chartTimeframe === "month"
                        ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    30 Days
                  </button>
                </div>
              </div>

              {/* Bar Chart Canvas */}
              <div className="h-56 sm:h-64 pt-2 pb-1 border-b border-slate-100 dark:border-slate-800 flex items-end justify-between gap-1 sm:gap-2 relative">
                {/* Horizontal reference grid lines */}
                <div className="absolute inset-x-0 top-3 bottom-5 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className="border-b border-dashed border-slate-400 dark:border-slate-600 w-full" />
                  <div className="border-b border-dashed border-slate-400 dark:border-slate-600 w-full" />
                  <div className="border-b border-slate-300 dark:border-slate-700 w-full" />
                </div>

                {chartDataList.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-semibold z-10">
                    No transaction telemetry for this timeframe.
                  </div>
                ) : (
                  chartDataList.map((d: any, idx: number) => {
                    const rev = Number(d.revenue || 0);
                    const exp = Number(d.expense || 0);
                    const revPct = maxChartVal > 0 && rev > 0 ? Math.min(100, Math.max(5, Math.round((rev / maxChartVal) * 100))) : 0;
                    const expPct = maxChartVal > 0 && exp > 0 ? Math.min(100, Math.max(5, Math.round((exp / maxChartVal) * 100))) : 0;
                    const isHovered = hoveredBarIndex === idx;

                    return (
                      <div
                        key={d.dateKey || d.date || idx}
                        className="flex-1 flex flex-col items-center h-full justify-end relative z-10 min-w-0"
                        onMouseEnter={() => setHoveredBarIndex(idx)}
                        onMouseLeave={() => setHoveredBarIndex(null)}
                      >
                        {/* Hover Tooltip */}
                        {isHovered && (
                          <div className="absolute -top-12 z-30 bg-slate-900 text-white text-[10px] font-mono py-1 px-2 rounded-md shadow-lg border border-slate-700 whitespace-nowrap pointer-events-none text-center">
                            <span className="block font-bold text-emerald-400">In: ৳{rev.toLocaleString("en-BD")}</span>
                            <span className="block font-bold text-rose-400">Out: ৳{exp.toLocaleString("en-BD")}</span>
                          </div>
                        )}

                        {/* Dual Pillar */}
                        <div className="w-full max-w-[32px] rounded-lg flex items-end justify-center gap-1 p-0.5 h-44 sm:h-48 bg-slate-50 dark:bg-slate-800/40">
                          {/* Income Bar (Green) */}
                          <div
                            style={{ height: `${revPct}%` }}
                            className={`flex-1 rounded-t-sm transition-all duration-300 ${
                              rev > 0 ? "bg-emerald-500 hover:bg-emerald-600" : "bg-transparent"
                            }`}
                          />
                          {/* Expense Bar (Rose) */}
                          <div
                            style={{ height: `${expPct}%` }}
                            className={`flex-1 rounded-t-sm transition-all duration-300 ${
                              exp > 0 ? "bg-rose-500 hover:bg-rose-600" : "bg-transparent"
                            }`}
                          />
                        </div>

                        {/* Label */}
                        <div className="mt-1.5 text-center w-full truncate">
                          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block truncate">
                            {chartTimeframe === "week" ? d.dayName : d.date}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chart Legend */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Sales Inflow</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Expenses Outflow</span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {chartTimeframe === "week" ? "Last 7 Days" : "Last 30 Days"}
                </span>
              </div>
            </div>

            {/* Right 5 cols: Fund Distribution Donut Chart */}
            <div className="lg:col-span-5 p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <PieIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Fund Distribution</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Share of Capital</span>
              </div>

              {fundCategories.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-semibold my-auto">
                  No account funds recorded.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
                  {/* SVG Donut Circle */}
                  <div className="relative w-40 h-40 shrink-0">
                    <svg className="w-full h-full" viewBox="0 0 160 160">
                      {/* Background track */}
                      <circle
                        cx="80"
                        cy="80"
                        r={donutRadius}
                        fill="transparent"
                        stroke="#e2e8f0"
                        className="dark:stroke-slate-800"
                        strokeWidth="18"
                      />

                      {/* Dynamic Segments */}
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
                            strokeWidth="18"
                            strokeDasharray={`${dashLength} ${donutCircumference - dashLength}`}
                            strokeDashoffset={dashOffset}
                            transform="rotate(-90 80 80)"
                            className="transition-all duration-500"
                          />
                        );
                      })}
                    </svg>

                    {/* Donut Center Info */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
                      <span className="text-xs font-black font-mono text-slate-900 dark:text-white truncate max-w-[100px]">
                        ৳{totalBalance >= 100000 ? `${(totalBalance / 1000).toFixed(0)}k` : totalBalance.toFixed(0)}
                      </span>
                    </div>
                  </div>

                  {/* Category Legend List */}
                  <div className="space-y-2 w-full max-w-[210px]">
                    {fundCategories.map((cat) => {
                      const pct = totalBalance > 0 ? Math.round((cat.amount / totalBalance) * 100) : 0;
                      return (
                        <div key={cat.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cat.bgClass}`} />
                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                              {cat.label}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0 ml-2">
                            {pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Consolidated Net Liquidity</span>
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
