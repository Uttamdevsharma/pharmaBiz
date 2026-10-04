"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSettings } from "@/context/SettingsContext";
import { Check, Sparkles, Building, ArrowRight, Users, MessageSquare } from "lucide-react";

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

  const rawPlans = settings.plans && settings.plans.length > 0 ? settings.plans : fallbackPlans;
  const displayPlans = rawPlans.filter((p: any) => p.isActive !== false);

  const sortedPlans = [...displayPlans].sort((a: any, b: any) => {
    const isCustomA = Boolean(
      a.isCustom ||
      a.features?.isCustom ||
      (a.tier === "ENTERPRISE" && (a.whatsappNumber || a.features?.whatsappNumber || a.name?.toLowerCase().includes("custom")))
    );
    const isCustomB = Boolean(
      b.isCustom ||
      b.features?.isCustom ||
      (b.tier === "ENTERPRISE" && (b.whatsappNumber || b.features?.whatsappNumber || b.name?.toLowerCase().includes("custom")))
    );

    // Custom plan always at 4th / last position
    if (isCustomA && !isCustomB) return 1;
    if (!isCustomA && isCustomB) return -1;

    // Free Trial plan always first
    const isTrialA = Boolean(a.tier === "TRIAL" || a.isTrial || a.features?.isTrial);
    const isTrialB = Boolean(b.tier === "TRIAL" || b.isTrial || b.features?.isTrial);
    if (isTrialA && !isTrialB) return -1;
    if (!isTrialA && isTrialB) return 1;

    return Number(a.price || 0) - Number(b.price || 0);
  });

  return (
    <section id="pricing" className="py-24 bg-slate-100/60 dark:bg-slate-900/40 border-y border-slate-200/60 dark:border-slate-800/60">
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 space-y-12 2xl:space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl 2xl:max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider brand-subtle-bg text-brand-primary border brand-subtle-border">
            Flexible Subscription Tiers
          </div>
          <h2 className="text-3xl sm:text-4xl 2xl:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Transparent Pricing Designed To Scale With You
          </h2>
          <p className="text-base sm:text-lg 2xl:text-xl text-slate-600 dark:text-slate-400">
            Choose the subscription plan that best matches your pharmacy scale.
          </p>

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 2xl:gap-10 items-stretch">
          {sortedPlans.map((plan: any, idx: number) => {
            const isTrial = Boolean(plan.tier === "TRIAL" || plan.isTrial || plan.features?.isTrial);
            const isCustom = Boolean(plan.isCustom || plan.features?.isCustom);
            const isGrowth = plan.tier === "GROWTH" && !isTrial && !isCustom;
            const trialDays = Number(plan.trialDays || plan.features?.trialDays || 14);
            const basePrice = Number(plan.price);
            const displayPrice = isYearly ? Math.round(basePrice * 12 * 0.85) : basePrice;
            const period = isTrial ? `/${trialDays} days trial` : isCustom ? "Custom" : (isYearly ? "/year" : "/month");
            const whatsappNum = (plan.whatsappNumber || plan.features?.whatsappNumber || "8801700000000").replace(/\D/g, "");
            const whatsappMsg = encodeURIComponent(plan.customMessage || plan.features?.customMessage || `Hello, I am interested in the ${plan.name} Enterprise plan for PharmaBiz.`);
            const isCenteredSingle = (sortedPlans.length === 4 && idx === 3) || (sortedPlans.length % 3 === 1 && idx === sortedPlans.length - 1);

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl 2xl:rounded-3xl p-8 2xl:p-10 flex flex-col justify-between transition-all duration-300 ${
                  isCenteredSingle ? "lg:col-start-2" : ""
                } ${
                  isTrial
                    ? "bg-white dark:bg-slate-900 border-2 border-emerald-500 shadow-xl"
                    : isGrowth
                    ? "bg-white dark:bg-slate-900 border-2 border-brand-primary shadow-xl scale-105 z-10"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg"
                }`}
              >
                {isTrial && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                    <Sparkles className="h-3.5 w-3.5" />
                    Free Trial
                  </div>
                )}
                {!isTrial && isGrowth && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-brand-primary text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                    <Sparkles className="h-3.5 w-3.5" />
                    Most Popular
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 uppercase font-semibold tracking-wider">
                      {isTrial ? "Trial Tier" : isCustom ? "Custom Enterprise" : `Tier: ${plan.tier}`}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    {isTrial ? (
                      <>
                        <span className="text-4xl sm:text-5xl font-extrabold text-emerald-600 dark:text-emerald-400">
                          ৳0
                        </span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full ml-1">
                          {trialDays} Days Free
                        </span>
                      </>
                    ) : isCustom ? (
                      <>
                        <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                          Custom
                        </span>
                        <span className="text-sm font-medium text-slate-500">Contact Us</span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white">
                          ৳{displayPrice.toLocaleString()}
                        </span>
                        <span className="text-sm font-medium text-slate-500">{period}</span>
                      </>
                    )}
                  </div>

                  {!isCustom && (
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
                  )}
                  {isCustom && (
                    <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <Building className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Custom branch capacity & staff limits based on your consultation</span>
                    </div>
                  )}

                  {/* Feature List */}
                  <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>100% Offline POS & Auto Cloud Sync</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>
                        {plan.tier === "STARTER"
                          ? "Real-time Inventory & Stock Tracking"
                          : plan.tier === "GROWTH"
                          ? "Multi-Branch Stock & Batch Tracking"
                          : "Centralized Multi-Store Inventory Control"}
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>
                        {plan.tier === "STARTER"
                          ? "Medicine Expiry & Low-Stock Alerts"
                          : plan.tier === "GROWTH"
                          ? "Medicine Expiry, Damage & Near-Expiry Alerts"
                          : "Full Expiry, Damage & Batch Audit Trails"}
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>
                        {plan.tier === "STARTER"
                          ? "Thermal Receipt & Barcode Support"
                          : plan.tier === "GROWTH"
                          ? "Customer Ledger & Due Tracking"
                          : "Customer Credit Ledger & Accounts Reports"}
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>
                        {plan.tier === "STARTER"
                          ? "Daily Sales & Revenue Reports"
                          : plan.tier === "GROWTH"
                          ? "Custom Roles & Permission Control"
                          : "Unlimited Custom Roles & Granular RBAC"}
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>
                        {plan.tier === "STARTER"
                          ? "Standard Customer Support"
                          : plan.tier === "GROWTH"
                          ? "Priority Phone & WhatsApp Support"
                          : "24/7 Dedicated Account Manager"}
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="pt-8 mt-6 border-t border-slate-100 dark:border-slate-800">
                  {isCustom ? (
                    <a
                      href={`https://wa.me/${whatsappNum}?text=${whatsappMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Chat on WhatsApp</span>
                    </a>
                  ) : (
                    <Link
                      href={`/register?planId=${plan.id}${isTrial ? "" : `&billing=${isYearly ? "YEARLY" : "MONTHLY"}`}`}
                      className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 ${
                        isTrial
                          ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                          : isGrowth
                          ? "bg-brand-primary text-white hover:opacity-90 shadow-md"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {isTrial ? `Start ${trialDays}-Day Free Trial` : `Get Started with ${plan.name}`}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
