"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { Building2, Layers, DollarSign, TrendingUp, Loader2 } from "lucide-react";

type DatePreset = "ALL" | "TODAY" | "YESTERDAY" | "THIS_MONTH" | "LAST_MONTH" | "THIS_YEAR" | "CUSTOM";

export function OverviewTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Date Filters
  const [dateFilter, setDateFilter] = useState<DatePreset>("ALL");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFilter && dateFilter !== "ALL") params.append("datePreset", dateFilter);
      if (dateFilter === "CUSTOM") {
        if (customStartDate) params.append("startDate", customStartDate);
        if (customEndDate) params.append("endDate", customEndDate);
      }

      const res = await fetchApi(`/super-admin/analytics?${params.toString()}`);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to load platform analytics", err);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const metrics = data || {
    totalTenants: 0,
    activeTenants: 0,
    suspendedTenants: 0,
    tierBreakdown: { starter: 0, growth: 0, enterprise: 0 },
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    totalPlatformRevenue: 0,
    monthlyRecurringRevenue: 0,
    recentTenants: [],
  };

  return (
    <div className="space-y-8">
      {/* Header & Date Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Platform Overview</h2>
          <p className="text-sm text-slate-500">Real-time health, tenant adoption, and subscription metrics across the network</p>
        </div>

        {/* Date Presets */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          {[
            { id: "ALL", label: "All Time" },
            { id: "TODAY", label: "Today" },
            { id: "YESTERDAY", label: "Yesterday" },
            { id: "THIS_MONTH", label: "This Month" },
            { id: "LAST_MONTH", label: "Last Month" },
            { id: "THIS_YEAR", label: "This Year" },
            { id: "CUSTOM", label: "Custom Date" },
          ].map((df) => (
            <button
              key={df.id}
              onClick={() => setDateFilter(df.id as DatePreset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                dateFilter === df.id
                  ? "bg-brand-primary text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {df.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Inputs */}
      {dateFilter === "CUSTOM" && (
        <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs w-fit">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
          <span>Loading platform metrics...</span>
        </div>
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Tenants */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
                <span>Total Pharmacies</span>
                <Building2 className="h-4 w-4 text-brand-primary" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{metrics.totalTenants}</div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {metrics.activeTenants} Active ({metrics.suspendedTenants} Suspended)
              </div>
            </div>

            {/* Active Subscriptions */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
                <span>Active Subscriptions</span>
                <Layers className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{metrics.activeSubscriptions}</div>
              <div className="text-xs text-slate-500 font-medium">
                Out of {metrics.totalSubscriptions} Total Subscriptions
              </div>
            </div>

            {/* MRR */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
                <span>Monthly Recurring (MRR)</span>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">৳{Number(metrics.monthlyRecurringRevenue || 0).toLocaleString()}</div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Active Annual & Monthly Subscriptions
              </div>
            </div>

            {/* Total Platform Revenue */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
                <span>Platform Revenue</span>
                <DollarSign className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">৳{Number(metrics.totalPlatformRevenue || 0).toLocaleString()}</div>
              <div className="text-xs text-slate-500 font-medium">
                Processed via SSLCOMMERZ Sandbox
              </div>
            </div>
          </div>

          {/* Plan Tier Distribution Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">Starter Plan (Active)</div>
                <div className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{metrics.tierBreakdown?.starter || 0}</div>
                <div className="text-[11px] text-slate-400">1-3 Branches</div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Starter
              </span>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">Growth Plan (Active)</div>
                <div className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{metrics.tierBreakdown?.growth || 0}</div>
                <div className="text-[11px] text-slate-400">4-20 Branches</div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Growth
              </span>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">Enterprise Plan (Active)</div>
                <div className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{metrics.tierBreakdown?.enterprise || 0}</div>
                <div className="text-[11px] text-slate-400">21+ Branches</div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                Enterprise
              </span>
            </div>
          </div>

          {/* Recent Pharmacy Signups */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Pharmacy Tenants</h3>
            {metrics.recentTenants && metrics.recentTenants.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="pb-3 font-semibold">Pharmacy Name</th>
                      <th className="pb-3 font-semibold">Plan Tier</th>
                      <th className="pb-3 font-semibold">Branches</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Created Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {metrics.recentTenants.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 font-bold text-slate-900 dark:text-white">{t.name}</td>
                        <td className="py-3">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {t.tier}
                          </span>
                        </td>
                        <td className="py-3">{t.branchCount} Branches</td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              t.isActive
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-red-500/10 text-red-600 dark:text-red-400"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${t.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                            {t.isActive ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="py-3 text-xs text-slate-400">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">No recent pharmacy signups for this date range.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

