"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { BarChart3, TrendingUp, DollarSign, Building2, ShieldCheck, Loader2 } from "lucide-react";

export function AnalyticsTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await fetchApi("/super-admin/analytics");
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error("Failed to load analytics", err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
        <span>Loading analytics...</span>
      </div>
    );
  }

  const mrr = data?.monthlyRecurringRevenue || 0;
  const arr = mrr * 12;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Platform Analytics</h2>
        <p className="text-sm text-slate-500">Macro SaaS subscription financial performance and tenant growth telemetry</p>
      </div>

      {/* Revenue Projection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase">Monthly Recurring (MRR)</div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">৳{mrr.toLocaleString()}</div>
          <p className="text-xs text-emerald-600 font-medium">Based on active tenant subscriptions</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase">Annualized Run Rate (ARR)</div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">৳{arr.toLocaleString()}</div>
          <p className="text-xs text-blue-600 font-medium">Projected 12-month platform value</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase">Total Platform Collected</div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">৳{(data?.totalPlatformRevenue || 0).toLocaleString()}</div>
          <p className="text-xs text-purple-600 font-medium">Gross gateway settlements</p>
        </div>
      </div>

      {/* Plan Tier Breakdown Visual */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Plan Distribution</h3>
            <p className="text-xs text-slate-500">Live breakdown of active subscriptions across tiers</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {data?.activeSubscriptions || 0} Active / {data?.totalSubscriptions || 0} Total Subscriptions
          </span>
        </div>

        {(() => {
          const activeTotal =
            (data?.tierBreakdown?.starter || 0) +
            (data?.tierBreakdown?.growth || 0) +
            (data?.tierBreakdown?.enterprise || 0);
          const denominator = activeTotal > 0 ? activeTotal : 1;

          return (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Starter Tier (1-3 Branches)</span>
                  <span>{data?.tierBreakdown?.starter || 0} Active Subscriptions ({Math.round(((data?.tierBreakdown?.starter || 0) / denominator) * 100)}%)</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ((data?.tierBreakdown?.starter || 0) / denominator) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Growth Tier (4-20 Branches)</span>
                  <span>{data?.tierBreakdown?.growth || 0} Active Subscriptions ({Math.round(((data?.tierBreakdown?.growth || 0) / denominator) * 100)}%)</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ((data?.tierBreakdown?.growth || 0) / denominator) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Enterprise Tier (21+ Branches)</span>
                  <span>{data?.tierBreakdown?.enterprise || 0} Active Subscriptions ({Math.round(((data?.tierBreakdown?.enterprise || 0) / denominator) * 100)}%)</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ((data?.tierBreakdown?.enterprise || 0) / denominator) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
