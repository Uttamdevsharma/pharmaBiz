"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import {
  DollarSign,
  ShoppingCart,
  Store,
  Users,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Loader2,
  Sparkles,
  Clock,
} from "lucide-react";
import { getClientPlanConfig, calculateRemainingTrialDays } from "@/lib/planLimits";

interface OverviewModuleProps {
  onNavigate: (module: any) => void;
}

export function OverviewModule({ onNavigate }: OverviewModuleProps) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [subData, setSubData] = useState<any>(null);
  const [dailySales, setDailySales] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [profileRes, subRes, salesRes, branchesRes, staffRes, lowStockRes] = await Promise.all([
          fetchApi("/tenant/profile"),
          fetchApi("/subscriptions/current"),
          fetchApi("/reports/sales/daily"),
          fetchApi("/branches"),
          fetchApi("/users"),
          fetchApi("/inventory/low-stock"),
        ]);

        if (profileRes.success) setProfile(profileRes.data);
        if (subRes.success) setSubData(subRes.data);
        if (salesRes.success) setDailySales(salesRes.data);
        if (branchesRes.success) setBranches(branchesRes.data || []);
        if (staffRes.success) setStaff(staffRes.data || []);
        if (lowStockRes.success) setLowStock(lowStockRes.data || []);
      } catch (err) {
        console.warn("Error loading dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
        <span>Loading workspace metrics...</span>
      </div>
    );
  }

  const tier = (profile?.tier || subData?.tier || "TRIAL").toUpperCase();
  const isTrial = tier === "TRIAL";
  const planConfig = getClientPlanConfig(tier);
  const currentSub = subData?.subscription || profile?.currentSubscription;

  const trialDaysRemaining = isTrial ? calculateRemainingTrialDays(currentSub?.endDate) : 0;
  const maxBranches = subData?.usage?.maxBranches || planConfig.maxBranches;
  const branchCount = branches.length;
  const branchPercent = Math.min(100, Math.round((branchCount / maxBranches) * 100));

  const nonOwnerStaff = staff.filter((s) => s.role !== "COMPANY_OWNER");
  const maxStaff = isTrial ? 1 : planConfig.maxTotalStaff || 999;
  const staffPercent = Math.min(100, Math.round((nonOwnerStaff.length / maxStaff) * 100));

  return (
    <div className="space-y-8">
      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {profile?.name || "Pharmacy Overview"}
          </h1>
          <p className="text-xs text-slate-500">Live operational telemetry, counter sales, and branch network status</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("pos")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold shadow hover:opacity-90 transition active:scale-95"
          >
            <ShoppingCart className="h-4 w-4" />
            Launch POS Counter
          </button>
        </div>
      </div>

      {/* Trial Status Highlight Card if on Free Trial */}
      {isTrial && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 border-2 border-emerald-500/30 dark:border-emerald-500/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <Clock className="h-6 w-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500 text-white">
                  Plan 0 - Free Trial
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {trialDaysRemaining} Day(s) Remaining
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                7-Day Free Testing Sandbox
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                Test all core pharmacy workflows with 1 branch and 1 staff member. Upgrade anytime before trial expiration to remove trial limits and unlock multi-branch scaling.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate("subscription")}
            className="px-5 py-3 rounded-xl bg-brand-primary text-white font-bold text-xs shadow-md hover:opacity-90 transition active:scale-95 flex items-center justify-center gap-2 shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            Upgrade Plan Anytime
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Today Sales */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Today's Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            ৳ {dailySales?.summary?.totalSales?.toLocaleString() || "0"}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>{dailySales?.summary?.transactionCount || 0} Transactions Completed</span>
          </div>
        </div>

        {/* Branch Network */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Active Stores</span>
            <Store className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {branchCount} <span className="text-xs text-slate-400 font-normal">/ {maxBranches >= 999 ? "∞" : maxBranches}</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {planConfig.name} ({Math.max(0, maxBranches - branchCount)} available)
          </div>
        </div>

        {/* Total Staff */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Staff Assigned</span>
            <Users className="h-4 w-4 text-brand-primary" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {nonOwnerStaff.length} <span className="text-xs text-slate-400 font-normal">/ {maxStaff >= 999 ? "∞" : maxStaff}</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {isTrial ? "Trial Staff Limit (1 max)" : `${planConfig.maxStaffPerBranch} per branch allowed`}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Low Stock Alerts</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{lowStock.length}</div>
          <div className="text-[11px] text-amber-600 font-medium">
            {lowStock.length > 0 ? "Requires restock order" : "All batches healthy"}
          </div>
        </div>
      </div>

      {/* Plan Usage & Capacity Meters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Branch Capacity */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Store className="h-4 w-4 text-brand-primary" />
                Branch Store Capacity ({planConfig.name})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Utilizing {branchCount} of {maxBranches >= 999 ? "Unlimited" : maxBranches} physical branch stores.
              </p>
            </div>
            <button
              onClick={() => onNavigate("subscription")}
              className="text-xs font-bold text-brand-primary hover:underline"
            >
              Upgrade →
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-brand-primary rounded-full transition-all duration-500"
                style={{ width: `${branchPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>{branchCount} Stores registered</span>
              <span>{maxBranches >= 999 ? "Unlimited" : `${maxBranches} Max Allowed`}</span>
            </div>
          </div>
        </div>

        {/* Staff Capacity */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-500" />
                Staff Capacity ({isTrial ? "Plan 0 Limit" : `${planConfig.maxStaffPerBranch} / Branch`})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Utilizing {nonOwnerStaff.length} of {maxStaff >= 999 ? "Unlimited" : maxStaff} staff slots.
              </p>
            </div>
            <button
              onClick={() => onNavigate("subscription")}
              className="text-xs font-bold text-brand-primary hover:underline"
            >
              Upgrade →
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${staffPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>{nonOwnerStaff.length} Staff members</span>
              <span>{maxStaff >= 999 ? "Unlimited" : `${maxStaff} Max Allowed`}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div
          onClick={() => onNavigate("branches")}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md cursor-pointer transition-all space-y-3 group"
        >
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Store className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Branch Management</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Create and configure store locations, phone numbers, and address details.
          </p>
        </div>

        <div
          onClick={() => onNavigate("staff")}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md cursor-pointer transition-all space-y-3 group"
        >
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Users className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Staff & Roles</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Add Branch Managers, Cashiers, and assign staff members to individual stores.
          </p>
        </div>

        <div
          onClick={() => onNavigate("inv_product_list")}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md cursor-pointer transition-all space-y-3 group"
        >
          <div className="h-10 w-10 rounded-xl brand-subtle-bg text-brand-primary flex items-center justify-center group-hover:scale-105 transition-transform">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Master Product Catalog</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Maintain drug prices, prescription flags, barcodes, and stock levels.
          </p>
        </div>
      </div>
    </div>
  );
}
