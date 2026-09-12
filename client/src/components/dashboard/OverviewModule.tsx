"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { OwnerModule } from "./DashboardSidebar";
import { StockByCategoryDonutChart } from "./StockByCategoryDonutChart";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertTriangle,
  Package,
  Building2,
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

import { useBranchContext } from "@/context/BranchContext";

interface OverviewModuleProps {
  onNavigate: (module: OwnerModule) => void;
  selectedBranchId?: string;
}

type PeriodFilter = "today" | "yesterday" | "7d" | "30d" | "custom";

export function OverviewModule({ onNavigate, selectedBranchId: propBranchId }: OverviewModuleProps) {
  const { user } = useAuth();
  const { selectedBranchId: contextBranchId, currentBranch } = useBranchContext();
  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  
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

  const loadDashboard = async (showFullSpinner = false) => {
    try {
      if (showFullSpinner) setLoading(true);
      else setRefreshing(true);

      const params = new URLSearchParams();
      params.set("period", period);
      
      if (!isBranchRestricted && effectiveBranchId && effectiveBranchId !== "all") {
        params.set("branchId", effectiveBranchId);
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
  }, [period, effectiveBranchId]);

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

  // Category & Stock Distribution
  const categoryList: any[] = charts.categoryDistribution || [];
  const stockByCategoryList: any[] = charts.stockByCategory || [];
  const topProducts: any[] = charts.topSellingProducts || [];

  const branchDisplayName = summary.branchName || currentBranch?.name || (effectiveBranchId ? "Selected Branch" : "All Branches");

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
                  {isBranchRestricted || effectiveBranchId ? `${branchDisplayName} Dashboard` : "Pharmacy Enterprise Dashboard"}
                </span>
              </h1>
              <span className={`text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                isBranchRestricted || effectiveBranchId
                  ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                  : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              }`}>
                {isBranchRestricted
                  ? "Branch Manager Scope"
                  : effectiveBranchId
                  ? `Branch: ${branchDisplayName}`
                  : "Multi-Branch Live"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {isBranchRestricted || effectiveBranchId
                ? `Real-time stock valuation, sales performance, transit loss tracking and net profit for ${branchDisplayName}.`
                : "Real sales revenue, verified stock purchase valuation, gross profit, transit losses, and net profit across company branches."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
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
      {/* 6 SIMPLIFIED REAL-TIME KPI STAT CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3.5 sm:gap-4">
        {/* 1. Current Stock Value */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2 min-w-0">
          <div className="flex items-start justify-between gap-2 text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider min-w-0">
            <span className="leading-snug">Current Stock Value</span>
            <Package className="h-4 w-4 text-brand-primary shrink-0 mt-0.5" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight truncate">
            ৳{Number(summary.totalStockCostValue || summary.totalInventoryValue || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* 2. Sales Revenue */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-brand-primary to-indigo-800 text-white shadow-md flex flex-col justify-between space-y-2 min-w-0">
          <div className="flex items-start justify-between gap-2 text-[11px] sm:text-xs font-bold opacity-90 uppercase tracking-wider min-w-0">
            <span className="leading-snug">Sales Revenue</span>
            <TrendingUp className="h-4 w-4 shrink-0 mt-0.5" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight truncate">
            ৳{Number(summary.totalSalesRevenue || summary.totalRevenue || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* 3. Cost of Sold Products */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2 min-w-0">
          <div className="flex items-start justify-between gap-2 text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider min-w-0">
            <span className="leading-snug">Cost of Sold Products</span>
            <Layers className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-200 font-mono tracking-tight truncate">
            ৳{Number(summary.totalCostOfSold || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* 4. Gross Profit */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 shadow-xs flex flex-col justify-between space-y-2 min-w-0">
          <div className="flex items-start justify-between gap-2 text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider min-w-0">
            <span className="leading-snug">Gross Profit</span>
            <DollarSign className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight truncate">
            ৳{Number(summary.totalGrossProfit || summary.totalProfit || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* 5. Damaged / Missing Loss */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 shadow-xs flex flex-col justify-between space-y-2 min-w-0">
          <div className="flex items-start justify-between gap-2 text-[11px] sm:text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider min-w-0">
            <span className="leading-snug">Damaged / Missing Loss</span>
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight truncate">
            ৳{Number(summary.totalDamagedMissingLoss || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* 6. Net Realized Profit */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-md flex flex-col justify-between space-y-2 min-w-0">
          <div className="flex items-start justify-between gap-2 text-[11px] sm:text-xs font-bold opacity-90 uppercase tracking-wider min-w-0">
            <span className="leading-snug">Net Realized Profit</span>
            <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight truncate">
            ৳{Number(summary.netProfitAfterLoss !== undefined ? summary.netProfitAfterLoss : (summary.totalGrossProfit || 0)).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BRANCH-WISE PERFORMANCE MATRIX (FOR PHARMACY OWNER / ALL BRANCHES) */}
      {/* ========================================================================= */}
      {!isBranchRestricted && branchList.length > 0 && effectiveBranchId === "all" && (
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

          <div className="table-responsive-container">
            <table className="w-full min-w-[850px] text-left text-xs">
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
      {/* 1. SALES & PROFIT TRAJECTORY CHART (FULL WIDTH) */}
      {/* ========================================================================= */}
      <div className="w-full p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
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

      {/* ========================================================================= */}
      {/* 2. STOCK BY CATEGORY DONUT CHART (FULL WIDTH) */}
      {/* ========================================================================= */}
      <StockByCategoryDonutChart
        data={stockByCategoryList}
        loading={loading}
        totalStockUnits={summary.totalStockUnits}
        totalStockValue={summary.totalStockCostValue || summary.totalInventoryValue}
        branchName={branchDisplayName}
      />

      {/* ========================================================================= */}
      {/* 3. TOP PRODUCTS & INVENTORY ALERTS (SIDE BY SIDE) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </div>
    </div>
  );
}
