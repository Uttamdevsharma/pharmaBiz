"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { Building2, Store, Layers, DollarSign, Clock, Loader2 } from "lucide-react";
import { PharmacyGrowthChart } from "./charts/PharmacyGrowthChart";
import { SubscriptionPlanDonutChart } from "./charts/SubscriptionPlanDonutChart";

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
    activeTenants: 0,
    totalTenants: 0,
    newPharmacies: 0,
    newSubscriptions: 0,
    subscriptionRevenue: 0,
    pendingReview: 0,
    pharmacyGrowth: [],
    subscriptionByPlan: {
      starter: 0,
      growth: 0,
      enterprise: 0,
      total: 0,
      breakdown: [],
    },
  };

  return (
    <div className="space-y-6">
      {/* Header & Date Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Platform Overview</h2>
          <p className="text-xs text-slate-500">Real-time health, tenant adoption, and subscription metrics across the network</p>
        </div>

        {/* Date Presets - Clean subtle border radius */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs">
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
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
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
        <div className="flex items-center gap-3 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs w-fit">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-brand-primary" />
          <span className="text-xs">Loading platform metrics...</span>
        </div>
      ) : (
        <>
          {/* 5 Stat Cards - Clean, professional, subtle rounded corners */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* 1. Total Active Pharmacies */}
            <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Active Pharmacies</span>
                <div className="h-7 w-7 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Store className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {metrics.activeTenants ?? metrics.totalTenants ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Live operating tenants
              </div>
            </div>

            {/* 2. New Pharmacies */}
            <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>New Pharmacies</span>
                <div className="h-7 w-7 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {metrics.newPharmacies ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Approved in selected range
              </div>
            </div>

            {/* 3. New Subscriptions */}
            <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>New Subscriptions</span>
                <div className="h-7 w-7 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Layers className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {metrics.newSubscriptions ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Started in selected range
              </div>
            </div>

            {/* 4. Pending Review */}
            <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Pending Review</span>
                <div className="h-7 w-7 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {metrics.pendingReview ?? 0}
              </div>
              <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                Awaiting Admin verification
              </div>
            </div>

            {/* 5. Subscription Revenue (Moved to the very end as requested) */}
            <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Subscription Revenue</span>
                <div className="h-7 w-7 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                ৳{Number(metrics.subscriptionRevenue ?? 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Payments received in range
              </div>
            </div>
          </div>

          {/* 2 Visualizations Below Stat Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart A: Pharmacy Growth (Line Graph) */}
            <PharmacyGrowthChart data={metrics.pharmacyGrowth} loading={loading} />

            {/* Chart B: Subscription by Plan (Pie / Donut Chart) */}
            <SubscriptionPlanDonutChart data={metrics.subscriptionByPlan} loading={loading} />
          </div>
        </>
      )}
    </div>
  );
}
