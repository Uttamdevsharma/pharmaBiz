"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSettings } from "@/context/SettingsContext";
import { useLanguage } from "@/context/LanguageContext";
import { fetchApi } from "@/lib/api";
import { Check, ArrowRight, MessageSquare } from "lucide-react";

export function PricingSection() {
  const { settings, refreshSettings } = useSettings();
  const { t } = useLanguage();
  const [isYearly, setIsYearly] = useState(false);
  const [livePlans, setLivePlans] = useState<any[] | null>(null);

  useEffect(() => {
    refreshSettings?.();
    fetchApi<any>("/settings/public")
      .then((res) => {
        if (res.success && res.data?.plans && Array.isArray(res.data.plans)) {
          setLivePlans(res.data.plans);
        }
      })
      .catch((err) => console.warn("Failed to fetch fresh public settings", err));
  }, []);

  const fallbackPlans = [
    {
      id: "1",
      name: "Plan 1 - Starter",
      tier: "STARTER",
      price: 999,
      billingCycle: "MONTHLY",
      maxBranches: 1,
      maxStaffPerBranch: 1,
      featureList: [
        "1 Branch Location Included",
        "1 Staff User per Branch",
        "100% Offline POS & Auto Cloud Sync",
        "Real-time Inventory & Stock Tracking",
        "Medicine Expiry & Low-Stock Alerts",
        "Thermal Receipt & Barcode Support",
        "Daily Sales & Revenue Reports",
      ],
      features: {
        featureList: [
          "1 Branch Location Included",
          "1 Staff User per Branch",
          "100% Offline POS & Auto Cloud Sync",
          "Real-time Inventory & Stock Tracking",
          "Medicine Expiry & Low-Stock Alerts",
          "Thermal Receipt & Barcode Support",
          "Daily Sales & Revenue Reports",
        ],
      },
      isActive: true,
    },
    {
      id: "2",
      name: "Plan 2 - Growth",
      tier: "GROWTH",
      price: 1999,
      billingCycle: "MONTHLY",
      maxBranches: 3,
      maxStaffPerBranch: 3,
      featureList: [
        "Up to 3 Branch Locations Included",
        "3 Staff Users per Branch",
        "100% Offline POS & Auto Cloud Sync",
        "Multi-Branch Stock Synchronization",
        "Inter-Branch Transfers & Approvals",
        "Medicine Expiry, Near-Expiry & Damage Tracking",
        "Customer Ledger & Credit/Due Tracking",
        "Comprehensive Profit/Loss & Tax Reports",
      ],
      features: {
        featureList: [
          "Up to 3 Branch Locations Included",
          "3 Staff Users per Branch",
          "100% Offline POS & Auto Cloud Sync",
          "Multi-Branch Stock Synchronization",
          "Inter-Branch Transfers & Approvals",
          "Medicine Expiry, Near-Expiry & Damage Tracking",
          "Customer Ledger & Credit/Due Tracking",
          "Comprehensive Profit/Loss & Tax Reports",
        ],
      },
      isActive: true,
    },
    {
      id: "3",
      name: "Plan 3 - Enterprise",
      tier: "ENTERPRISE",
      price: 0,
      billingCycle: "MONTHLY",
      maxBranches: 999,
      maxStaffPerBranch: 999,
      isCustom: true,
      whatsappNumber: "01700000000",
      featureList: [
        "Unlimited Branches & Scalable Staff Quota",
        "Centralized Multi-Store Inventory & Transfers",
        "Full Expiry, Damage & Batch Audit Trails",
        "Unlimited Custom Roles & Granular RBAC",
        "Advanced Business Analytics & VAT/Tax Export",
        "24/7 Dedicated Account Manager & WhatsApp SLA",
      ],
      features: {
        isCustom: true,
        featureList: [
          "Unlimited Branches & Scalable Staff Quota",
          "Centralized Multi-Store Inventory & Transfers",
          "Full Expiry, Damage & Batch Audit Trails",
          "Unlimited Custom Roles & Granular RBAC",
          "Advanced Business Analytics & VAT/Tax Export",
          "24/7 Dedicated Account Manager & WhatsApp SLA",
        ],
      },
      isActive: true,
    },
  ];

  const rawPlans = (livePlans && livePlans.length > 0)
    ? livePlans
    : (settings.plans && settings.plans.length > 0 ? settings.plans : fallbackPlans);

  const hasActiveDemo = rawPlans.some(
    (p: any) =>
      p.isActive !== false &&
      (Number(p.trialDays) > 0 || p.tier === "TRIAL" || p.isTrial || p.features?.isTrial)
  );

  const displayPlans = rawPlans.filter((p: any) => {
    if (p.isActive === false) return false;
    const isTrial = Boolean(p.tier === "TRIAL" || p.isTrial || p.features?.isTrial || Number(p.trialDays || 0) > 0);
    if (isTrial && !hasActiveDemo) return false;
    return true;
  });

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

    if (isCustomA && !isCustomB) return 1;
    if (!isCustomA && isCustomB) return -1;

    const isTrialA = Boolean(a.tier === "TRIAL" || a.isTrial || a.features?.isTrial);
    const isTrialB = Boolean(b.tier === "TRIAL" || b.isTrial || b.features?.isTrial);
    if (isTrialA && !isTrialB) return -1;
    if (!isTrialA && isTrialB) return 1;

    return Number(a.price || 0) - Number(b.price || 0);
  });

  return (
    <section id="pricing" className="py-20 bg-slate-50 border-y border-slate-200">
      <div className="w-full max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl sm:text-4xl 2xl:text-5xl font-black text-slate-900 tracking-tight">
            {t("subscriptionPlans")}
          </h2>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsYearly(false)}
              className={`px-5 py-2 text-xs sm:text-sm font-bold rounded-none border transition cursor-pointer ${
                !isYearly
                  ? "bg-white text-slate-900 border-slate-300 shadow-xs"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {t("monthlyBilling")}
            </button>
            <button
              type="button"
              onClick={() => setIsYearly(true)}
              className={`px-5 py-2 text-xs sm:text-sm font-bold rounded-none border transition flex items-center gap-2 cursor-pointer ${
                isYearly
                  ? "bg-white text-slate-900 border-slate-300 shadow-xs"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              <span>{t("annualBilling")}</span>
              <span className="text-[10px] sm:text-xs text-emerald-600 font-extrabold bg-emerald-50 px-1.5 py-0.5 border border-emerald-200">
                {t("save20")}
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {sortedPlans.map((plan: any, idx: number) => {
            const isTrial = Boolean(plan.tier === "TRIAL" || plan.isTrial || plan.features?.isTrial);
            const isCustom = Boolean(plan.isCustom || plan.features?.isCustom);
            const trialDays = Number(plan.trialDays || plan.features?.trialDays || 14);
            const basePrice = Number(plan.price);
            const displayPrice = isYearly ? Math.round(basePrice * 12 * 0.85) : basePrice;
            const period = isTrial ? `/${trialDays} days` : isCustom ? "Custom" : (isYearly ? t("perYear") : t("perMonth"));
            const whatsappNum = (plan.whatsappNumber || plan.features?.whatsappNumber || "8801700000000").replace(/\D/g, "");
            const whatsappMsg = encodeURIComponent(plan.customMessage || plan.features?.customMessage || `Hello, I am interested in the ${plan.name} Enterprise plan for PharmaBiz.`);
            const isCenteredSingle = (sortedPlans.length === 4 && idx === 3) || (sortedPlans.length % 3 === 1 && idx === sortedPlans.length - 1);

            const planFeatures: string[] = (Array.isArray(plan.featureList) && plan.featureList.length > 0)
              ? plan.featureList
              : (Array.isArray(plan.features?.featureList) && plan.features.featureList.length > 0)
              ? plan.features.featureList
              : [];

            return (
              <div
                key={plan.id}
                className={`relative rounded-none p-8 sm:p-9 min-h-[580px] flex flex-col justify-between transition-all bg-white border shadow-xs hover:border-slate-400 ${
                  isCenteredSingle ? "lg:col-start-2" : ""
                } ${
                  isTrial
                    ? "border-amber-400"
                    : "border-slate-200"
                }`}
              >
                {isTrial && (
                  <div className="absolute top-0 right-0 px-3.5 py-1 rounded-none bg-amber-500 text-white text-xs font-bold uppercase tracking-wider">
                    {t("freeTrial")}
                  </div>
                )}

                <div className="space-y-6">
                  {/* Plan Header */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-none bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                        {isTrial ? "Trial" : isCustom ? "Custom" : plan.tier}
                      </span>
                    </div>
                  </div>

                  {/* Pricing Display */}
                  <div className="flex items-baseline gap-1.5 pt-1">
                    {isTrial ? (
                      <>
                        <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">৳0</span>
                        <span className="text-sm font-semibold text-slate-500">{period}</span>
                      </>
                    ) : isCustom ? (
                      <>
                        <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">Custom</span>
                        <span className="text-sm font-semibold text-slate-500 ml-1.5">{t("customSales")}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                          ৳{displayPrice.toLocaleString()}
                        </span>
                        <span className="text-sm font-semibold text-slate-500">{period}</span>
                      </>
                    )}
                  </div>

                  {/* Feature List */}
                  <div className="pt-5 border-t border-slate-100 space-y-3">
                    <div className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                      {t("includedCapabilities")}
                    </div>
                    <ul className="space-y-3 text-sm text-slate-700 leading-normal">
                      {planFeatures.length > 0 ? (
                        planFeatures.map((feat: string, fIdx: number) => (
                          <li key={fIdx} className="flex items-start gap-2.5">
                            <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="font-medium text-slate-700">{feat}</span>
                          </li>
                        ))
                      ) : (
                        <li className="flex items-start gap-2.5">
                          <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="font-medium text-slate-700">100% Offline POS & Auto Cloud Sync</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100">
                  {isCustom ? (
                    <a
                      href={`https://wa.me/${whatsappNum}?text=${whatsappMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 rounded-none font-bold text-sm flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer shadow-xs"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>{t("chatWhatsapp")}</span>
                    </a>
                  ) : (
                    <Link
                      href={isTrial ? `/register?demo=true&planId=${plan.id}` : `/register?planId=${plan.id}&billing=${isYearly ? "YEARLY" : "MONTHLY"}`}
                      className={`w-full py-3.5 rounded-none font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
                        isTrial
                          ? "bg-purple-700 text-white hover:bg-purple-800"
                          : "bg-brand-primary text-white hover:bg-brand-primary/90"
                      }`}
                    >
                      <span>{isTrial ? t("claimDemo") : `${t("choosePlan")} ${plan.name?.split("-")[1] || plan.name || plan.tier}`}</span>
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
