"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { OwnerModule } from "./DashboardSidebar";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertTriangle,
  Package,
  Wallet,
  Building2,
  Smartphone,
  CreditCard,
  ArrowRight,
  Sparkles,
  Layers,
  Award,
  RefreshCw,
  BarChart3,
  Calendar,
  CheckCircle2,
  Percent,
  LayoutDashboard,
  Store,
  ShieldAlert,
  Info,
  CalendarDays,
  Filter,
} from "lucide-react";

interface OverviewModuleProps {
  onNavigate: (module: OwnerModule) => void;
}

type PeriodFilter = "today" | "yesterday" | "7d" | "30d" | "custom";

export function OverviewModule({ onNavigate }: OverviewModuleProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  
  // Date filter states
  const [period, setPeriod] = useState<PeriodFilter>("30d");
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  const isBranchRestricted = ["BRANCH_MANAGER", "MANAGER", "CASHIER", "INVENTORY_EXECUTIVE"].includes(user?.role || "");

  // Load branch list for owners
  useEffect(() => {
    if (!isBranchRestricted) {
      fetchApi<any[]>("/branches").then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setBranches(res.data);
        }
      }).catch(() => {});
    }
  }, [isBranchRestricted]);

  const loadDashboard = async (showFullSpinner = false) => {
    try {
      if (showFullSpinner) setLoading(true);
      else setRefreshing(true);

      const params = new URLSearchParams();
      params.set("period", period);
      
      if (!isBranchRestricted && selectedBranchId && selectedBranchId !== "all") {
        params.set("branchId", selectedBranchId);
      }
      
      if (period === "custom") {
        if (customStartDate) params.set("startDate", customStartDate);
        if (customEndDate) params.set("endDate", customEndDate);
      }

      const dashRes = await fetchApi<any>(`/reports/dashboard?${params.toString()}`);
      if (dashRes.success && dashRes.data) {
        setDashboardData(dashRes.data);
      }
    } catch (err) {
      console.warn("Error loading dashboard analytics", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard(true);
  }, [period, selectedBranchId]);

  const handleApplyCustomDate = () => {
    if (period === "custom") {
      loadDashboard(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-500 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <span className="text-sm font-semibold">Loading real-time branch analytics...</span>
      </div>
    );
  }

  const summary = dashboardData?.summary || {};
  const charts = dashboardData?.charts || {};
  const alerts = dashboardData?.alerts || {};
  const branchList: any[] = dashboardData?.branchWisePerformance || [];
  const trendData: any[] = charts.dailySalesTrend || [];

  const maxRevenue = Math.max(...trendData.map((d: any) => d.revenue || 0), 100);
  const totalPeriodRevenue = trendData.reduce((sum: number, d: any) => sum + (d.revenue || 0), 0);
  const totalPeriodProfit = trendData.reduce((sum: number, d: any) => sum + (d.profit || 0), 0);

  // Payment Breakdown
  const paymentBreakdown = charts.paymentBreakdown || { CASH: 0, BKASH: 0, NAGAD: 0, CARD: 0, OTHER: 0 };
  const totalPayment =
    (paymentBreakdown.CASH || 0) +
    (paymentBreakdown.BKASH || 0) +
    (paymentBreakdown.NAGAD || 0) +
    (paymentBreakdown.CARD || 0) +
    (paymentBreakdown.OTHER || 0) || 1;

  const cashPercent = Math.round(((paymentBreakdown.CASH || 0) / totalPayment) * 100);
  const bkashPercent = Math.round(((paymentBreakdown.BKASH || 0) / totalPayment) * 100);
  const nagadPercent = Math.round(((paymentBreakdown.NAGAD || 0) / totalPayment) * 100);
  const cardPercent = Math.round(((paymentBreakdown.CARD || 0) / totalPayment) * 100);
  const otherPercent = Math.max(0, 100 - (cashPercent + bkashPercent + nagadPercent + cardPercent));

  // Category Distribution
  const categoryList: any[] = charts.categoryDistribution || [];
  const topProducts: any[] = charts.topSellingProducts || [];

  const branchDisplayName = summary.branchName || (isBranchRestricted ? "Assigned Branch" : "All Branches");

  return (
    <div className="space-y-6 w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* TOP HEADER & BRANCH / DATE FILTER CONTROLS */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl xl:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                <LayoutDashboard className="h-6 w-6 sm:h-7 sm:w-7 xl:h-8 xl:w-8 text-brand-primary" />
                <span>
                  {isBranchRestricted ? `${branchDisplayName} Dashboard` : "Pharmacy Enterprise Dashboard"}
                </span>
              </h1>
              <span className={`text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                isBranchRestricted
                  ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                  : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              }`}>
                {isBranchRestricted ? "Branch Manager Scope" : "Multi-Branch Live"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {isBranchRestricted
                ? `Real-time stock valuation, sales performance, transit loss tracking and net profit for ${branchDisplayName}.`
                : "Real sales revenue, verified stock purchase valuation, gross profit, transit losses, and net profit across company branches."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Branch Switcher for Company Owners */}
            {!isBranchRestricted && (
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-slate-400" />
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="px-3 py-2 text-xs sm:text-sm font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="all">🏢 All Branches (Company-Wide)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      📍 {b.name} {b.location ? `(${b.location})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => loadDashboard(false)}
              disabled={refreshing}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
              title="Refresh Analytics"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-brand-primary" : ""}`} />
            </button>

            <button
              onClick={() => onNavigate("pos")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-primary hover:opacity-95 text-white text-xs sm:text-sm font-bold shadow-md transition active:scale-95 cursor-pointer"
            >
              <ShoppingCart className="h-4 w-4" />
              Launch POS Counter
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DATE RANGE FILTER CONTROLS */}
        {/* ========================================================================= */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <CalendarDays className="h-3.5 w-3.5 text-brand-primary" />
              Date Filter:
            </span>

            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl gap-1">
              <button
                onClick={() => setPeriod("today")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                  period === "today"
                    ? "bg-white dark:bg-slate-700 text-brand-primary shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setPeriod("yesterday")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                  period === "yesterday"
                    ? "bg-white dark:bg-slate-700 text-brand-primary shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Yesterday
              </button>
              <button
                onClick={() => setPeriod("7d")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                  period === "7d"
                    ? "bg-white dark:bg-slate-700 text-brand-primary shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setPeriod("30d")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                  period === "30d"
                    ? "bg-white dark:bg-slate-700 text-brand-primary shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setPeriod("custom")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                  period === "custom"
                    ? "bg-white dark:bg-slate-700 text-brand-primary shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {/* Custom Date Pickers */}
          {period === "custom" && (
            <div className="flex items-center gap-2 flex-wrap bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 animate-in fade-in duration-150">
              <span className="text-[11px] font-semibold text-slate-500 pl-1">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              />
              <span className="text-[11px] font-semibold text-slate-500">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              />
              <button
                onClick={handleApplyCustomDate}
                className="px-3 py-1 text-xs font-bold bg-brand-primary text-white rounded-xl shadow-xs hover:opacity-95"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6 MEANINGFUL REAL-TIME KPI CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Total Stock / Stock Cost Value */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Current Stock Value</span>
            <Package className="h-4 w-4 text-brand-primary" />
          </div>
          <div>
            <div className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              ৳{Number(summary.totalStockCostValue || summary.totalInventoryValue || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-semibold">
              {Number(summary.totalStockUnits || 0).toLocaleString()} stock units on shelf
            </div>
          </div>
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="text-amber-600 font-semibold">{summary.lowStockCount || 0} low stock</span>
            <span className="text-rose-500 font-semibold">{summary.nearExpiryCount || 0} near expiry</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Actual purchase cost price of current available inventory.
          </p>
        </div>

        {/* 2. Total Sales Revenue */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-brand-primary to-indigo-800 text-white shadow-lg relative overflow-hidden flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between opacity-85 text-xs font-bold uppercase tracking-wider">
            <span>Sales Revenue</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <div className="text-2xl xl:text-3xl font-black font-mono tracking-tight">
              ৳{Number(summary.totalSalesRevenue || summary.totalRevenue || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs opacity-90 mt-1 font-semibold">
              {summary.totalSalesCount ?? summary.totalSales ?? 0} customer orders completed
            </div>
          </div>
          <div className="pt-2.5 border-t border-white/20 flex items-center justify-between text-[11px] opacity-90">
            <span>Selected period income</span>
            <span className="font-bold uppercase tracking-wider text-[10px]">{period}</span>
          </div>
          <p className="text-[10px] opacity-80 leading-tight">
            Total money received from completed sales in the selected period.
          </p>
        </div>

        {/* 3. Cost of Sold Products (COGS) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Cost of Sold Products</span>
            <Layers className="h-4 w-4 text-indigo-500" />
          </div>
          <div>
            <div className="text-2xl xl:text-3xl font-black text-slate-800 dark:text-slate-200 font-mono tracking-tight">
              ৳{Number(summary.totalCostOfSold || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-semibold">
              Original purchase cost of items sold
            </div>
          </div>
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-medium">
            Strict batch purchase prices
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Exact cost spent to buy the medicines that were sold.
          </p>
        </div>

        {/* 4. Total Gross Profit */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            <span>Gross Profit</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-2xl xl:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
              ৳{Number(summary.totalGrossProfit || summary.totalProfit || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-semibold">
              <span>Gross Margin:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {summary.grossMargin ?? 0}%
              </span>
            </div>
          </div>
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 font-mono">
            Revenue − Cost of Sold
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Profit earned directly from sales before loss deductions.
          </p>
        </div>

        {/* 5. Damaged & Missing Stock Loss */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            <span>Damaged / Missing Loss</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl xl:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
              ৳{Number(summary.totalDamagedMissingLoss || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-semibold">
              {summary.damagedMissingUnitsCount || 0} damaged/missing units
            </div>
          </div>
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-medium text-amber-600">
            <span>Transit & Stock Loss</span>
            <button
              onClick={() => onNavigate("stock_damaged_products")}
              className="hover:underline font-bold text-amber-700 dark:text-amber-400"
            >
              Loss Ledger &rarr;
            </button>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Original purchase value lost from damaged or missing stock.
          </p>
        </div>

        {/* 6. Net Profit After Loss */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-lg flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between opacity-85 text-xs font-bold uppercase tracking-wider">
            <span>Net Realized Profit</span>
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-2xl xl:text-3xl font-black font-mono tracking-tight">
              ৳{Number(summary.netProfitAfterLoss !== undefined ? summary.netProfitAfterLoss : (summary.totalGrossProfit || 0)).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs opacity-90 mt-1 font-semibold flex items-center gap-1">
              <span>Net Margin:</span>
              <span className="font-bold">{summary.netMargin ?? 0}%</span>
            </div>
          </div>
          <div className="pt-2.5 border-t border-white/20 text-[11px] font-semibold opacity-90">
            Gross Profit − Transit/Stock Loss
          </div>
          <p className="text-[10px] opacity-80 leading-tight">
            True net profit earned after subtracting all stock losses.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BRANCH-WISE PERFORMANCE MATRIX (FOR PHARMACY OWNER / ALL BRANCHES) */}
      {/* ========================================================================= */}
      {!isBranchRestricted && branchList.length > 0 && selectedBranchId === "all" && (
        <div className="bg-white dark:bg-slate-900 p-6 2xl:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base xl:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Store className="h-5 w-5 text-brand-primary" />
                <span>Branch-Wise Stock, Sales & Profit Performance Matrix</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparative breakdown across all branches for the selected period ({period}).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Branch Name</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Stock Units</th>
                  <th className="py-3.5 px-4">Stock Value (৳)</th>
                  <th className="py-3.5 px-4">Sales Revenue (৳)</th>
                  <th className="py-3.5 px-4">Cost of Sold (৳)</th>
                  <th className="py-3.5 px-4">Gross Profit (৳)</th>
                  <th className="py-3.5 px-4 text-amber-600">Damage Loss (৳)</th>
                  <th className="py-3.5 px-4 text-right font-black text-emerald-600">Net Profit (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {branchList.map((b) => (
                  <tr key={b.branchId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-4 px-4 font-bold text-slate-900 dark:text-white text-xs">
                      {b.branchName}
                    </td>
                    <td className="py-4 px-4 text-slate-500">
                      {b.location || "Default Location"}
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {b.stockUnits.toLocaleString()} units
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-brand-primary">
                      ৳{Number(b.inventoryValue || 0).toFixed(2)}
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      ৳{Number(b.salesRevenue || 0).toFixed(2)}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {b.ordersCount} orders
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-500">
                      ৳{Number(b.costOfSold || 0).toFixed(2)}
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-emerald-600">
                      ৳{Number(b.grossProfit || 0).toFixed(2)}
                      <span className="block text-[10px] text-emerald-600/80 font-normal">
                        {b.profitMargin}% margin
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                      ৳{Number(b.damagedMissingLoss || 0).toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      ৳{Number(b.netProfit || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CHARTS & REVENUE TRENDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dynamic Sales Trend Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-brand-primary" />
                Sales & Profit Trajectory ({period.toUpperCase()})
              </h3>
              <p className="text-xs text-slate-400">Real customer revenue and gross profit over the selected date range</p>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-primary" />
                Revenue: ৳{Math.round(totalPeriodRevenue).toLocaleString()}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Profit: ৳{Math.round(totalPeriodProfit).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Interactive Chart Columns */}
          {trendData.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-xs text-slate-400">
              No sales activity found in this period.
            </div>
          ) : (
            <div className="h-60 flex items-end justify-between gap-1 sm:gap-2 pt-6 pb-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
              {trendData.map((item: any, idx: number) => {
                const heightPercent = Math.max(8, Math.min(100, Math.round((Number(item.revenue || 0) / maxRevenue) * 100)));
                const displayLabel = item.label || item.key || item.date;
                return (
                  <div key={idx} className="flex-1 min-w-[24px] flex flex-col items-center gap-2 h-full justify-end group relative">
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-20 bg-slate-900 text-white text-[10px] py-1 px-2.5 rounded-xl shadow-xl whitespace-nowrap font-bold">
                      <div>Revenue: ৳{Math.round(item.revenue || 0).toLocaleString()}</div>
                      <div className="text-[9px] text-emerald-400 font-normal">Profit: ৳{Math.round(item.profit || 0).toLocaleString()}</div>
                    </div>

                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full max-w-[36px] rounded-t-xl bg-gradient-to-t from-brand-primary to-indigo-400 group-hover:from-brand-primary group-hover:to-indigo-300 transition duration-200 shadow-xs"
                    />
                    <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 truncate max-w-[42px] text-center">
                      {displayLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Methods Breakdown */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-indigo-500" />
              Payment Channels
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Real customer payment distribution</p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-500" /> Cash
                </span>
                <span className="font-bold text-slate-900 dark:text-white">৳{Number(paymentBreakdown.CASH || 0).toLocaleString()} ({cashPercent}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div style={{ width: `${cashPercent}%` }} className="h-full bg-emerald-500 rounded-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Smartphone className="h-3.5 w-3.5 text-pink-500" /> bKash
                </span>
                <span className="font-bold text-slate-900 dark:text-white">৳{Number(paymentBreakdown.BKASH || 0).toLocaleString()} ({bkashPercent}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div style={{ width: `${bkashPercent}%` }} className="h-full bg-pink-500 rounded-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Smartphone className="h-3.5 w-3.5 text-orange-500" /> Nagad
                </span>
                <span className="font-bold text-slate-900 dark:text-white">৳{Number(paymentBreakdown.NAGAD || 0).toLocaleString()} ({nagadPercent}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div style={{ width: `${nagadPercent}%` }} className="h-full bg-orange-500 rounded-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <CreditCard className="h-3.5 w-3.5 text-blue-500" /> Card / POS
                </span>
                <span className="font-bold text-slate-900 dark:text-white">৳{Number(paymentBreakdown.CARD || 0).toLocaleString()} ({cardPercent}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div style={{ width: `${cardPercent}%` }} className="h-full bg-blue-500 rounded-full" />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-medium">
            Cash & Digital Wallets recorded instantly at POS counter.
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INVENTORY ALERTS & TOP PRODUCTS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock & Near Expiry Alerts */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Inventory Attention Alerts
            </h3>
            <button
              onClick={() => onNavigate("stock_stock_list")}
              className="text-xs font-bold text-brand-primary hover:underline"
            >
              All Inventory &rarr;
            </button>
          </div>

          {(alerts.lowStockItems?.length === 0 && alerts.nearExpiryItems?.length === 0) ? (
            <div className="py-8 text-center text-xs text-slate-400">
              🎉 All branch stock levels and expiration dates are healthy.
            </div>
          ) : (
            <div className="space-y-2.5">
              {(alerts.lowStockItems || []).map((item: any) => (
                <div key={item.id} className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{item.productName}</span>
                    <span className="text-slate-400 text-[11px] ml-2">Batch: {item.batchNumber}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full font-bold bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[11px]">
                    {item.quantity} units (Threshold: {item.threshold})
                  </span>
                </div>
              ))}

              {(alerts.nearExpiryItems || []).map((item: any) => (
                <div key={item.id} className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{item.productName}</span>
                    <span className="text-slate-400 text-[11px] ml-2">Exp: {new Date(item.expiryDate).toLocaleDateString()}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full font-bold bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 text-[11px]">
                    {item.quantity} units expiring soon
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Selling Medicines */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-500" />
              Top Fast-Moving Products
            </h3>
            <span className="text-xs text-slate-400">Selected period ranking</span>
          </div>

          {topProducts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No sales records in this period.
            </div>
          ) : (
            <div className="space-y-2.5">
              {topProducts.map((p, idx) => (
                <div key={p.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="h-6 w-6 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-brand-primary flex items-center justify-center font-black text-xs">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">৳{Number(p.revenue || 0).toFixed(2)}</span>
                    <span className="block text-[10px] text-slate-400 font-medium">{p.quantity} units sold</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
