"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import {
  Building2,
  Store,
  Layers,
  DollarSign,
  Clock,
  Loader2,
  CreditCard,
  XCircle,
  AlertTriangle,
} from "lucide-react";
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
    totalActivePharmacies: 0,
    activeTenants: 0,
    totalTenants: 0,
    newPharmacies: 0,
    newSubscriptions: 0,
    subscriptionRevenue: 0,
    pendingReview: 0,
    awaitingPayment: 0,
    rejectedPharmacies: 0,
    expiringSoonSubscriptions: 0,
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

        {/* Date Presets - Strictly rounded-none */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-xs">
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
              className={`px-3 py-1.5 rounded-none text-xs font-semibold transition cursor-pointer ${
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

      {/* Custom Date Inputs - Strictly rounded-none */}
      {dateFilter === "CUSTOM" && (
        <div className="flex items-center gap-3 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-xs w-fit">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-none border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-none border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
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
          {/* Section 1: Business Health & Revenue Metrics (4 Primary Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Active Pharmacies */}
            <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2 rounded-none">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Active Pharmacies
                </span>
                <div className="p-2 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-none shrink-0">
                  <Store className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                  {metrics.totalActivePharmacies ?? metrics.activeTenants ?? 0}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
                  Live operating tenants
                </div>
              </div>
            </div>

            {/* 2. Subscription Revenue */}
            <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2 rounded-none">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Subscription Revenue
                </span>
                <div className="p-2 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-none shrink-0">
                  <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                  ৳{Number(metrics.subscriptionRevenue ?? 0).toLocaleString()}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
                  Payments received in range
                </div>
              </div>
            </div>

            {/* 3. New Subscriptions */}
            <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2 rounded-none">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  New Subscriptions
                </span>
                <div className="p-2 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-none shrink-0">
                  <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                  {metrics.newSubscriptions ?? 0}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
                  Started in selected range
                </div>
              </div>
            </div>

            {/* 4. Expiring Soon (Within 15 days) */}
            <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2 rounded-none">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Expiring Soon
                </span>
                <div className="p-2 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-none shrink-0">
                  <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
                  {metrics.expiringSoonSubscriptions ?? 0}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
                  Ending within 15 days
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Pharmacy Onboarding & Verification Pipeline (4 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 5. New Approved Pharmacies */}
            <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2 rounded-none">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  New Approved
                </span>
                <div className="p-2 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-none shrink-0">
                  <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                  {metrics.newPharmacies ?? 0}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
                  Approved in selected range
                </div>
              </div>
            </div>

            {/* 6. Pending Review */}
            <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2 rounded-none">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Pending Review
                </span>
                <div className="p-2 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-none shrink-0">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
                  {metrics.pendingReview ?? 0}
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                  Awaiting Admin verification
                </div>
              </div>
            </div>

            {/* 7. Awaiting Payment (Approved but unpaid) */}
            <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2 rounded-none">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Awaiting Payment
                </span>
                <div className="p-2 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-none shrink-0">
                  <CreditCard className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400 font-mono tracking-tight">
                  {metrics.awaitingPayment ?? 0}
                </div>
                <div className="text-xs text-sky-600 dark:text-sky-400 font-medium mt-1">
                  Approved, waiting for payment
                </div>
              </div>
            </div>

            {/* 8. Rejected Applications */}
            <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2 rounded-none">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Rejected
                </span>
                <div className="p-2 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-none shrink-0">
                  <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
                  {metrics.rejectedPharmacies ?? 0}
                </div>
                <div className="text-xs text-rose-500 font-medium mt-1">
                  Declined / ineligible applications
                </div>
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
