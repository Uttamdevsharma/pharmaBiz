"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import {
  CreditCard,
  Sparkles,
  Calendar,
  CheckCircle2,
  Loader2,
  Check,
} from "lucide-react";
import { getClientPlanConfig, calculateRemainingTrialDays } from "@/lib/planLimits";

export function SubscriptionModule() {
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [subDetails, setSubDetails] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subRes, plansRes, payRes, bRes, uRes] = await Promise.all([
        fetchApi("/subscriptions/current"),
        fetchApi("/subscriptions/plans"),
        fetchApi("/payments/history"),
        fetchApi("/branches"),
        fetchApi("/users"),
      ]);

      if (subRes.success) {
        setSubDetails(subRes.data);
        setCurrentSub(subRes.data?.subscription || subRes.data);
      }
      if (plansRes.success) setPlans(plansRes.data || []);
      if (payRes.success) setPayments(payRes.data || []);
      if (bRes.success) setBranches(bRes.data || []);
      if (uRes.success) setStaff(uRes.data || []);
    } catch (err) {
      console.error("Failed to load subscription info", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpgradeOrRenew = async (targetPlanId: string) => {
    try {
      setUpgradingPlanId(targetPlanId);
      // 1. Change plan
      const planRes = await fetchApi<any>("/subscriptions/change-plan", {
        method: "POST",
        body: JSON.stringify({
          newPlanId: targetPlanId,
        }),
      });

      const subId = planRes.data?.id || currentSub?.id;

      // 2. Initiate SSLCOMMERZ checkout
      const initRes = await fetchApi<any>("/payments/initiate", {
        method: "POST",
        body: JSON.stringify({
          subscriptionId: subId,
        }),
      });

      if (initRes.success && initRes.data?.gatewayUrl) {
        window.location.href = initRes.data.gatewayUrl;
      } else {
        alert(initRes.message || "Could not launch SSLCOMMERZ checkout");
      }
    } catch (err: any) {
      alert(err.message || "Error initiating payment");
    } finally {
      setUpgradingPlanId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
        <span>Loading subscription & billing details...</span>
      </div>
    );
  }

  const tier = (subDetails?.tier || currentSub?.plan?.tier || "TRIAL").toUpperCase();
  const isTrial = tier === "TRIAL";
  const planConfig = getClientPlanConfig(tier);
  const trialDaysRemaining = isTrial ? calculateRemainingTrialDays(currentSub?.endDate) : 0;

  const branchCount = branches.length;
  const maxBranches = subDetails?.usage?.maxBranches || planConfig.maxBranches;

  const nonOwnerStaff = staff.filter((s) => s.role !== "COMPANY_OWNER");
  const staffCount = nonOwnerStaff.length;
  const maxStaff = isTrial ? 1 : planConfig.maxTotalStaff || 999;

  return (
    <div className="space-y-10 max-w-5xl">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Subscription & Billing Plans</h2>
        <p className="text-xs text-slate-500">
          Manage your plan tier, branch & staff capacity limits, and SSLCOMMERZ checkout upgrades
        </p>
      </div>

      {/* Active Plan Card */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border-2 border-brand-primary shadow-xl space-y-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-primary text-white mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              Current Active Plan
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{planConfig.name}</h3>
            <p className="text-xs text-slate-500 mt-1">Tier: {tier}</p>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-3xl font-extrabold text-brand-primary">
              ৳{Number(currentSub?.plan?.price || planConfig.price).toLocaleString()}{" "}
              <span className="text-xs text-slate-400 font-normal">
                {isTrial ? "/ 7-day trial" : "/ month"}
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center sm:justify-end gap-1.5 mt-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {isTrial
                  ? `Free Trial Expires: ${currentSub?.endDate ? new Date(currentSub.endDate).toLocaleDateString() : "in 7 days"} (${trialDaysRemaining}d remaining)`
                  : `Valid Until: ${currentSub?.endDate ? new Date(currentSub.endDate).toLocaleDateString() : "Active"}`}
              </span>
            </div>
          </div>
        </div>

        {/* Capacity Usage Meters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Branch Store Usage */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-700 dark:text-slate-300">Branch Store Usage</span>
              <span className="text-brand-primary">
                {branchCount} of {maxBranches >= 999 ? "Unlimited" : maxBranches} Stores
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-brand-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (branchCount / maxBranches) * 100)}%` }}
              />
            </div>
          </div>

          {/* Staff Usage */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-700 dark:text-slate-300">Staff Capacity</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {staffCount} of {maxStaff >= 999 ? "Unlimited" : maxStaff} Staff
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (staffCount / maxStaff) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>
              {isTrial
                ? "Free Trial Active: Upgrade anytime to remove restrictions."
                : "Automatic 30-day renewal cycle via SSLCOMMERZ sandbox."}
            </span>
          </div>

          {isTrial && (
            <span className="text-xs font-bold text-brand-primary">
              Select a paid plan below to upgrade
            </span>
          )}
        </div>
      </div>

      {/* Upgrade Plans Grid */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Upgrade or Switch Subscription Plan</h3>
          <p className="text-xs text-slate-500">
            Scale your pharmacy branch stores and staff capacity with instant SSLCOMMERZ checkout
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Plan 1 Starter */}
          {(() => {
            const p1 = plans.find((p) => p.tier === "STARTER") || {
              id: "p1",
              name: "Plan 1 - Starter",
              tier: "STARTER",
              price: 500,
              maxBranches: 2,
            };
            const isCurrent = tier === "STARTER";
            return (
              <div
                key={p1.id}
                className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between space-y-5 ${
                  isCurrent ? "border-brand-primary ring-2 ring-brand-primary/20 shadow-md" : "border-slate-200 dark:border-slate-800 shadow-sm"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      Plan 1
                    </span>
                    {isCurrent && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Current
                      </span>
                    )}
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white">Starter Plan</h4>
                  <div className="text-3xl font-black text-brand-primary">
                    ৳500 <span className="text-xs text-slate-400 font-normal">/ month</span>
                  </div>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Max 2 Branches (Main + 1)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>1 Staff per branch</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Offline-First Counter POS</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => handleUpgradeOrRenew(p1.id)}
                  disabled={isCurrent || upgradingPlanId === p1.id}
                  className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow hover:opacity-90 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {upgradingPlanId === p1.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  {isCurrent ? "Current Active Plan" : "Upgrade to Plan 1 (৳500)"}
                </button>
              </div>
            );
          })()}

          {/* Plan 2 Growth */}
          {(() => {
            const p2 = plans.find((p) => p.tier === "GROWTH") || {
              id: "p2",
              name: "Plan 2 - Growth",
              tier: "GROWTH",
              price: 1500,
              maxBranches: 3,
            };
            const isCurrent = tier === "GROWTH";
            return (
              <div
                key={p2.id}
                className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border-2 transition-all flex flex-col justify-between space-y-5 relative ${
                  isCurrent
                    ? "border-brand-primary ring-2 ring-brand-primary/20 shadow-xl scale-102"
                    : "border-brand-primary/70 shadow-lg"
                }`}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-brand-primary text-white text-[10px] font-extrabold uppercase shadow">
                  Most Popular
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-brand-primary/10 text-brand-primary">
                      Plan 2
                    </span>
                    {isCurrent && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Current
                      </span>
                    )}
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white">Growth Plan</h4>
                  <div className="text-3xl font-black text-brand-primary">
                    ৳1,500 <span className="text-xs text-slate-400 font-normal">/ month</span>
                  </div>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Max 3 Branches</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>3 Staff per branch</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Inter-Branch Stock Transfers</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Regional Admin Role</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => handleUpgradeOrRenew(p2.id)}
                  disabled={isCurrent || upgradingPlanId === p2.id}
                  className="w-full py-3 rounded-xl bg-brand-primary text-white text-xs font-bold shadow-lg hover:opacity-90 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {upgradingPlanId === p2.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  {isCurrent ? "Current Active Plan" : "Upgrade to Plan 2 (৳1,500)"}
                </button>
              </div>
            );
          })()}

          {/* Plan 3 Enterprise */}
          {(() => {
            const p3 = plans.find((p) => p.tier === "ENTERPRISE") || {
              id: "p3",
              name: "Plan 3 - Enterprise",
              tier: "ENTERPRISE",
              price: 3000,
              maxBranches: 999,
            };
            const isCurrent = tier === "ENTERPRISE";
            return (
              <div
                key={p3.id}
                className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between space-y-5 ${
                  isCurrent ? "border-brand-primary ring-2 ring-brand-primary/20 shadow-md" : "border-slate-200 dark:border-slate-800 shadow-sm"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      Plan 3
                    </span>
                    {isCurrent && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Current
                      </span>
                    )}
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white">Enterprise Plan</h4>
                  <div className="text-3xl font-black text-brand-primary">
                    ৳3,000 <span className="text-xs text-slate-400 font-normal">/ month</span>
                  </div>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Unlimited Branches</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Unlimited Staff</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Full VAT/MIS Compliance Export</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Auditor Read-Only Access</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => handleUpgradeOrRenew(p3.id)}
                  disabled={isCurrent || upgradingPlanId === p3.id}
                  className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow hover:opacity-90 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {upgradingPlanId === p3.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  {isCurrent ? "Current Active Plan" : "Upgrade to Plan 3 (৳3,000)"}
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Payment History */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Payment & Billing History</h3>
        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Transaction ID</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Gateway</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono text-xs font-bold">{p.tranId}</td>
                    <td className="px-4 py-3 font-bold">৳ {p.amount}</td>
                    <td className="px-4 py-3 text-xs">{p.paymentMethod || "SSLCOMMERZ"}</td>
                    <td className="px-4 py-3 text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          p.status === "VALIDATED"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : p.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-red-500/10 text-red-600"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">No payment records found.</div>
        )}
      </div>
    </div>
  );
}
