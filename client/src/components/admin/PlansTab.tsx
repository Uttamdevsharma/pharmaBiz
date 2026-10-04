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
  X,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface PlanFeatures {
  yearlyDiscountPercent?: number;
  maxStaffPerBranch?: number;
  maxTotalStaff?: number;
  trialDays?: number;
  isTrial?: boolean;
  isCustom?: boolean;
  whatsappNumber?: string;
  customMessage?: string;
  [key: string]: any;
}

interface PlanItem {
  id: string;
  name: string;
  tier: "TRIAL" | "STARTER" | "GROWTH" | "ENTERPRISE";
  price: number | string;
  billingCycle: string;
  yearlyDiscountPercent?: number;
  maxBranches: number;
  maxStaffPerBranch: number;
  maxTotalStaff: number;
  trialDays?: number;
  isTrial?: boolean;
  isCustom?: boolean;
  whatsappNumber?: string;
  customMessage?: string;
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
    yearlyDiscountPercent: 5,
    maxBranches: 2,
    maxStaffPerBranch: 1,
    maxTotalStaff: 2,
    trialDays: 7,
    isTrial: false,
    isCustom: false,
    whatsappNumber: "",
    customMessage: "আসসালামু আলাইকুম, আমি PharmaBiz-এর Enterprise / Custom প্ল্যানটি আমার ফার্মেসির জন্য নিতে আগ্রহী। বিস্তারিত আলোচনা করতে চাই।",
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
      yearlyDiscountPercent: 5,
      maxBranches: 2,
      maxStaffPerBranch: 1,
      maxTotalStaff: 2,
      trialDays: 7,
      isTrial: false,
      isCustom: false,
      whatsappNumber: "",
      customMessage: "Hello, I am interested in the Custom Enterprise plan for PharmaBiz. Please share details regarding custom setup.",
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (plan: PlanItem) => {
    setEditingPlan(plan);
    setErrorMessage(null);
    setSuccessMessage(null);
    const feat = (typeof plan.features === "object" && plan.features !== null) ? plan.features : {} as PlanFeatures;
    const isTrial = plan.isTrial ?? (plan.tier === "TRIAL" || !!feat.isTrial);
    const isCustom = plan.isCustom ?? (feat.isCustom ?? false);
    const trialDaysVal = isTrial
      ? (plan.trialDays && plan.trialDays > 0 ? plan.trialDays : (feat.trialDays && feat.trialDays > 0 ? feat.trialDays : 7))
      : 7;

    setFormData({
      name: plan.name,
      tier: plan.tier,
      price: isTrial ? 0 : Number(plan.price),
      billingCycle: plan.billingCycle || "MONTHLY",
      yearlyDiscountPercent: Number(plan.yearlyDiscountPercent ?? feat.yearlyDiscountPercent ?? (plan.tier === "STARTER" ? 5 : plan.tier === "GROWTH" ? 10 : plan.tier === "ENTERPRISE" ? 15 : 0)),
      maxBranches: plan.maxBranches ?? 2,
      maxStaffPerBranch: plan.maxStaffPerBranch ?? (feat.maxStaffPerBranch ?? 1),
      maxTotalStaff: plan.maxTotalStaff ?? (feat.maxTotalStaff ?? 2),
      trialDays: trialDaysVal,
      isTrial,
      isCustom,
      whatsappNumber: plan.whatsappNumber || feat.whatsappNumber || "",
      customMessage: plan.customMessage || feat.customMessage || "Hello, I am interested in the Custom Enterprise plan for PharmaBiz. Please share details regarding custom setup.",
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
      const isTrial = formData.isTrial || formData.tier === "TRIAL";
      const isCustom = formData.isCustom || false;
      const trialDaysNum = isTrial ? Number(formData.trialDays || 7) : 0;
      const resolvedTier = isTrial ? "TRIAL" : (isCustom ? "ENTERPRISE" : formData.tier);
      const resolvedPrice = isTrial || isCustom ? 0 : Number(formData.price);

      const payload = {
        name: formData.name.trim(),
        tier: resolvedTier,
        price: resolvedPrice,
        billingCycle: formData.billingCycle,
        yearlyDiscountPercent: isTrial || isCustom ? 0 : Number(formData.yearlyDiscountPercent || 0),
        maxBranches: isCustom ? 999 : Number(formData.maxBranches),
        maxStaffPerBranch: isCustom ? 999 : Number(formData.maxStaffPerBranch),
        maxTotalStaff: isCustom ? 999 : Number(formData.maxTotalStaff),
        trialDays: trialDaysNum,
        isTrial,
        isCustom,
        whatsappNumber: formData.whatsappNumber.trim(),
        customMessage: formData.customMessage.trim(),
        features: {
          ...(editingPlan?.features || {}),
          yearlyDiscountPercent: isTrial || isCustom ? 0 : Number(formData.yearlyDiscountPercent || 0),
          maxStaffPerBranch: isCustom ? 999 : Number(formData.maxStaffPerBranch),
          maxTotalStaff: isCustom ? 999 : Number(formData.maxTotalStaff),
          trialDays: trialDaysNum,
          isTrial,
          isCustom,
          whatsappNumber: formData.whatsappNumber.trim(),
          customMessage: formData.customMessage.trim(),
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
            Super Admin control: Edit plan names, branch quotas, staff limits per branch, pricing, and trial periods.
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
                      {plan.isTrial || plan.tier === "TRIAL" ? (
                        <span className="text-2xl font-black text-amber-500 flex items-center gap-1.5">
                          <span>৳ 0</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Free Trial
                          </span>
                        </span>
                      ) : plan.isCustom ? (
                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <span>Custom Pricing</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            WhatsApp
                          </span>
                        </span>
                      ) : (
                        <>
                          <span className="text-3xl font-black text-slate-900 dark:text-white">
                            ৳{Number(plan.price).toLocaleString()}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            /{plan.billingCycle?.toLowerCase() || "month"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Limits Badge Box */}
                  <div className="space-y-2 pt-1">
                    {!plan.isCustom && (
                      <>
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
                      </>
                    )}

                    {/* If TRIAL, show duration */}
                    {(plan.isTrial || plan.tier === "TRIAL") && (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2.5">
                        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>
                          Trial Duration: <strong>{trialDays} Days</strong> (No Payment)
                        </span>
                      </div>
                    )}

                    {/* If Custom, show WhatsApp number */}
                    {plan.isCustom && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
                        <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="truncate">
                          WhatsApp: <strong>{plan.whatsappNumber || feat.whatsappNumber || "Direct Contact"}</strong>
                        </span>
                      </div>
                    )}

                    {/* Annual Discount Badge (only for paid standard plans) */}
                    {!plan.isTrial && plan.tier !== "TRIAL" && !plan.isCustom && Number(plan.yearlyDiscountPercent ?? feat.yearlyDiscountPercent ?? 0) > 0 && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
                        <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>
                          Annual Discount: <strong>{plan.yearlyDiscountPercent ?? feat.yearlyDiscountPercent}% Off</strong> (৳{Math.round(Number(plan.price) * 12 * (1 - Number(plan.yearlyDiscountPercent ?? feat.yearlyDiscountPercent) / 100)).toLocaleString()}/yr)
                        </span>
                      </div>
                    )}
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="max-w-2xl w-full max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {editingPlan ? `Edit ${editingPlan.name}` : "Create New Subscription Plan"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update plan name, pricing, branch limits, staff limits per branch, and trial duration.
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

            {/* Alerts */}
            {errorMessage && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2 shrink-0">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 shrink-0">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Scrollable Form Content */}
            <form onSubmit={handleSavePlan} className="flex flex-col min-h-0 flex-1 mt-4">
              <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-6">
                {/* Mode Selector Toggles: Free Trial vs Custom WhatsApp vs Standard */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                  <div className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">
                    Plan Type Configuration
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Toggle A: Free Trial */}
                    <label
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                        formData.isTrial
                          ? "bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/30"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.isTrial}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setFormData({
                            ...formData,
                            isTrial: val,
                            isCustom: val ? false : formData.isCustom,
                            tier: val ? "TRIAL" : "STARTER",
                            price: val ? 0 : 500,
                          });
                        }}
                        className="mt-0.5 h-4 w-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>🎉 Free Trial Plan</span>
                          {formData.isTrial && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-amber-500 text-white rounded font-bold">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Zero-fee trial period with price hidden
                        </p>
                      </div>
                    </label>

                    {/* Toggle B: Custom / WhatsApp Plan */}
                    <label
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                        formData.isCustom
                          ? "bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/30"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.isCustom}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setFormData({
                            ...formData,
                            isCustom: val,
                            isTrial: val ? false : formData.isTrial,
                            tier: val ? "ENTERPRISE" : "STARTER",
                            price: 0,
                          });
                        }}
                        className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>💬 Custom Plan (WhatsApp Contact)</span>
                          {formData.isCustom && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-emerald-600 text-white rounded font-bold">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          No fixed pricing or limits, direct WhatsApp inquiry
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Section 1: Basic Information */}
                <div className="space-y-4">
                  <div className="text-xs font-black tracking-wider uppercase text-slate-400 dark:text-slate-500">
                    1. Plan Identity & {formData.isTrial ? "Trial Settings" : formData.isCustom ? "WhatsApp Contact" : "Pricing"}
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
                        placeholder={formData.isTrial ? "e.g. 7-Day Free Trial" : formData.isCustom ? "e.g. Enterprise Custom" : "e.g. Plan 2 - Growth"}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Pricing Tier System Key
                      </label>
                      <select
                        disabled={!!editingPlan || formData.isTrial || formData.isCustom}
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

