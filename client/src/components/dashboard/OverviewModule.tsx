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
  AlertTriangle,
  Package,
  Sparkles,
  Layers,
  Award,
  RefreshCw,
  BarChart3,
  LayoutDashboard,
  Store,
  ShieldAlert,
  CalendarDays,
  Receipt,
  PlusCircle,
  X,
  ArrowUpRight,
  TrendingDown,
  ArrowLeftRight,
  Scale,
  ArrowDownRight,
  Minus,
} from "lucide-react";

import { useBranchContext } from "@/context/BranchContext";

interface OverviewModuleProps {
  onNavigate: (module: OwnerModule) => void;
  selectedBranchId?: string;
}

type PeriodFilter = "today" | "yesterday" | "30d" | "this_year" | "custom";

interface ComparisonPeriodInfo {
  period: string;
  startDate?: string;
  endDate?: string;
  label: string;
  currentLabel: string;
}

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getComparisonPeriodInfo(
  currentPeriod: PeriodFilter,
  startDateStr?: string,
  endDateStr?: string
): ComparisonPeriodInfo {
  const now = new Date();
  if (currentPeriod === "today") {
    return {
      period: "yesterday",
      label: "Yesterday",
      currentLabel: "Today",
    };
  }
  if (currentPeriod === "yesterday") {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
    const dateStr = formatLocalDate(d);
    return {
      period: "custom",
      startDate: dateStr,
      endDate: dateStr,
      label: "Day Before Yesterday",
      currentLabel: "Yesterday",
    };
  }
  if (currentPeriod === "30d") {
    const pEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    const pStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 59);
    return {
      period: "custom",
      startDate: formatLocalDate(pStart),
      endDate: formatLocalDate(pEnd),
      label: "Prior 30 Days",
      currentLabel: "Last 30 Days",
    };
  }
  if (currentPeriod === "this_year") {
    const lastYear = now.getFullYear() - 1;
    return {
      period: "custom",
      startDate: `${lastYear}-01-01`,
      endDate: `${lastYear}-12-31`,
      label: `Last Year (${lastYear})`,
      currentLabel: `This Year (${now.getFullYear()})`,
    };
  }
  if (currentPeriod === "custom" && startDateStr && endDateStr) {
    const s = new Date(startDateStr);
    const e = new Date(endDateStr);
    const diffTime = Math.max(0, e.getTime() - s.getTime());
    const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24))) + 1;
    const pEnd = new Date(s.getTime() - 24 * 60 * 60 * 1000);
    const pStart = new Date(pEnd.getTime() - (diffDays - 1) * 24 * 60 * 60 * 1000);
    const sStr = formatLocalDate(pStart);
    const eStr = formatLocalDate(pEnd);
    return {
      period: "custom",
      startDate: sStr,
      endDate: eStr,
      label: `Prior ${diffDays} Days (${sStr} to ${eStr})`,
      currentLabel: `Selected Range (${startDateStr} to ${endDateStr})`,
    };
  }
  return {
    period: "yesterday",
    label: "Previous Period",
    currentLabel: "Current Period",
  };
}

let cachedDashboardData: any = null;

