"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import {
  Plus,
  Edit2,
  Building,
  Users,
  Clock,
  ShieldCheck,
  Check,
  X,
  Loader2,
  Sparkles,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";

interface PlanFeatures {
  inventoryTransfers: boolean;
  regionalAdmin: boolean;
  customAudit: boolean;
  apiAccess: boolean;
  branchPriceOverride: boolean;
  [key: string]: any;
}

interface PlanItem {
  id: string;
  name: string;
  tier: "TRIAL" | "STARTER" | "GROWTH" | "ENTERPRISE";
  price: number | string;
  billingCycle: string;
  maxBranches: number;
  maxStaffPerBranch: number;
  maxTotalStaff: number;
  trialDays?: number;
  features?: PlanFeatures;
  isActive: boolean;
  _count?: {
    subscriptions: number;
  };
}

export function PlansTab() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    tier: "STARTER" as "TRIAL" | "STARTER" | "GROWTH" | "ENTERPRISE",
    price: 500,
    billingCycle: "MONTHLY",
    maxBranches: 2,
    maxStaffPerBranch: 1,
    maxTotalStaff: 2,
    trialDays: 7,
    features: {
      inventoryTransfers: false,
      regionalAdmin: false,
      customAudit: false,
      apiAccess: false,
      branchPriceOverride: false,
    },
    isActive: true,
  });

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<PlanItem[]>("/super-admin/plans");
      if (res.success && res.data) {
        setPlans(res.data);
      }
    } catch (err) {
      console.error("Failed to load plans", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setFormData({
      name: "",
      tier: "STARTER",
      price: 500,
      billingCycle: "MONTHLY",
      maxBranches: 2,
      maxStaffPerBranch: 1,
      maxTotalStaff: 2,
      trialDays: 7,
      features: {
        inventoryTransfers: false,
        regionalAdmin: false,
        customAudit: false,
        apiAccess: false,
        branchPriceOverride: false,
      },
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (plan: PlanItem) => {
    setEditingPlan(plan);
    setErrorMessage(null);
    setSuccessMessage(null);
    const feat = (typeof plan.features === "object" && plan.features !== null) ? plan.features : {} as PlanFeatures;
    
    setFormData({
      name: plan.name,
      tier: plan.tier,
      price: Number(plan.price),
      billingCycle: plan.billingCycle || "MONTHLY",
      maxBranches: plan.maxBranches ?? 2,
      maxStaffPerBranch: plan.maxStaffPerBranch ?? (feat.maxStaffPerBranch ?? 1),
      maxTotalStaff: plan.maxTotalStaff ?? (feat.maxTotalStaff ?? 2),
      trialDays: plan.trialDays ?? (feat.trialDays ?? 7),
      features: {
        inventoryTransfers: Boolean(feat.inventoryTransfers),
        regionalAdmin: Boolean(feat.regionalAdmin),
        customAudit: Boolean(feat.customAudit),
        apiAccess: Boolean(feat.apiAccess),
        branchPriceOverride: Boolean(feat.branchPriceOverride),
      },
      isActive: plan.isActive,
    });
    setModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      setFormLoading(true);
      const payload = {
        name: formData.name.trim(),
        tier: formData.tier,
        price: Number(formData.price),
        billingCycle: formData.billingCycle,
        maxBranches: Number(formData.maxBranches),
        maxStaffPerBranch: Number(formData.maxStaffPerBranch),
        maxTotalStaff: Number(formData.maxTotalStaff),
        trialDays: Number(formData.trialDays),
        features: {
          ...formData.features,
          maxStaffPerBranch: Number(formData.maxStaffPerBranch),
          maxTotalStaff: Number(formData.maxTotalStaff),
          trialDays: Number(formData.trialDays),
        },
        isActive: formData.isActive,
      };

      let res;
      if (editingPlan) {
        res = await fetchApi(`/super-admin/plans/${editingPlan.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetchApi("/super-admin/plans", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      if (res.success) {
        setSuccessMessage("Plan saved successfully!");
        setTimeout(() => {
          setModalOpen(false);
          loadPlans();
        }, 500);
      } else {
        setErrorMessage(res.message || "Failed to save plan");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error saving plan");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (plan: PlanItem) => {
    try {
      const res = await fetchApi(`/super-admin/plans/${plan.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      if (res.success) {
        await loadPlans();
      }
    } catch (err) {
      console.error("Failed to toggle plan status", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Subscription Plans & Limits Management
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Super Admin control: Edit plan names, branch quotas, staff limits per branch, pricing, and feature permissions dynamically.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-bold shadow-md hover:bg-brand-primary/90 transition active:scale-95 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Create New Plan
        </button>
      </div>

      {/* Plans List Cards */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
          <span className="text-sm font-semibold">Loading subscription plans...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const feat = (typeof plan.features === "object" && plan.features !== null) ? plan.features : {} as PlanFeatures;
            const staffPerBranch = plan.maxStaffPerBranch ?? (feat.maxStaffPerBranch ?? 1);
            const totalStaff = plan.maxTotalStaff ?? (feat.maxTotalStaff ?? 2);
            const trialDays = plan.trialDays ?? (feat.trialDays ?? 7);

            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 bg-white dark:bg-slate-900 border transition-all duration-200 flex flex-col justify-between relative shadow-sm ${
                  plan.isActive
                    ? "border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-brand-primary/40"
                    : "border-dashed border-slate-300 dark:border-slate-800 opacity-60 bg-slate-50/50 dark:bg-slate-900/50"
                }`}
              >
                <div className="space-y-5">
                  {/* Top Tier Badge & Status */}
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                      {plan.tier}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        plan.isActive
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${plan.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                      {plan.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Plan Name & Price */}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white line-clamp-1">
                      {plan.name}
                    </h3>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-slate-900 dark:text-white">
                        ৳{Number(plan.price).toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        /{plan.billingCycle?.toLowerCase() || "month"}
                      </span>
                    </div>
                  </div>

                  {/* Limits Badge Box */}
                  <div className="space-y-2 pt-1">
                    {/* Max Branches */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2.5">
                      <Building className="h-4 w-4 text-brand-primary shrink-0" />
                      <span>
                        Branch Limit: <strong>{plan.maxBranches >= 999 ? "Unlimited" : `${plan.maxBranches} Store(s)`}</strong>
                      </span>
                    </div>

                    {/* Staff Per Branch */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2.5">
                      <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>
                        Staff Per Branch: <strong>{staffPerBranch >= 999 ? "Unlimited" : `${staffPerBranch} User(s)`}</strong>
                      </span>
                    </div>

                    {/* Total Staff Limit */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2.5">
                      <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>
                        Total Staff Cap: <strong>{totalStaff >= 999 ? "Unlimited" : `${totalStaff} Total`}</strong>
                      </span>
                    </div>

                    {/* If TRIAL, show duration */}
                    {plan.tier === "TRIAL" && (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2.5">
                        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>
                          Trial Duration: <strong>{trialDays} Days</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Dynamic Feature Rules */}
                  <div className="pt-2 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                    <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                      Feature Privileges:
                    </div>

                    <div className="flex items-center gap-2">
                      {feat.inventoryTransfers ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
                      )}
                      <span className={feat.inventoryTransfers ? "font-medium" : "text-slate-400 line-through"}>
                        Inter-Branch Inventory Transfers
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {feat.regionalAdmin ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
                      )}
                      <span className={feat.regionalAdmin ? "font-medium" : "text-slate-400 line-through"}>
                        Regional Admin Multi-Branch Access
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {feat.branchPriceOverride ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
                      )}
                      <span className={feat.branchPriceOverride ? "font-medium" : "text-slate-400 line-through"}>
                        Branch Custom Price Override
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {feat.customAudit ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
                      )}
                      <span className={feat.customAudit ? "font-medium" : "text-slate-400 line-through"}>
                        Custom Audit & VAT MIS Export
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {feat.apiAccess ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
                      )}
                      <span className={feat.apiAccess ? "font-medium" : "text-slate-400 line-through"}>
                        External Developer API & Webhooks
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenEdit(plan)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-brand-primary" />
                    Edit Plan & Limits
                  </button>

                  <button
                    onClick={() => handleToggleStatus(plan)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                      plan.isActive
                        ? "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    }`}
                  >
                    {plan.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-2xl w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {editingPlan ? `Edit ${editingPlan.name}` : "Create New Subscription Plan"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update plan name, pricing, branch limits, staff limits per branch, and features dynamically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSavePlan} className="space-y-6 text-sm">
              {/* Section 1: Basic Information */}
              <div className="space-y-4">
                <div className="text-xs font-black tracking-wider uppercase text-slate-400 dark:text-slate-500">
                  1. Plan Identity & Pricing
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Plan Display Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Plan 2 - Growth"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Pricing Tier System Key
                    </label>
                    <select
                      disabled={!!editingPlan}
                      value={formData.tier}
                      onChange={(e) => setFormData({ ...formData, tier: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 font-semibold focus:outline-none disabled:opacity-60"
                    >
                      <option value="TRIAL">Plan 0 - TRIAL (Free Trial)</option>
                      <option value="STARTER">Plan 1 - STARTER</option>
                      <option value="GROWTH">Plan 2 - GROWTH</option>
                      <option value="ENTERPRISE">Plan 3 - ENTERPRISE</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Price (BDT ৳) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Billing Cycle
                    </label>
                    <select
                      value={formData.billingCycle}
                      onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      <option value="MONTHLY">Monthly (Per Month)</option>
                      <option value="YEARLY">Yearly (Per Year)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Dynamic Limits & Quotas */}
              <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black tracking-wider uppercase text-slate-400 dark:text-slate-500">
                    2. Capacity & Store Limits (Dynamic Rules)
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Use 999 for Unlimited</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Max Branches Limit
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.maxBranches}
                      onChange={(e) => setFormData({ ...formData, maxBranches: parseInt(e.target.value, 10) || 1 })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Stores a pharmacy can open</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Staff Limit (1 Branch e)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.maxStaffPerBranch}
                      onChange={(e) => setFormData({ ...formData, maxStaffPerBranch: parseInt(e.target.value, 10) || 1 })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Allowed staff per branch</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Total Staff Account Cap
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.maxTotalStaff}
                      onChange={(e) => setFormData({ ...formData, maxTotalStaff: parseInt(e.target.value, 10) || 1 })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Max users across all branches</p>
                  </div>
                </div>

                {/* Trial days input */}
                {formData.tier === "TRIAL" && (
                  <div>
                    <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 mb-1.5">
                      Trial Duration Period (Days)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="365"
                      value={formData.trialDays}
                      onChange={(e) => setFormData({ ...formData, trialDays: parseInt(e.target.value, 10) || 7 })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Free trial duration before renewal is mandated (default 7 days)</p>
                  </div>
                )}
              </div>

              {/* Section 3: Feature Toggles */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-black tracking-wider uppercase text-slate-400 dark:text-slate-500">
                  3. Feature Entitlements & Permissions
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={formData.features.inventoryTransfers}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          features: { ...formData.features, inventoryTransfers: e.target.checked },
                        })
                      }
                      className="h-4 w-4 text-brand-primary rounded border-slate-300 focus:ring-brand-primary"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Inter-Branch Stock Transfers</div>
                      <div className="text-[11px] text-slate-400">Transfer medicine stock between branches</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={formData.features.regionalAdmin}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          features: { ...formData.features, regionalAdmin: e.target.checked },
                        })
                      }
                      className="h-4 w-4 text-brand-primary rounded border-slate-300 focus:ring-brand-primary"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Regional Admin Roles</div>
                      <div className="text-[11px] text-slate-400">Manage multiple designated branches</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={formData.features.branchPriceOverride}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          features: { ...formData.features, branchPriceOverride: e.target.checked },
                        })
                      }
                      className="h-4 w-4 text-brand-primary rounded border-slate-300 focus:ring-brand-primary"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Branch Custom Price Override</div>
                      <div className="text-[11px] text-slate-400">Branches can customize retail prices</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={formData.features.customAudit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          features: { ...formData.features, customAudit: e.target.checked },
                        })
                      }
                      className="h-4 w-4 text-brand-primary rounded border-slate-300 focus:ring-brand-primary"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Custom Audit & VAT Export</div>
                      <div className="text-[11px] text-slate-400">Advanced MIS compliance export</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={formData.features.apiAccess}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          features: { ...formData.features, apiAccess: e.target.checked },
                        })
                      }
                      className="h-4 w-4 text-brand-primary rounded border-slate-300 focus:ring-brand-primary"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">External API & Webhooks</div>
                      <div className="text-[11px] text-slate-400">Integrate external developer endpoints</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 text-brand-primary rounded border-slate-300 focus:ring-brand-primary"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Active for Purchase</div>
                      <div className="text-[11px] text-slate-400">Visible to pharmacy owners</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-primary text-white font-bold shadow-md hover:bg-brand-primary/90 transition active:scale-95 disabled:opacity-50"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving Plan...</span>
                    </>
                  ) : (
                    <span>Save Plan & Enforce Limits</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
