"use client";

import React, { useState } from "react";
import {
  Sparkles,
  AlertTriangle,
  ArrowRight,
  X,
  Check,
  Building,
  Users,
  ShieldCheck,
  CreditCard,
  Lock,
} from "lucide-react";

interface DemoStatusBannerModalProps {
  currentSub: any;
  tenantProfile: any;
  availablePlans?: any[];
  userRole?: string;
  onInitiateUpgrade: (planId: string, billingCycle: "MONTHLY" | "YEARLY") => void;
  initiatingPay?: boolean;
}

export function DemoStatusBannerModal({
  currentSub,
  tenantProfile,
  availablePlans = [],
  userRole,
  onInitiateUpgrade,
  initiatingPay = false,
}: DemoStatusBannerModalProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");

  const isDemo = Boolean(
    currentSub?.isDemo ||
    tenantProfile?.isDemo ||
    currentSub?.tier === "TRIAL" ||
    currentSub?.plan?.tier === "TRIAL"
  );

  if (!isDemo) return null;

  const demoExpiresAt = currentSub?.demoExpiresAt || tenantProfile?.demoExpiresAt || currentSub?.endDate;
  const expiryDate = demoExpiresAt ? new Date(demoExpiresAt) : null;
  const now = new Date();
  
  const isExpired = Boolean(
    currentSub?.isTrialExpired ||
    currentSub?.isExpired ||
    (expiryDate && now.getTime() >= expiryDate.getTime())
  );

  const daysLeft = currentSub?.trialDaysRemaining !== undefined
    ? Math.max(0, currentSub.trialDaysRemaining)
    : (expiryDate ? Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0);

  const formattedDate = expiryDate
    ? expiryDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "N/A";

  const isOwner = userRole === "COMPANY_OWNER";
  const shouldShowModal = isExpired || modalOpen;
  const isClosable = !isExpired;

  // Filter only active paid plans for upgrading
  const paidPlans = availablePlans.filter(
    (p: any) =>
      p.isActive !== false &&
      p.tier !== "TRIAL" &&
      !p.isTrial &&
      !(p.features as any)?.isTrial &&
      Number(p.price || 0) > 0
  );

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. PROMINENT TOP DASHBOARD BANNER                                         */}
      {/* ========================================================================= */}
      <div
        className={`shrink-0 text-white px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md z-40 text-xs font-semibold ${
          isExpired
            ? "bg-gradient-to-r from-rose-700 via-rose-600 to-amber-700 animate-pulse"
            : "bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800"
        }`}
      >
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          {isExpired ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/20 text-white font-black text-[11px] shrink-0 border border-white/20">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
              EXPIRED
            </span>
          ) : (
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
          )}

          <span>
            {isExpired ? (
              <>
                ⚠️ <strong>Free Demo Expired on {formattedDate}</strong> &bull; Upgrade now to restore full pharmacy access and counter sales.
              </>
            ) : (
              <>
                🎉 <strong>Free Demo Active</strong> &bull; [{daysLeft} {daysLeft === 1 ? "day" : "days"} left] &bull; Valid until <strong>{formattedDate}</strong>
              </>
            )}
          </span>
        </div>

        {isOwner ? (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={`px-4 py-1.5 rounded-xl font-bold text-xs backdrop-blur-sm transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 shrink-0 ${
              isExpired
                ? "bg-white text-rose-700 hover:bg-slate-100 shadow-md font-black"
                : "bg-white/20 hover:bg-white/30 text-white border border-white/30"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Renew or Upgrade Plan</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        ) : (
          <span className="text-[11px] text-purple-200 font-bold shrink-0">
            Please ask Pharmacy Owner to upgrade plan.
          </span>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE RENEW OR UPGRADE MODAL                                     */}
      {/* ========================================================================= */}
      {shouldShowModal && (
        <div
          className={`fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200 ${
            isExpired ? "bg-slate-950/90 backdrop-blur-lg" : "bg-black/75 backdrop-blur-md"
          }`}
          onClick={(e) => {
            if (isClosable && e.target === e.currentTarget) {
              setModalOpen(false);
            }
          }}
        >
          <div className="max-w-4xl w-full bg-white dark:bg-slate-900 rounded-3xl border-2 border-purple-500/40 shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button: strictly hidden if expired to enforce lock */}
            {isClosable && (
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Close Modal"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                  {isExpired ? <Lock className="h-3.5 w-3.5 text-rose-500" /> : <Sparkles className="h-3.5 w-3.5 text-purple-500" />}
                  <span>{isExpired ? "Dashboard Locked &bull; Upgrade Required" : "Upgrade or Renew Subscription"}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {isExpired ? "Free Demo Expired! Choose a Plan to Continue" : "Upgrade Your Pharmacy Management System"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  {isExpired
                    ? `Your demo expired on ${formattedDate}. Upgrade now to regain instant access to sales, inventories, and accounting.`
                    : `Enjoy uninterrupted access with advanced multi-branch control, permanent data storage, and priority support.`}
                </p>
              </div>

              {/* Monthly / Annual Billing Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setBillingCycle("MONTHLY")}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                    billingCycle === "MONTHLY"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("YEARLY")}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                    billingCycle === "YEARLY"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>Yearly</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-black">
                    -15% Off
                  </span>
                </button>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              {paidPlans.map((plan: any) => {
                const baseMonthly = Number(plan.price || 0);
                const isYearly = billingCycle === "YEARLY";
                const displayPrice = isYearly ? Math.round(baseMonthly * 12 * 0.85) : baseMonthly;
                const isGrowth = plan.tier === "GROWTH";

                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl p-5 border transition flex flex-col justify-between relative ${
                      isGrowth
                        ? "border-purple-500 bg-purple-500/5 dark:bg-purple-950/20 shadow-md ring-2 ring-purple-500/30"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-purple-300"
                    }`}
                  >
                    {isGrowth && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                        Recommended
                      </span>
                    )}

                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                            {plan.name}
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 uppercase">
                            {plan.tier}
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                            ৳{displayPrice.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            /{isYearly ? "yr" : "mo"}
                          </span>
                        </div>
                        {isYearly && (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                            Saved ৳{Math.round(baseMonthly * 12 * 0.15).toLocaleString()} on annual billing
                          </div>
                        )}
                      </div>

                      {/* Quotas */}
                      <div className="space-y-2 py-2 border-y border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Building className="h-3.5 w-3.5 text-purple-500" />
                            Branches:
                          </span>
                          <strong className="font-mono text-slate-900 dark:text-white">
                            {plan.maxBranches >= 999 ? "Unlimited" : `${plan.maxBranches} Branches`}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Users className="h-3.5 w-3.5 text-purple-500" />
                            Staff per Branch:
                          </span>
                          <strong className="font-mono text-slate-900 dark:text-white">
                            {plan.maxStaffPerBranch >= 999 ? "Unlimited" : `${plan.maxStaffPerBranch} Staff`}
                          </strong>
                        </div>
                      </div>

                      {/* Line-by-line Features List */}
                      <div className="space-y-2 pt-1 text-xs">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 block">
                          Included Features:
                        </span>
                        <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
                          {plan.featureList && Array.isArray(plan.featureList) && plan.featureList.length > 0 ? (
                            plan.featureList.slice(0, 6).map((feat: string, fIdx: number) => (
                              <li key={fIdx} className="flex items-start gap-2">
                                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span className="text-[11px] leading-tight">{feat}</span>
                              </li>
                            ))
                          ) : (
                            <>
                              <li className="flex items-center gap-2">
                                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span className="text-[11px]">100% Offline POS & Cloud Sync</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span className="text-[11px]">Real-time Inventory & Expiry Alerts</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span className="text-[11px]">Daily Sales & Financial Reports</span>
                              </li>
                            </>
                          )}
                        </ul>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => onInitiateUpgrade(plan.id, billingCycle)}
                        disabled={initiatingPay}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm ${
                          isGrowth
                            ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/25"
                            : "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900"
                        }`}
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>Select & Upgrade</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer Note */}
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-800 dark:text-purple-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0" />
                <span>Instant activation upon checkout. All store data, products, and branches are retained securely.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