                  {/* If Free Trial: Price is hidden, Trial Days is displayed */}
                  {formData.isTrial && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                        <Clock className="h-4 w-4" />
                        <span>Free Trial Period Settings</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Trial Duration (Days) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
                            max="365"
                            value={formData.trialDays}
                            onChange={(e) => setFormData({ ...formData, trialDays: parseInt(e.target.value, 10) || 7 })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                            placeholder="e.g. 7"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Price & License Fee
                          </label>
                          <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            ৳ 0 (Free & Waived)
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* If Custom / WhatsApp Plan: Price is hidden, WhatsApp Contact & Message are displayed */}
                  {formData.isCustom && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        <Users className="h-4 w-4" />
                        <span>WhatsApp Contact Details</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            WhatsApp Phone Number <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required={formData.isCustom}
                            value={formData.whatsappNumber}
                            onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                            placeholder="e.g. 017XXXXXXXX"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Price Display
                          </label>
                          <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            Custom Pricing (Negotiable)
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Pre-filled Inquiry Message
                        </label>
                        <textarea
                          rows={2}
                          value={formData.customMessage}
                          onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="Hello, I am interested in the Custom Enterprise plan for PharmaBiz..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Standard Pricing Fields: Only shown when NOT Trial and NOT Custom */}
                  {!formData.isTrial && !formData.isCustom && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Yearly Discount (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={formData.yearlyDiscountPercent}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                yearlyDiscountPercent: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)),
                              })
                            }
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            placeholder="e.g. 5"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 2: Dynamic Limits & Quotas (Hidden for Custom Plan) */}
                {!formData.isCustom && (
                  <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black tracking-wider uppercase text-slate-400 dark:text-slate-500">
                        2. Store & Staff Limits
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
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Staff Limit Per Branch
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={formData.maxStaffPerBranch}
                          onChange={(e) => setFormData({ ...formData, maxStaffPerBranch: parseInt(e.target.value, 10) || 1 })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
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
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Fixed Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0 mt-4">
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
