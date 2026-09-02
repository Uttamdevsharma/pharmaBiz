"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
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
} from "lucide-react";

interface OverviewModuleProps {
  onNavigate: (module: any) => void;
}

type TrendPeriod = "7d" | "30d" | "6m";

export function OverviewModule({ onNavigate }: OverviewModuleProps) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>("7d");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, profileRes] = await Promise.all([
        fetchApi<any>("/reports/dashboard"),
        fetchApi<any>("/tenant/profile"),
      ]);

      if (dashRes.success) setDashboardData(dashRes.data);
      if (profileRes.success) setProfile(profileRes.data);
    } catch (err) {
      console.warn("Error loading owner dashboard metrics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-slate-500 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <span className="text-sm font-semibold">Loading real-time pharmacy analytics...</span>
      </div>
    );
  }

  const summary = dashboardData?.summary || {};
  const charts = dashboardData?.charts || {};
  const alerts = dashboardData?.alerts || {};

  // Trend chart dataset selection
  let trendData: any[] = [];
  if (trendPeriod === "7d") {
    trendData = charts.dailySalesTrend || [];
  } else if (trendPeriod === "30d") {
    trendData = charts.dailyTrend30 || [];
  } else {
    trendData = charts.monthlySalesTrend || [];
  }

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
  const totalCatRevenue = categoryList.reduce((sum, c) => sum + (c.revenue || 0), 0) || 1;

  // Profit margin
  const profitMargin = summary.totalRevenue > 0
    ? Math.round(((summary.totalProfit || 0) / summary.totalRevenue) * 100)
    : 0;

  return (
    <div className="space-y-6 2xl:space-y-8 w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl xl:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <LayoutDashboard className="h-7 w-7 xl:h-8 xl:w-8 text-brand-primary" />
              Executive Dashboard
            </h1>
            <span className="text-[10px] xl:text-xs px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              Live Real-Time
            </span>
          </div>
          <p className="text-xs sm:text-sm xl:text-base text-slate-500 mt-1">
            Real sales telemetry, verified inventory valuation, gross profit, and operational liquidity.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={loadDashboard}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
            title="Refresh Metrics"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => onNavigate("pos")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary hover:opacity-95 text-white text-xs sm:text-sm font-bold shadow-md transition active:scale-95"
          >
            <ShoppingCart className="h-4 w-4" />
            Launch POS Counter
          </button>
        </div>
      </div>

      {/* PRIMARY KPI METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-brand-primary to-indigo-800 text-white shadow-lg relative overflow-hidden flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between opacity-85 text-xs font-bold uppercase tracking-wider">
            <span>Today's Sales</span>
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <div className="text-3xl font-black tracking-tight">
              ৳{Number(summary.todaySales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs opacity-90 mt-1 font-semibold">
              {summary.todayTransactions || 0} orders completed today
            </div>
          </div>
          <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs">
            <span className="opacity-80">Weekly: ৳{Number(summary.weeklySales || 0).toLocaleString()}</span>
            <span className="font-bold">Monthly: ৳{Number(summary.monthlySales || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Total Gross Profit */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Gross Profit</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              ৳{Number(summary.totalProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-medium">
              <span>Profit Margin:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{profitMargin}%</span>
              <span>across total volume</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>All-time Sales</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{summary.totalSales || 0} receipts</span>
          </div>
        </div>

        {/* Total Inventory Valuation */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Inventory Valuation</span>
            <Package className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              ৳{Number(summary.totalInventoryValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium">
              {Number(summary.totalStockUnits || 0).toLocaleString()} physical stock units
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
            <span className="text-amber-600">{summary.lowStockCount || 0} low stock</span>
            <span className="text-rose-500">{summary.nearExpiryCount || 0} near expiry</span>
          </div>
        </div>

        {/* Total Liquidity & Supplier Dues */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Liquid Cash & Balances</span>
            <Wallet className="h-4 w-4 text-purple-500" />
          </div>
          <div>
            <div className="text-3xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
              ৳{Number((summary.cashBalance || 0) + (summary.bankBalance || 0) + (summary.digitalWalletBalance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium truncate">
              Cash: ৳{Number(summary.cashBalance || 0).toLocaleString()} • Bank: ৳{Number(summary.bankBalance || 0).toLocaleString()}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Supplier Dues</span>
            <span className="text-rose-600 font-bold">৳{Number(summary.supplierDues || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Revenue Trend (Dynamic Bar / Column Chart) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-brand-primary" />
                Sales & Revenue Analytics
              </h3>
              <p className="text-xs text-slate-400">Real customer revenue and gross profit trajectory</p>
            </div>

            {/* Time Period Tabs */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => setTrendPeriod("7d")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  trendPeriod === "7d"
                    ? "bg-white dark:bg-slate-700 text-brand-primary shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTrendPeriod("30d")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  trendPeriod === "30d"
                    ? "bg-white dark:bg-slate-700 text-brand-primary shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setTrendPeriod("6m")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  trendPeriod === "6m"
                    ? "bg-white dark:bg-slate-700 text-brand-primary shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                6 Months
              </button>
            </div>
          </div>

          {/* Interactive Chart Bars */}
          <div className="h-60 flex items-end justify-between gap-1.5 sm:gap-3 pt-6 pb-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
            {trendData.map((item: any, idx: number) => {
              const heightPercent = Math.max(8, Math.min(100, Math.round((Number(item.revenue || 0) / maxRevenue) * 100)));
              const displayLabel = item.label || item.date || item.month;
              return (
                <div key={idx} className="flex-1 min-w-[28px] flex flex-col items-center gap-2 h-full justify-end group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-20 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg shadow-xl whitespace-nowrap font-bold">
                    <div>৳{Math.round(item.revenue || 0).toLocaleString()}</div>
                    <div className="text-[9px] text-emerald-400 font-normal">Profit: ৳{Math.round(item.profit || 0).toLocaleString()}</div>
                  </div>

                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full max-w-[42px] rounded-t-xl bg-gradient-to-t from-brand-primary to-indigo-400 group-hover:from-brand-primary group-hover:to-indigo-300 transition duration-200 shadow-xs"
                  />
                  <span className="text-[10px] font-semibold text-slate-500 truncate max-w-[48px] text-center">
                    {displayLabel}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Chart Summary Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-primary" />
                Revenue (৳{Math.round(totalPeriodRevenue).toLocaleString()})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Profit (৳{Math.round(totalPeriodProfit).toLocaleString()})
              </span>
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Total Revenue: ৳{Number(summary.totalRevenue || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Payment Channels Breakdown */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              Payment Channels
            </h3>
            <p className="text-xs text-slate-400">Actual customer collection breakdown</p>
          </div>

          <div className="space-y-3.5">
            {/* Cash */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Wallet className="h-3.5 w-3.5 text-emerald-500" />
                  Cash ({cashPercent}%)
                </span>
                <span>৳{Number(paymentBreakdown.CASH || 0).toLocaleString()}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div style={{ width: `${cashPercent}%` }} className="h-full bg-emerald-500 rounded-full" />
              </div>
            </div>

            {/* bKash */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Smartphone className="h-3.5 w-3.5 text-pink-500" />
                  bKash ({bkashPercent}%)
                </span>
                <span>৳{Number(paymentBreakdown.BKASH || 0).toLocaleString()}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div style={{ width: `${bkashPercent}%` }} className="h-full bg-pink-500 rounded-full" />
              </div>
            </div>

            {/* Nagad */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Smartphone className="h-3.5 w-3.5 text-amber-500" />
                  Nagad ({nagadPercent}%)
                </span>
                <span>৳{Number(paymentBreakdown.NAGAD || 0).toLocaleString()}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div style={{ width: `${nagadPercent}%` }} className="h-full bg-amber-500 rounded-full" />
              </div>
            </div>

            {/* Cards / POS */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                  Cards & POS ({cardPercent}%)
                </span>
                <span>৳{Number(paymentBreakdown.CARD || 0).toLocaleString()}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div style={{ width: `${cardPercent}%` }} className="h-full bg-blue-500 rounded-full" />
              </div>
            </div>

            {/* Other */}
            {otherPercent > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Percent className="h-3.5 w-3.5 text-slate-400" />
                    Other ({otherPercent}%)
                  </span>
                  <span>৳{Number(paymentBreakdown.OTHER || 0).toLocaleString()}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div style={{ width: `${otherPercent}%` }} className="h-full bg-slate-400 rounded-full" />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate("reports")}
            className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center justify-center gap-1.5"
          >
            Generate Detailed Sales Report
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* BOTTOM SECTION: CATEGORY SALES, TOP PRODUCTS & ALERTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Sales Breakdown */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-600" />
              Sales by Category
            </h3>
            <span className="text-xs text-slate-400">All Time</span>
          </div>

          <div className="space-y-3 pt-1">
            {categoryList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No category sales recorded yet.</div>
            ) : (
              categoryList.slice(0, 5).map((cat, idx) => {
                const percent = Math.round((cat.revenue / totalCatRevenue) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{cat.name}</span>
                      <span className="text-slate-500">৳{Number(cat.revenue).toLocaleString()} ({percent}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className={`h-full rounded-full ${
                          idx === 0 ? "bg-indigo-600" : idx === 1 ? "bg-teal-500" : idx === 2 ? "bg-amber-500" : "bg-slate-400"
                        }`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Selling Products Leaderboard */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Top Selling Products
            </h3>
            <span className="text-xs text-slate-400">By Volume</span>
          </div>

          <div className="space-y-2.5 pt-1">
            {(charts.topSellingProducts || []).length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No product sales yet.</div>
            ) : (
              (charts.topSellingProducts || []).map((prod: any, idx: number) => (
                <div key={idx} className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 text-xs font-black flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="truncate max-w-[150px]">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{prod.name}</div>
                      <div className="text-[10px] text-slate-400">{prod.quantity} units sold</div>
                    </div>
                  </div>
                  <div className="text-xs font-black text-brand-primary">
                    ৳{Math.round(prod.revenue).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stock & Expiry Critical Alerts */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              Stock & Expiry Alerts
            </h3>
            <button
              onClick={() => onNavigate("inv_expired_products")}
              className="text-xs text-brand-primary font-bold hover:underline"
            >
              View All
            </button>
          </div>

          <div className="space-y-2.5 pt-1">
            {(alerts.nearExpiryItems || []).length === 0 && (alerts.lowStockItems || []).length === 0 ? (
              <div className="py-8 text-center text-xs text-emerald-600 font-semibold flex flex-col items-center gap-1.5">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                All medicines within healthy shelf life & stock levels
              </div>
            ) : (
              <>
                {(alerts.nearExpiryItems || []).slice(0, 2).map((item: any) => (
                  <div key={item.id} className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-rose-900 dark:text-rose-200 truncate max-w-[140px]">{item.productName}</div>
                      <div className="text-[10px] text-rose-600 dark:text-rose-400">
                        Batch #{item.batchNumber} • {item.rackLocation}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 text-[10px] font-black">
                      Exp: {new Date(item.expiryDate).toLocaleDateString()}
                    </span>
                  </div>
                ))}

                {(alerts.lowStockItems || []).slice(0, 2).map((item: any) => (
                  <div key={item.id} className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-amber-900 dark:text-amber-200 truncate max-w-[140px]">{item.productName}</div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400">
                        Rack: {item.rackLocation} • Limit: {item.threshold}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-[10px] font-black">
                      {item.quantity} Left
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