export function OverviewModule({ onNavigate, selectedBranchId: propBranchId }: OverviewModuleProps) {
  const { user } = useAuth();
  const { selectedBranchId: contextBranchId, currentBranch } = useBranchContext();
  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;

  const [loading, setLoading] = useState(() => !cachedDashboardData);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(() => cachedDashboardData);
  const [showTodayProfitModal, setShowTodayProfitModal] = useState(false);

  // Comparison mode states
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [loadingComparison, setLoadingComparison] = useState<boolean>(false);
  const [compareMetric, setCompareMetric] = useState<"profit" | "revenue">("profit");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Date filter states
  const [period, setPeriod] = useState<PeriodFilter>("today");
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatLocalDate(d);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return formatLocalDate(new Date());
  });

  const compInfo = useMemo(() => {
    return getComparisonPeriodInfo(period, customStartDate, customEndDate);
  }, [period, customStartDate, customEndDate]);

  const isBranchRestricted = ["BRANCH_MANAGER", "MANAGER", "CASHIER", "INVENTORY_EXECUTIVE"].includes(user?.role || "");

  const loadComparison = async (info = compInfo) => {
    try {
      setLoadingComparison(true);
      const params = new URLSearchParams();
      params.set("period", info.period);

      if (!isBranchRestricted && effectiveBranchId && effectiveBranchId !== "all") {
        params.set("branchId", effectiveBranchId);
      }

      if (info.startDate) params.set("startDate", info.startDate);
      if (info.endDate) params.set("endDate", info.endDate);

      const compRes = await fetchApi<any>(`/reports/dashboard?${params.toString()}`);
      if (compRes.success && compRes.data) {
        setComparisonData(compRes.data);
      }
    } catch (err) {
      console.warn("Error loading comparison metrics", err);
    } finally {
      setLoadingComparison(false);
    }
  };

  const loadDashboard = async (showFullSpinner = false) => {
    try {
      if (showFullSpinner && !cachedDashboardData) setLoading(true);
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
        cachedDashboardData = dashRes.data;
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

  useEffect(() => {
    if (compareMode) {
      loadComparison();
    }
  }, [compareMode, period, effectiveBranchId]);

  const handleApplyCustomDate = () => {
    if (period === "custom") {
      loadDashboard(false);
      if (compareMode) {
        loadComparison();
      }
    }
  };

  const summary = dashboardData?.summary || {};
  const todaySummary = dashboardData?.todaySummary || {};
  const charts = dashboardData?.charts || {};
  const alerts = dashboardData?.alerts || {};
  const branchList: any[] = dashboardData?.branchWisePerformance || [];
  const trendData: any[] = charts.dailySalesTrend || [];

  const maxRevenue = Math.max(...trendData.map((d: any) => Math.max(d.revenue || 0, d.profit || 0)), 100);
  const totalPeriodRevenue = trendData.reduce((sum: number, d: any) => sum + (d.revenue || 0), 0);
  const totalPeriodProfit = trendData.reduce((sum: number, d: any) => sum + (d.profit || 0), 0);
  const totalPeriodCost = trendData.reduce((sum: number, d: any) => sum + (d.cost || 0), 0);
  const totalPeriodExpenses = trendData.reduce((sum: number, d: any) => sum + (d.expenses || 0), 0);

  // Comparison Data Calculations
  const compSummary = comparisonData?.summary || {};
  const compCharts = comparisonData?.charts || {};
  const compTrendData: any[] = compCharts.dailySalesTrend || [];

  const currRev = Number(summary.totalSalesRevenue || summary.totalRevenue || 0);
  const prevRev = Number(compSummary.totalSalesRevenue || compSummary.totalRevenue || 0);
  const diffRev = currRev - prevRev;
  const pctRev = prevRev > 0 ? (diffRev / prevRev) * 100 : (currRev > 0 ? 100 : 0);

  const currNetProfit = Number(summary.netProfitAfterLoss !== undefined ? summary.netProfitAfterLoss : (summary.totalGrossProfit || 0));
  const prevNetProfit = Number(compSummary.netProfitAfterLoss !== undefined ? compSummary.netProfitAfterLoss : (compSummary.totalGrossProfit || 0));
  const diffNetProfit = currNetProfit - prevNetProfit;
  const pctNetProfit = prevNetProfit !== 0 ? (diffNetProfit / Math.abs(prevNetProfit)) * 100 : (currNetProfit > 0 ? 100 : 0);

  const currGrossProfit = Number(summary.totalGrossProfit || summary.totalProfit || 0);
  const prevGrossProfit = Number(compSummary.totalGrossProfit || compSummary.totalProfit || 0);
  const diffGrossProfit = currGrossProfit - prevGrossProfit;

  const currOrders = Number(summary.totalSalesCount || 0);
  const prevOrders = Number(compSummary.totalSalesCount || 0);
  const diffOrders = currOrders - prevOrders;

  // Max value for comparison trajectory chart
  const maxComparisonVal = Math.max(
    ...trendData.map((d: any) =>
      compareMetric === "profit"
        ? Math.max(0, Number(d.profit || 0) - Number(d.expenses || 0))
        : Number(d.revenue || 0)
    ),
    ...compTrendData.map((d: any) =>
      compareMetric === "profit"
        ? Math.max(0, Number(d.profit || 0) - Number(d.expenses || 0))
        : Number(d.revenue || 0)
    ),
    100
  );

  // Helper to find matching comparison point
  const findCompItem = (item: any, idx: number) => {
    if (!compTrendData || compTrendData.length === 0) return null;
    if (item.key) {
      const match = compTrendData.find((c: any) => c.key === item.key);
      if (match) return match;
    }
    return compTrendData[idx] || null;
  };

  // Active / Hovered item calculation for live chart inspector
  const activeSlotIdx = hoveredIdx !== null && hoveredIdx >= 0 && hoveredIdx < trendData.length
    ? hoveredIdx
    : (trendData.length > 0
        ? (trendData.findIndex((d: any) => (compareMetric === "profit" ? d.profit : d.revenue) > 0) !== -1
            ? trendData.reduce((maxI: number, d: any, i: number, arr: any[]) =>
                (compareMetric === "profit" ? (d.profit || 0) : (d.revenue || 0)) >
                (compareMetric === "profit" ? (arr[maxI]?.profit || 0) : (arr[maxI]?.revenue || 0))
                  ? i
                  : maxI, 0)
            : trendData.length - 1)
        : null);

  const activeItem = activeSlotIdx !== null ? trendData[activeSlotIdx] : null;
  const activeCompItem = activeItem && activeSlotIdx !== null ? findCompItem(activeItem, activeSlotIdx) : null;

  const activeCurrVal = activeItem
    ? (compareMetric === "profit"
        ? Math.round(Number(activeItem.profit || 0) - Number(activeItem.expenses || 0))
        : Math.round(Number(activeItem.revenue || 0)))
    : 0;

  const activePrevVal = activeCompItem
    ? (compareMetric === "profit"
        ? Math.round(Number(activeCompItem.profit || 0) - Number(activeCompItem.expenses || 0))
        : Math.round(Number(activeCompItem.revenue || 0)))
    : 0;

  const activeDiff = activeCurrVal - activePrevVal;

  // Category & Stock Distribution
  const stockByCategoryList: any[] = charts.stockByCategory || [];
  const topProducts: any[] = charts.topSellingProducts || [];

  const branchDisplayName = summary.branchName || currentBranch?.name || (effectiveBranchId ? "Selected Branch" : "All Branches");

  // Today profit fallback logic
  const todayProfitValue = todaySummary.netProfit !== undefined
    ? Number(todaySummary.netProfit)
    : (period === "today" ? Number(summary.netProfitAfterLoss || 0) : 0);

  return (
    <div className="space-y-4 w-full max-w-full mx-auto animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* TOP HEADER WITH QUICK ACTION BUTTONS (PURCHASE, SALE, TODAY'S PROFIT) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 rounded-none">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Header Title without subtitle */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <LayoutDashboard className="h-6 w-6 sm:h-7 sm:w-7 text-brand-primary shrink-0" />
              <span>
                {isBranchRestricted || effectiveBranchId ? `${branchDisplayName} Dashboard` : "Pharmacy Enterprise Dashboard"}
              </span>
            </h1>
            <span className={`text-[11px] sm:text-xs px-2.5 py-1 font-bold uppercase tracking-wider rounded-none ${
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

          {/* Quick Action Buttons (Matching image style: Purchase, Sale, Today's Profit) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. PURCHASE BUTTON */}
            <button
              onClick={() => onNavigate("stock_add_stock")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-none transition cursor-pointer shadow-xs active:scale-95"
              title="Add New Stock / Purchase"
            >
              <PlusCircle className="h-4 w-4" />
              <span>PURCHASE</span>
            </button>

            {/* 2. SALE BUTTON */}
            <button
              onClick={() => onNavigate("pos")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-none transition cursor-pointer shadow-xs active:scale-95"
              title="Launch POS Counter / Make Sale"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>SALE</span>
            </button>

            {/* 3. TODAY'S PROFIT BUTTON */}
            <button
              onClick={() => setShowTodayProfitModal(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-semibold rounded-none transition cursor-pointer shadow-xs active:scale-95"
              title="View Today's Live Profit"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Today&apos;s profit</span>
              <span className="ml-1 px-2 py-0.5 bg-teal-900/90 font-mono text-[11px] font-bold">
                ৳{Math.round(todayProfitValue).toLocaleString("en-BD")}
              </span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => {
                loadDashboard(false);
                if (compareMode) loadComparison();
              }}
              disabled={refreshing || loadingComparison}
              className="p-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none disabled:opacity-50"
              title="Refresh Analytics"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing || loadingComparison ? "animate-spin text-brand-primary" : ""}`} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DATE RANGE FILTER CONTROLS + COMPARE MODE TOGGLE */}
        {/* ========================================================================= */}
        <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
              <CalendarDays className="h-3.5 w-3.5 text-brand-primary" />
              Period:
            </span>

            <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none gap-0.5">
              <button
                onClick={() => setPeriod("today")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-none transition ${
                  period === "today"
                    ? "bg-white dark:bg-slate-700 text-brand-primary shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setPeriod("yesterday")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-none transition ${
                  period === "yesterday"
                    ? "bg-white dark:bg-slate-700 text-brand-primary shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Yesterday
              </button>
              <button
                onClick={() => setPeriod("30d")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-none transition ${
                  period === "30d"
                    ? "bg-white dark:bg-slate-700 text-brand-primary shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setPeriod("this_year")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-none transition ${
                  period === "this_year"
                    ? "bg-white dark:bg-slate-700 text-brand-primary shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                This Year
              </button>
              <button
                onClick={() => setPeriod("custom")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-none transition ${
                  period === "custom"
                    ? "bg-white dark:bg-slate-700 text-brand-primary shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Custom Range
              </button>
            </div>

            {/* Compare with Previous Period Toggle Button */}
            <button
              type="button"
              onClick={() => {
                const nextMode = !compareMode;
                setCompareMode(nextMode);
                if (nextMode && !comparisonData) {
                  loadComparison();
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition rounded-none border cursor-pointer ${
                compareMode
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Compare with Previous Period (e.g. Today vs Yesterday)"
            >
              <ArrowLeftRight className={`h-3.5 w-3.5 ${compareMode ? "text-white" : "text-brand-primary"}`} />
              <span>{compareMode ? "Comparison: Active" : "Compare Period"}</span>
              {compareMode && (
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              )}
            </button>
          </div>

          {/* Custom Date Pickers */}
          {period === "custom" && (
            <div className="flex items-center gap-2 flex-wrap bg-slate-50 dark:bg-slate-800/40 p-1 border border-slate-200 dark:border-slate-700 rounded-none animate-in fade-in duration-150">
              <span className="text-[11px] font-semibold text-slate-500 pl-1">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-0.5 text-xs font-semibold rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              />
              <span className="text-[11px] font-semibold text-slate-500">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-0.5 text-xs font-semibold rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              />
              <button
                onClick={handleApplyCustomDate}
                className="px-2.5 py-0.5 text-xs font-bold bg-brand-primary text-white rounded-none shadow-xs hover:opacity-95"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Comparison active indicator banner */}
        {compareMode && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <Scale className="h-3.5 w-3.5" />
                Comparison Active
              </span>
              <span className="text-slate-600 dark:text-slate-400">
                Comparing <strong className="text-slate-900 dark:text-white font-mono">{compInfo.currentLabel}</strong> with <strong className="text-slate-900 dark:text-white font-mono">{compInfo.label}</strong>
              </span>
            </div>

            {loadingComparison && (
              <span className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                <RefreshCw className="h-3 w-3 animate-spin text-brand-primary" />
                Calculating comparison metrics...
              </span>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 7 FINANCIAL KPI STAT CARDS (3 CARDS PER ROW, LARGER FONTS & SPACIOUS CARDS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 xl:gap-5 w-full">
        {/* 1. Current Stock Value */}
        <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3 min-w-0 rounded-none">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Current Stock Value
            </span>
            <div className="p-2 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-none shrink-0">
              <Package className="h-5 w-5 text-indigo-500" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl xl:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight truncate">
              ৳{Math.round(Number(summary.totalStockCostValue || summary.totalInventoryValue || 0)).toLocaleString("en-BD")}
            </div>
            <div className="text-xs text-slate-400 font-medium mt-1">
              {Number(summary.totalStockUnits || 0).toLocaleString()} live units in inventory
            </div>
          </div>
        </div>

        {/* 2. Sales Revenue */}
        <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3 min-w-0 rounded-none">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sales Revenue
            </span>
            <div className="p-2 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-none shrink-0">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl xl:text-3xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight truncate">
              ৳{Math.round(Number(summary.totalSalesRevenue || summary.totalRevenue || 0)).toLocaleString("en-BD")}
            </div>
            <div className="text-xs text-slate-400 font-medium mt-1">
              {summary.totalSalesCount || 0} completed customer transactions
            </div>
          </div>
        </div>

        {/* 3. Cost of Sold Products */}
        <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3 min-w-0 rounded-none">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Cost of Sold Products
            </span>
            <div className="p-2 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-none shrink-0">
              <Layers className="h-5 w-5 text-slate-500" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl xl:text-3xl font-black text-slate-700 dark:text-slate-300 font-mono tracking-tight truncate">
              ৳{Math.round(Number(summary.totalCostOfSold || 0)).toLocaleString("en-BD")}
            </div>
            <div className="text-xs text-slate-400 font-medium mt-1">
              Purchase acquisition cost of sold stock
            </div>
          </div>
        </div>

        {/* 4. Gross Profit */}
        <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3 min-w-0 rounded-none">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Gross Profit
            </span>
            <div className="p-2 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-none shrink-0">
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl xl:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight truncate">
              ৳{Math.round(Number(summary.totalGrossProfit || summary.totalProfit || 0)).toLocaleString("en-BD")}
            </div>
            <div className="text-xs text-emerald-600 font-semibold mt-1">
              {summary.grossMargin || 0}% margin on sales
            </div>
          </div>
        </div>

        {/* 5. Damaged / Missing Loss */}
        <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3 min-w-0 rounded-none">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Damaged / Missing Loss
            </span>
            <div className="p-2 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-none shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl xl:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight truncate">
              ৳{Math.round(Number(summary.totalDamagedMissingLoss || 0)).toLocaleString("en-BD")}
            </div>
            <div className="text-xs text-amber-600 font-medium mt-1">
              {summary.damagedMissingUnitsCount || 0} damaged or lost units
            </div>
          </div>
        </div>

        {/* 6. Operating Expenses (Rent, Bills, Salaries) */}
        <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3 min-w-0 rounded-none">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Operating Expenses
            </span>
            <div className="p-2 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-none shrink-0">
              <Receipt className="h-5 w-5 text-rose-500" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl xl:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight truncate">
              ৳{Math.round(Number(summary.totalExpenses || 0)).toLocaleString("en-BD")}
            </div>
            <div className="text-xs text-rose-600 font-medium mt-1">
              Shop rent, bills & employee salaries
            </div>
          </div>
        </div>

        {/* 7. True Net Realized Profit (Matching identical style of the other 6 state cards) */}
        <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3 min-w-0 rounded-none">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              True Net Realized Profit
            </span>
            <div className="p-2 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-none shrink-0">
              <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl xl:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight truncate">
              ৳{Math.round(Number(summary.netProfitAfterLoss !== undefined ? summary.netProfitAfterLoss : (summary.totalGrossProfit || 0))).toLocaleString("en-BD")}
            </div>
            <div className="text-xs text-slate-400 font-medium mt-1">
              Gross Profit − Damage Loss − Expenses
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PERIOD COMPARISON INSIGHTS (CLEAN MINIMAL CARDS - HEADING & VALUES ONLY) */}
      {/* ========================================================================= */}
      {compareMode && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4 rounded-none animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-brand-primary" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Comparison: <span className="text-brand-primary">{compInfo.currentLabel}</span> vs <span className="text-slate-600 dark:text-slate-400">{compInfo.label}</span>
              </h3>
            </div>
          </div>

          {/* 3 Clean Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 xl:gap-4">
            {/* Card 1: Net Profit */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Profit</span>
                <span className={`text-xs font-bold px-2 py-0.5 border ${
                  diffNetProfit >= 0
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300"
                }`}>
                  {diffNetProfit >= 0 ? `+৳${Math.round(diffNetProfit).toLocaleString("en-BD")}` : `-৳${Math.round(Math.abs(diffNetProfit)).toLocaleString("en-BD")}`}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                ৳{Math.round(currNetProfit).toLocaleString("en-BD")}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {compInfo.label}: <strong className="font-mono text-slate-700 dark:text-slate-300">৳{Math.round(prevNetProfit).toLocaleString("en-BD")}</strong>
              </div>
            </div>

            {/* Card 2: Sales Revenue */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sales Revenue</span>
                <span className={`text-xs font-bold px-2 py-0.5 border ${
                  diffRev >= 0
                    ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300"
                    : "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300"
                }`}>
                  {diffRev >= 0 ? `+৳${Math.round(diffRev).toLocaleString("en-BD")}` : `-৳${Math.round(Math.abs(diffRev)).toLocaleString("en-BD")}`}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                ৳{Math.round(currRev).toLocaleString("en-BD")}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {compInfo.label}: <strong className="font-mono text-slate-700 dark:text-slate-300">৳{Math.round(prevRev).toLocaleString("en-BD")}</strong>
              </div>
            </div>

            {/* Card 3: Orders Count */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Transactions</span>
                <span className="text-xs font-bold px-2 py-0.5 bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">
                  {diffOrders >= 0 ? `+${diffOrders}` : diffOrders} orders
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {currOrders.toLocaleString()} <span className="text-xs font-normal text-slate-400">sales</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {compInfo.label}: <strong className="font-mono text-slate-700 dark:text-slate-300">{prevOrders.toLocaleString()} sales</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. SALES & PROFIT TRAJECTORY CHART (CLEAN DUAL BARS / COMPARISON GROUP BARS) */}
      {/* ========================================================================= */}
      <div className="w-full p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 rounded-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-brand-primary" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {compareMode
                ? `Timeline Comparison (${compInfo.currentLabel} vs ${compInfo.label})`
                : `Sales & Profit Trajectory (${period.toUpperCase()})`}
            </h3>
          </div>

          {/* Chart Controls & Legend */}
          {compareMode ? (
            <div className="flex items-center gap-3 flex-wrap">
              {/* Metric Switcher: Profit vs Revenue */}
              <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCompareMetric("profit")}
                  className={`px-2.5 py-1 transition cursor-pointer ${
                    compareMetric === "profit"
                      ? "bg-emerald-600 text-white font-bold shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  💰 Net Profit
                </button>
                <button
                  type="button"
                  onClick={() => setCompareMetric("revenue")}
                  className={`px-2.5 py-1 transition cursor-pointer ${
                    compareMetric === "revenue"
                      ? "bg-blue-600 text-white font-bold shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  📈 Revenue
                </button>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                  <span className={`h-2.5 w-2.5 rounded-none ${compareMetric === "profit" ? "bg-emerald-600" : "bg-blue-600"}`} />
                  {compInfo.currentLabel}
                </span>
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <span className="h-2.5 w-2.5 bg-slate-300 dark:bg-slate-600 rounded-none border border-slate-300 dark:border-slate-500" />
                  {compInfo.label}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-xs font-semibold flex-wrap">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="h-2.5 w-2.5 bg-blue-600 rounded-none" />
                Revenue: ৳{Math.round(totalPeriodRevenue).toLocaleString()}
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="h-2.5 w-2.5 bg-slate-400 rounded-none" />
                Cost: ৳{Math.round(totalPeriodCost).toLocaleString()}
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="h-2.5 w-2.5 bg-emerald-600 rounded-none" />
                Profit: ৳{Math.round(totalPeriodProfit).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* LIVE SLOT INSPECTOR (ALWAYS VISIBLE & ACCURATE WHEN HOVERING / SELECTING) */}
        {/* ========================================================================= */}
        {compareMode && activeItem && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Inspecting:
              </span>
              <span className="font-bold text-slate-900 dark:text-white px-2 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 font-mono">
                {activeItem.label || activeItem.key || activeItem.date}
              </span>
              <span className="text-[11px] text-slate-400 hidden lg:inline">
                (Move mouse over any bar to inspect)
              </span>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Current */}
              <div className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 ${compareMetric === "profit" ? "bg-emerald-600" : "bg-blue-600"}`} />
                <span className="text-slate-600 dark:text-slate-300">{compInfo.currentLabel}:</span>
                <strong className={`font-mono text-sm ${compareMetric === "profit" ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"}`}>
                  ৳{activeCurrVal.toLocaleString("en-BD")}
                </strong>
              </div>

              {/* Previous */}
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 bg-slate-300 dark:bg-slate-600 border border-slate-300 dark:border-slate-500" />
                <span className="text-slate-600 dark:text-slate-300">{compInfo.label}:</span>
                <strong className="font-mono text-sm text-slate-700 dark:text-slate-300">
                  ৳{activePrevVal.toLocaleString("en-BD")}
                </strong>
              </div>

              {/* Difference Badge */}
              <div className={`px-2 py-0.5 font-bold font-mono text-xs flex items-center gap-1 border ${
                activeDiff >= 0
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300"
              }`}>
                {activeDiff >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                <span>{activeDiff >= 0 ? "+" : "−"}৳{Math.abs(activeDiff).toLocaleString("en-BD")}</span>
              </div>

              {/* Orders count */}
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Orders: <strong className="text-slate-800 dark:text-slate-200">{activeItem.sales || 0}</strong> vs <strong className="text-slate-800 dark:text-slate-200">{activeCompItem?.sales || 0}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Interactive Chart Columns */}
        {trendData.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-xs text-slate-400">
            No sales activity found in this period.
          </div>
        ) : compareMode ? (
          /* ========================================================================= */
          /* COMPARE MODE GROUPED BAR CHART WITH Y-AXIS GRIDLINES & LIVE HIGHLIGHT */
          /* ========================================================================= */
          <div className="relative pt-6 pb-2 border-b border-slate-200 dark:border-slate-800">
            {/* Y-Axis Guidelines */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-2 z-0">
              <div className="border-b border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono pb-0.5">
                <span>৳{Math.round(maxComparisonVal).toLocaleString("en-BD")}</span>
                <span className="text-slate-400/60 text-[9px]">Peak</span>
              </div>
              <div className="border-b border-dashed border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono pb-0.5">
                <span>৳{Math.round(maxComparisonVal * 0.5).toLocaleString("en-BD")}</span>
                <span className="text-slate-400/60 text-[9px]">50%</span>
              </div>
              <div className="border-b border-slate-300 dark:border-slate-700 flex items-center justify-between text-[10px] text-slate-400 font-mono pb-0.5">
                <span>৳0</span>
                <span className="text-slate-400/60 text-[9px]">Baseline</span>
              </div>
            </div>

            {/* Scrollable Column Area */}
            <div className="relative z-10 h-64 flex items-end justify-between gap-1 sm:gap-2 overflow-x-auto min-w-full">
              {trendData.map((item: any, idx: number) => {
                const compItem = findCompItem(item, idx) || {};
                const currVal = compareMetric === "profit"
                  ? Math.round(Number(item.profit || 0) - Number(item.expenses || 0))
                  : Math.round(Number(item.revenue || 0));
                const prevVal = compareMetric === "profit"
                  ? Math.round(Number(compItem.profit || 0) - Number(compItem.expenses || 0))
                  : Math.round(Number(compItem.revenue || 0));

                const currHeight = Math.max(0, Math.min(100, Math.round((Math.max(0, currVal) / maxComparisonVal) * 100)));
                const prevHeight = Math.max(0, Math.min(100, Math.round((Math.max(0, prevVal) / maxComparisonVal) * 100)));
                const slotDiff = currVal - prevVal;
                const displayLabel = item.label || item.key || item.date;
                const isSelected = activeSlotIdx === idx;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onClick={() => setHoveredIdx(idx)}
                    className={`flex-1 min-w-[36px] sm:min-w-[42px] flex flex-col items-center gap-1.5 h-full justify-end group relative p-1 transition cursor-pointer ${
                      isSelected
                        ? "bg-slate-100/90 dark:bg-slate-800/80 ring-1 ring-slate-300 dark:ring-slate-600"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    {/* Floating Tooltip Card */}
                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-40 bg-slate-900 text-white text-[11px] p-2.5 border border-slate-700 shadow-xl whitespace-nowrap rounded-none left-1/2 -translate-x-1/2 min-w-[170px]">
                      <div className="font-bold border-b border-slate-800 pb-1 text-slate-200 flex items-center justify-between gap-2">
                        <span>{displayLabel}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 ${slotDiff >= 0 ? "bg-emerald-950 text-emerald-300 border border-emerald-700/60" : "bg-rose-950 text-rose-300 border border-rose-700/60"}`}>
                          {slotDiff >= 0 ? `▲ +৳${slotDiff.toLocaleString()}` : `▼ -৳${Math.abs(slotDiff).toLocaleString()}`}
                        </span>
                      </div>
                      <div className="pt-1.5 space-y-1 font-mono">
                        <div className="flex items-center justify-between gap-3 text-emerald-400 font-bold">
                          <span>{compInfo.currentLabel}:</span>
                          <span>৳{currVal.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-slate-400">
                          <span>{compInfo.label}:</span>
                          <span>৳{prevVal.toLocaleString()}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 font-sans flex justify-between gap-2">
                          <span>Orders:</span>
                          <span className="font-mono text-slate-300">{item.sales || 0} vs {compItem.sales || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Grouped Comparison Bars (Current vs Previous) */}
                    <div className="w-full flex items-end justify-center gap-1 h-full pb-1">
                      {/* Current Period Bar */}
                      {currVal > 0 ? (
                        <div
                          style={{ height: `${Math.max(6, currHeight)}%` }}
                          className={`w-1/2 max-w-[14px] rounded-t-xs transition duration-150 shadow-xs ${
                            compareMetric === "profit"
                              ? (currVal >= 0 ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500")
                              : "bg-blue-600 hover:bg-blue-500"
                          } ${isSelected ? "ring-2 ring-emerald-400" : ""}`}
                          title={`${compInfo.currentLabel}: ৳${currVal.toLocaleString()}`}
                        />
                      ) : (
                        <div
                          style={{ height: "3px" }}
                          className="w-1/2 max-w-[14px] bg-slate-300 dark:bg-slate-700 transition"
                          title={`${compInfo.currentLabel}: ৳0`}
                        />
                      )}

                      {/* Previous Period Bar */}
                      {prevVal > 0 ? (
                        <div
                          style={{ height: `${Math.max(6, prevHeight)}%` }}
                          className={`w-1/2 max-w-[14px] bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 rounded-t-xs transition duration-150 shadow-xs border border-slate-400 dark:border-slate-500 ${
                            isSelected ? "ring-2 ring-slate-400" : ""
                          }`}
                          title={`${compInfo.label}: ৳${prevVal.toLocaleString()}`}
                        />
                      ) : (
                        <div
                          style={{ height: "3px" }}
                          className="w-1/2 max-w-[14px] bg-slate-200 dark:bg-slate-700/60 transition"
                          title={`${compInfo.label}: ৳0`}
                        />
                      )}
                    </div>

                    <span className={`text-[10px] font-semibold truncate max-w-[48px] text-center transition ${
                      isSelected
                        ? "text-slate-900 dark:text-white font-bold underline"
                        : "text-slate-500 dark:text-slate-400"
                    }`}>
                      {displayLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* STANDARD DUAL BAR CHART (REVENUE & PROFIT) */
          /* ========================================================================= */
          <div className="h-64 flex items-end justify-between gap-1 sm:gap-2 pt-8 pb-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto min-w-full">
            {trendData.map((item: any, idx: number) => {
              const rev = Number(item.revenue || 0);
              const prf = Number(item.profit || 0);
              const cst = Number(item.cost || 0);
              const exp = Number(item.expenses || 0);
              const netDay = Math.round(prf - exp);

              const revHeight = Math.max(6, Math.min(100, Math.round((rev / maxRevenue) * 100)));
              const prfHeight = Math.max(4, Math.min(100, Math.round((Math.max(0, prf) / maxRevenue) * 100)));
              const displayLabel = item.label || item.key || item.date;

              return (
                <div
                  key={idx}
                  className="flex-1 min-w-[32px] sm:min-w-[40px] flex flex-col items-center gap-1.5 h-full justify-end group relative hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1 transition"
                >
                  {/* Detailed Hover Card */}
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-30 bg-slate-900 text-white text-[11px] p-2.5 border border-slate-700 shadow-xl whitespace-nowrap rounded-none left-1/2 -translate-x-1/2">
                    <div className="font-bold border-b border-slate-800 pb-1 text-slate-200">
                      {displayLabel}
                    </div>
                    <div className="pt-1 space-y-0.5 font-mono">
                      <div className="text-blue-400">Sales: ৳{Math.round(rev).toLocaleString()}</div>
                      <div className="text-slate-400">Cost: ৳{Math.round(cst).toLocaleString()}</div>
                      <div className="text-emerald-400 font-bold">Gross Profit: ৳{Math.round(prf).toLocaleString()}</div>
                      {exp > 0 && <div className="text-rose-400">Expenses: ৳{Math.round(exp).toLocaleString()}</div>}
                      <div className="text-emerald-300 font-bold border-t border-slate-800 pt-0.5">
                        Net Profit: ৳{netDay.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans">{item.sales || 0} orders</div>
                    </div>
                  </div>

                  {/* Dual Bar Graphic (Revenue bar & Profit bar) */}
                  <div className="w-full flex items-end justify-center gap-1 h-full pb-1">
                    {/* Revenue Bar */}
                    <div
                      style={{ height: `${revHeight}%` }}
                      className="w-1/2 max-w-[14px] bg-blue-600 hover:bg-blue-500 transition duration-150 rounded-none shadow-xs"
                      title={`Sales Revenue: ৳${Math.round(rev).toLocaleString()}`}
                    />
                    {/* Profit Bar */}
                    <div
                      style={{ height: `${prfHeight}%` }}
                      className={`w-1/2 max-w-[14px] rounded-none transition duration-150 shadow-xs ${
                        netDay >= 0 ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
                      }`}
                      title={`Profit: ৳${Math.round(prf).toLocaleString()}`}
                    />
                  </div>

                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[48px] text-center">
                    {displayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. BRANCH-WISE PERFORMANCE MATRIX (FOR PHARMACY OWNER / ALL BRANCHES) */}
      {/* ========================================================================= */}
      {!isBranchRestricted && branchList.length > 0 && effectiveBranchId === "all" && (
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 rounded-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Store className="h-4 w-4 text-brand-primary" />
              <span>Branch-Wise Stock, Sales & Profit Performance Matrix</span>
            </h2>
          </div>

          <div className="table-responsive-container overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Branch Name</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Stock Units</th>
                  <th className="py-2.5 px-3">Stock Value (৳)</th>
                  <th className="py-2.5 px-3">Sales Revenue (৳)</th>
                  <th className="py-2.5 px-3">Cost of Sold (৳)</th>
                  <th className="py-2.5 px-3">Gross Profit (৳)</th>
                  <th className="py-2.5 px-3 text-amber-600">Damage Loss (৳)</th>
                  <th className="py-2.5 px-3 text-rose-600">Expenses (৳)</th>
                  <th className="py-2.5 px-3 text-right font-bold text-emerald-600">Net Profit (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {branchList.map((b) => (
                  <tr key={b.branchId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                      {b.branchName}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {b.location || "Default Location"}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {b.stockUnits.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      ৳{Math.round(Number(b.inventoryValue || 0)).toLocaleString("en-BD")}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      ৳{Math.round(Number(b.salesRevenue || 0)).toLocaleString("en-BD")}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {b.ordersCount} orders
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">
                      ৳{Math.round(Number(b.costOfSold || 0)).toLocaleString("en-BD")}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-600">
                      ৳{Math.round(Number(b.grossProfit || 0)).toLocaleString("en-BD")}
                      <span className="block text-[10px] text-emerald-600/80 font-normal">
                        {b.profitMargin}% margin
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                      ৳{Math.round(Number(b.damagedMissingLoss || 0)).toLocaleString("en-BD")}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                      ৳{Math.round(Number(b.expenses || 0)).toLocaleString("en-BD")}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                      ৳{Math.round(Number(b.netProfit || 0)).toLocaleString("en-BD")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. STOCK BY CATEGORY DONUT CHART */}
      {/* ========================================================================= */}
      <StockByCategoryDonutChart
        data={stockByCategoryList}
        loading={loading}
        totalStockUnits={summary.totalStockUnits}
        totalStockValue={summary.totalStockCostValue || summary.totalInventoryValue}
        branchName={branchDisplayName}
      />

      {/* ========================================================================= */}
      {/* 4. TOP PRODUCTS & INVENTORY ALERTS (SIDE BY SIDE) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Selling Medicines */}
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 rounded-none">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="h-4 w-4 text-indigo-500" />
              Top Fast-Moving Products
            </h3>
          </div>

          {topProducts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No sales records in this period.
            </div>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, idx) => (
                <div key={p.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs rounded-none">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-5 w-5 bg-indigo-100 dark:bg-indigo-950/80 text-brand-primary flex items-center justify-center font-bold text-xs rounded-none shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white truncate">{p.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">৳{Math.round(Number(p.revenue || 0)).toLocaleString("en-BD")}</span>
                    <span className="block text-[10px] text-slate-400 font-medium">{p.quantity} units sold</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock & Near Expiry Alerts */}
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 rounded-none">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Inventory Attention Alerts
            </h3>
            <button
              onClick={() => onNavigate("stock_stock_list")}
              className="text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
            >
              All Inventory &rarr;
            </button>
          </div>

          {(alerts.lowStockItems?.length === 0 && alerts.nearExpiryItems?.length === 0) ? (
            <div className="py-8 text-center text-xs text-slate-400">
              All branch stock levels and expiration dates are healthy.
            </div>
          ) : (
            <div className="space-y-2">
              {(alerts.lowStockItems || []).map((item: any) => (
                <div key={item.id} className="p-2.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between text-xs rounded-none">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{item.productName}</span>
                    <span className="text-slate-400 text-[11px] ml-2">Batch: {item.batchNumber}</span>
                  </div>
                  <span className="px-2 py-0.5 font-bold bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[11px] rounded-none">
                    {item.quantity} units (Min: {item.threshold})
                  </span>
                </div>
              ))}

              {(alerts.nearExpiryItems || []).map((item: any) => (
                <div key={item.id} className="p-2.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between text-xs rounded-none">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{item.productName}</span>
                    <span className="text-slate-400 text-[11px] ml-2">Exp: {new Date(item.expiryDate).toLocaleDateString()}</span>
                  </div>
                  <span className="px-2 py-0.5 font-bold bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 text-[11px] rounded-none">
                    {item.quantity} expiring soon
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TODAY'S PROFIT DETAIL MODAL */}
      {/* ========================================================================= */}
      {showTodayProfitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl p-5 space-y-4 rounded-none">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Today&apos;s Financial Performance
                </h3>
              </div>
              <button
                onClick={() => setShowTodayProfitModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-none transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-none">
                <span className="text-slate-600 dark:text-slate-400 font-semibold">Today&apos;s Sales Revenue</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                  ৳{Math.round(Number(todaySummary.salesRevenue || 0)).toLocaleString("en-BD")}
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-none">
                <span className="text-slate-600 dark:text-slate-400 font-semibold">Cost of Sold Products (COGS)</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  − ৳{Math.round(Number(todaySummary.costOfSold || 0)).toLocaleString("en-BD")}
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-none">
                <span className="text-slate-600 dark:text-slate-400 font-semibold">Gross Profit</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  ৳{Math.round(Number(todaySummary.grossProfit || 0)).toLocaleString("en-BD")}
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-none">
                <span className="text-slate-600 dark:text-slate-400 font-semibold">Operating Expenses (Rent/Bills/Salary)</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  − ৳{Math.round(Number(todaySummary.expenses || 0)).toLocaleString("en-BD")}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-none">
                <div>
                  <span className="font-bold text-emerald-900 dark:text-emerald-300 block">Today&apos;s Net Realized Profit</span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                    Gross Profit − Operating Expenses
                  </span>
                </div>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-base">
                  ৳{Math.round(Number(todaySummary.netProfit || 0)).toLocaleString("en-BD")}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 pt-1 text-right">
                Total completed sales orders today: <span className="font-bold">{todaySummary.salesCount || 0}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => {
                  setPeriod("today");
                  setShowTodayProfitModal(false);
                }}
                className="px-3 py-1.5 bg-brand-primary text-white text-xs font-semibold rounded-none hover:opacity-95 transition"
              >
                Filter Dashboard for Today
              </button>
              <button
                onClick={() => setShowTodayProfitModal(false)}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-none hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
