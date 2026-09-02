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
  Clock,
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
} from "lucide-react";
import { getClientPlanConfig, calculateRemainingTrialDays } from "@/lib/planLimits";

interface OverviewModuleProps {
  onNavigate: (module: any) => void;
}

export function OverviewModule({ onNavigate }: OverviewModuleProps) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [subData, setSubData] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, profileRes, subRes, branchRes] = await Promise.all([
        fetchApi<any>("/reports/dashboard"),
        fetchApi<any>("/tenant/profile"),
        fetchApi<any>("/subscriptions/current"),
        fetchApi<any>("/branches"),
      ]);

      if (dashRes.success) setDashboardData(dashRes.data);
      if (profileRes.success) setProfile(profileRes.data);
      if (subRes.success) setSubData(subRes.data);
      if (branchRes.success) setBranches(branchRes.data || []);
    } catch (err) {
      console.warn("Error loading dashboard metrics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <span className="text-sm font-semibold">Aggregating real-time business telemetry...</span>
      </div>
    );
  }

  const summary = dashboardData?.summary || {};
  const charts = dashboardData?.charts || {};
  const alerts = dashboardData?.alerts || {};

  const tier = (profile?.tier || subData?.tier || "TRIAL").toUpperCase();
  const isTrial = tier === "TRIAL";
  const planConfig = getClientPlanConfig(tier);
  const currentSub = subData?.subscription || profile?.currentSubscription;
  const trialDaysRemaining = isTrial ? calculateRemainingTrialDays(currentSub?.endDate) : 0;

  // Trend chart helpers
  const trendData: any[] = charts.dailySalesTrend || [];
  const maxRevenue = Math.max(...trendData.map((d: any) => d.revenue || 0), 1000);

  // Payment Breakdown helpers
  const paymentBreakdown = charts.paymentBreakdown || { CASH: 0, CARD: 0, MOBILE: 0, OTHER: 0 };
  const totalPayment = (paymentBreakdown.CASH || 0) + (paymentBreakdown.CARD || 0) + (paymentBreakdown.MOBILE || 0) + (paymentBreakdown.OTHER || 0) || 1;

  const cashPercent = Math.round(((paymentBreakdown.CASH || 0) / totalPayment) * 100);
  const cardPercent = Math.round(((paymentBreakdown.CARD || 0) / totalPayment) * 100);
  const mobilePercent = Math.round(((paymentBreakdown.MOBILE || 0) / totalPayment) * 100);

  // Category Distribution
  const categoryList: any[] = charts.categoryDistribution || [];
  const totalCatRevenue = categoryList.reduce((sum, c) => sum + (c.revenue || 0), 0) || 1;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>{profile?.name || "Pharmacy Overview"}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              Live
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time sales telemetry, profit analytics, stock valuation, and liquidity management.
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
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-lg transition active:scale-95"
          >
            <ShoppingCart className="h-4 w-4" />
            Launch POS Counter
          </button>
        </div>
      </div>

      {/* PRIMARY KPI METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-xl relative overflow-hidden flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between opacity-80 text-xs font-bold uppercase tracking-wider">
            <span>Today's Counter Sales</span>
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <div className="text-3xl font-black">
              ৳{Number(summary.todaySales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs opacity-90 mt-1 font-medium">
              {summary.todayTransactions || 0} customer orders completed today
            </div>
          </div>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="opacity-80">Weekly: ৳{Number(summary.weeklySales || 0).toLocaleString()}</span>
            <span className="font-bold">Monthly: ৳{Number(summary.monthlySales || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Total Net Profit */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Estimated Gross Profit</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              ৳{Number(summary.totalProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-1">Calculated from (Selling Price - Purchase Cost)</div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Total Sales Volume</span>
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
            <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
              ৳{Number(summary.totalInventoryValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-1">{summary.totalStockUnits?.toLocaleString() || 0} total stock units in stock</div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-amber-600 font-semibold">{summary.lowStockCount || 0} low stock</span>
            <span className="text-red-500 font-semibold">{summary.nearExpiryCount || 0} near expiry</span>
          </div>
        </div>

        {/* Total Liquidity / Cash in Hand */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Liquid Cash & Bank</span>
            <Wallet className="h-4 w-4 text-purple-500" />
          </div>
          <div>
            <div className="text-3xl font-black text-purple-600 dark:text-purple-400">
              ৳{Number((summary.cashBalance || 0) + (summary.bankBalance || 0) + (summary.digitalWalletBalance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-1">Cash: ৳{Number(summary.cashBalance || 0).toLocaleString()} • Bank: ৳{Number(summary.bankBalance || 0).toLocaleString()}</div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Supplier Dues</span>
            <span className="text-red-500 font-bold">৳{Number(summary.supplierDues || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Revenue Trend (7-Day Bar / Column chart) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                7-Day Sales & Revenue Trend
              </h3>
              <p className="text-xs text-slate-400">Daily revenue and profit trajectory</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">Last 7 Days</span>
          </div>

          {/* Dynamic SVG / HTML Bar Chart */}
          <div className="h-56 flex items-end justify-between gap-2 sm:gap-4 pt-6 pb-2 border-b border-slate-100 dark:border-slate-800">
            {trendData.map((day: any, idx: number) => {
              const heightPercent = Math.max(8, Math.min(100, Math.round((day.revenue / maxRevenue) * 100)));
              const dayLabel = new Date(day.date).toLocaleDateString("en-US", { weekday: "short" });
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="opacity-0 group-hover:opacity-100 transition text-[10px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    ৳{Math.round(day.revenue)}
                  </div>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full max-w-[40px] rounded-t-xl bg-gradient-to-t from-emerald-600 to-teal-400 group-hover:from-emerald-500 group-hover:to-teal-300 transition duration-200 shadow-md"
                  />
                  <span className="text-[11px] font-semibold text-slate-500">{dayLabel}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-600" />
                Daily Revenue
              </span>
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Total 7-Day Revenue: ৳{Number(summary.weeklySales || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Payment Method Distribution */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              Payment Channels
            </h3>
            <p className="text-xs text-slate-400">Breakdown of customer settlements</p>
          </div>

          <div className="space-y-4">
            {/* Cash */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Wallet className="h-3.5 w-3.5 text-emerald-500" />
                  Cash ({cashPercent}%)
                </span>
                <span>৳{Number(paymentBreakdown.CASH || 0).toLocaleString()}</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div style={{ width: `${cashPercent}%` }} className="h-full bg-emerald-500 rounded-full" />
              </div>
            </div>

            {/* Mobile Banking (bKash/Nagad) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Smartphone className="h-3.5 w-3.5 text-pink-500" />
                  bKash / Nagad ({mobilePercent}%)
                </span>
                <span>৳{Number(paymentBreakdown.MOBILE || 0).toLocaleString()}</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div style={{ width: `${mobilePercent}%` }} className="h-full bg-pink-500 rounded-full" />
              </div>
            </div>

            {/* Card Settlement */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                  Cards ({cardPercent}%)
                </span>
                <span>৳{Number(paymentBreakdown.CARD || 0).toLocaleString()}</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div style={{ width: `${cardPercent}%` }} className="h-full bg-blue-500 rounded-full" />
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate("roles")}
            className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center justify-center gap-1.5"
          >
            Manage Financial Accounts
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

          <div className="space-y-3 pt-2">
            {categoryList.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">No category sales recorded yet.</div>
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

        {/* Top Selling Products */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Top Selling Medicines
            </h3>
            <span className="text-xs text-slate-400">Leaderboard</span>
          </div>

          <div className="space-y-3 pt-1">
            {(charts.topSellingProducts || []).length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">No product sales yet.</div>
            ) : (
              (charts.topSellingProducts || []).map((prod: any, idx: number) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 text-xs font-black flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{prod.name}</div>
                      <div className="text-[11px] text-slate-400">{prod.quantity} units sold</div>
                    </div>
                  </div>
                  <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
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
              <AlertTriangle className="h-5 w-5 text-red-500" />
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
              <div className="py-6 text-center text-xs text-emerald-600 font-semibold flex flex-col items-center gap-1">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                All batches within healthy shelf life & stock levels
              </div>
            ) : (
              <>
                {(alerts.nearExpiryItems || []).map((item: any) => (
                  <div key={item.id} className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-red-900 dark:text-red-200">{item.productName}</div>
                      <div className="text-[10px] text-red-600 dark:text-red-400">
                        Batch #{item.batchNumber} • Rack: {item.rackLocation}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-[10px] font-black">
                      Exp: {new Date(item.expiryDate).toLocaleDateString()}
                    </span>
                  </div>
                ))}

                {(alerts.lowStockItems || []).map((item: any) => (
                  <div key={item.id} className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-amber-900 dark:text-amber-200">{item.productName}</div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400">
                        Rack: {item.rackLocation} • Threshold: {item.threshold}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-[10px] font-black">
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
