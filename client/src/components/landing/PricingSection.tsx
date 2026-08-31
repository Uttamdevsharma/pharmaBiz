"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSettings } from "@/context/SettingsContext";
import { Check, Sparkles, Building, ArrowRight, Clock, Users } from "lucide-react";

export function PricingSection() {
  const { settings } = useSettings();
  const [isYearly, setIsYearly] = useState(false);

  const fallbackPlans = [
    {
      id: "1",
      name: "Plan 1 - Starter",
      tier: "STARTER",
      price: 500,
      billingCycle: "MONTHLY",
      maxBranches: 2,
      maxStaffPerBranch: 1,
      features: {
        branches: "Max 2 Branches (Main + 1)",
        staff: "1 Staff per Branch",
        inventoryTransfers: false,
        apiAccess: false,
        auditReports: "Basic Audit Trail",
      },
      isActive: true,
    },
    {
      id: "2",
      name: "Plan 2 - Growth",
      tier: "GROWTH",
      price: 1500,
      billingCycle: "MONTHLY",
      maxBranches: 3,
      maxStaffPerBranch: 3,
      features: {
        branches: "Max 3 Branches",
        staff: "3 Staff per Branch",
        inventoryTransfers: true,
        apiAccess: false,
        auditReports: "Standard Reports & Inter-Branch Transfers",
      },
      isActive: true,
    },
    {
      id: "3",
      name: "Plan 3 - Enterprise",
      tier: "ENTERPRISE",
      price: 3000,
      billingCycle: "MONTHLY",
      maxBranches: 999,
      maxStaffPerBranch: 999,
      features: {
        branches: "Unlimited Branches",
        staff: "Unlimited Staff",
        inventoryTransfers: true,
        apiAccess: true,
        auditReports: "Custom & VAT/MIS Compliance Export",
      },
      isActive: true,
    },
  ];

  // Filter out TRIAL if in settings.plans so we show Paid tiers in grid with dedicated Free Trial banner
  const rawPlans = settings.plans && settings.plans.length > 0 ? settings.plans : fallbackPlans;
  const paidPlans = rawPlans.filter((p: any) => p.tier !== "TRIAL");

  return (
    <section id="pricing" className="py-24 bg-slate-100/60 dark:bg-slate-900/40 border-y border-slate-200/60 dark:border-slate-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider brand-subtle-bg text-brand-primary border brand-subtle-border">
            Flexible Subscription Tiers
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Transparent Pricing Designed To Scale With You
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
            Start with our 7-Day Free Trial, then choose the plan matching your branch scale.
          </p>

          {/* Free Trial Highlight Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-300 text-xs sm:text-sm font-semibold flex flex-col sm:flex-row items-center justify-between gap-4 max-w-2xl mx-auto shadow-sm">
            <div className="flex items-center gap-2.5">
              <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                <strong>Plan 0 - Free Trial:</strong> 7 days full testing, max 1 branch & 1 staff. No credit card required.
              </span>
            </div>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow hover:bg-emerald-700 transition shrink-0 flex items-center gap-1.5"
            >
              Start Free Trial
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <span className={`text-sm font-medium ${!isYearly ? "text-slate-900 dark:text-white font-bold" : "text-slate-500"}`}>
              Monthly Billing
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="relative inline-flex h-7 w-14 items-center rounded-full bg-slate-300 dark:bg-slate-700 transition-colors focus:outline-none"
              role="switch"
              aria-checked={isYearly}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  isYearly ? "translate-x-8 bg-brand-primary" : "translate-x-1"
                }`}
              />
            </button>
            <span className={`text-sm font-medium flex items-center gap-1.5 ${isYearly ? "text-slate-900 dark:text-white font-bold" : "text-slate-500"}`}>
              Annual Billing
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Save 15%
              </span>
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {paidPlans.map((plan: any) => {
            const isGrowth = plan.tier === "GROWTH";
            const basePrice = Number(plan.price);
            const displayPrice = isYearly ? Math.round(basePrice * 12 * 0.85) : basePrice;
            const period = isYearly ? "/year" : "/month";

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 ${
                  isGrowth
                    ? "bg-white dark:bg-slate-900 border-2 border-brand-primary shadow-xl scale-105 z-10"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg"
                }`}
              >
                {isGrowth && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-brand-primary text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                    <Sparkles className="h-3.5 w-3.5" />
                    Most Popular
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 uppercase font-semibold tracking-wider">
                      Tier: {plan.tier}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white">
                      ৳{displayPrice.toLocaleString()}
                    </span>
                    <span className="text-sm font-medium text-slate-500">{period}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Building className="h-4 w-4 text-brand-primary shrink-0" />
                      <span>
                        Supports up to <strong>{plan.maxBranches >= 999 ? "Unlimited" : `${plan.maxBranches}`} Branches</strong>
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Users className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>
                        {plan.tier === "STARTER"
                          ? "1 Staff per Branch"
                          : plan.tier === "GROWTH"
                          ? "3 Staff per Branch"
                          : "Unlimited Staff"}
                      </span>
                    </div>
                  </div>

                  {/* Feature List */}
                  <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Offline POS with 72h Queueing</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Centralized Product & Price Catalog</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className={`h-4 w-4 shrink-0 ${plan.tier !== "STARTER" ? "text-emerald-500" : "text-slate-300 dark:text-slate-700"}`} />
                      <span className={plan.tier === "STARTER" ? "text-slate-400 line-through" : ""}>
                        Inter-Branch Stock Transfers
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className={`h-4 w-4 shrink-0 ${plan.tier !== "STARTER" ? "text-emerald-500" : "text-slate-300 dark:text-slate-700"}`} />
                      <span className={plan.tier === "STARTER" ? "text-slate-400 line-through" : ""}>
                        Regional Admin Role Hierarchy
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className={`h-4 w-4 shrink-0 ${plan.tier === "ENTERPRISE" ? "text-emerald-500" : "text-slate-300 dark:text-slate-700"}`} />
                      <span className={plan.tier !== "ENTERPRISE" ? "text-slate-400 line-through" : ""}>
                        Full VAT/MIS Compliance Export
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="pt-8 mt-6 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href={`/register?planId=${plan.id}&billing=${isYearly ? "YEARLY" : "MONTHLY"}`}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 ${
                      isGrowth
                        ? "bg-brand-primary text-white hover:opacity-90 shadow-md"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    Get Started with {plan.name}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
