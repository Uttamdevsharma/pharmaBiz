"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { Pill, LogOut, Store, Sparkles, Clock } from "lucide-react";
import { getClientPlanConfig } from "@/lib/planLimits";

interface DashboardHeaderProps {
  tenantName?: string;
  tier?: string;
  isTrial?: boolean;
  trialDaysRemaining?: number;
  branches?: any[];
  selectedBranchId?: string;
  onBranchChange?: (branchId: string) => void;
}

export function DashboardHeader({
  tenantName,
  tier = "TRIAL",
  isTrial = false,
  trialDaysRemaining,
  branches = [],
  selectedBranchId,
  onBranchChange,
}: DashboardHeaderProps) {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const planConfig = getClientPlanConfig(tier);

  const isTrialTier = isTrial || tier === "TRIAL";

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5">
          {settings.logoUrl ? (
            <div className="h-9 w-9 rounded-lg overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-0.5 shadow-sm">
              <img
                src={settings.logoUrl}
                alt={settings.siteName || "Logo"}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="h-9 w-9 rounded-lg bg-brand-primary flex items-center justify-center text-white shadow-sm">
              <Pill className="h-5 w-5 transform -rotate-45" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
              {tenantName || "Pharmacy Chain"}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Owner Workspace</span>
          </div>
        </Link>

        <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>

        {isTrialTier ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Clock className="h-3 w-3" />
            {trialDaysRemaining !== undefined ? `Free Trial (${trialDaysRemaining}d left)` : "Plan 0 - Free Trial"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
            <Sparkles className="h-3 w-3" />
            {planConfig.name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Branch Context Dropdown */}
        {branches.length > 0 && onBranchChange && (
          <div className="hidden md:flex items-center gap-2">
            <Store className="h-4 w-4 text-slate-400" />
            <select
              value={selectedBranchId || ""}
              onChange={(e) => onBranchChange(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              {user?.name || user?.username || "Pharmacy Owner"}
            </div>
            <div className="text-[10px] text-brand-primary font-semibold uppercase">
              {user?.role?.replace("_", " ")}
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
