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
  isPopular?: boolean;
  whatsappNumber?: string;
  customMessage?: string;
  featureList?: string[];
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
  isPopular?: boolean;
  whatsappNumber?: string;
  customMessage?: string;
  featureList?: string[];
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
    isPopular: false,
    whatsappNumber: "",
    customMessage: "Hello, I am interested in the Custom Enterprise plan for PharmaBiz. Please share details regarding custom setup.",
    featuresText: "Full Offline POS Counter Dispensing\nMulti-Branch Stock Synchronization\nInventory & Batch Expiry Tracking\nSales & Financial Ledger Analytics",
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
      isPopular: false,
      whatsappNumber: "",
      customMessage: "Hello, I am interested in the Custom Enterprise plan for PharmaBiz. Please share details regarding custom setup.",
      featuresText: "Full Offline POS Counter Dispensing\nMulti-Branch Stock Synchronization\nInventory & Batch Expiry Tracking\nSales & Financial Ledger Analytics",
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
    const isPopular = Boolean(plan.isPopular ?? (feat.isPopular ?? false));
    const trialDaysVal = isTrial
      ? (plan.trialDays && plan.trialDays > 0 ? plan.trialDays : (feat.trialDays && feat.trialDays > 0 ? feat.trialDays : 7))
      : 7;

    const rawList = Array.isArray(plan.featureList) && plan.featureList.length > 0
      ? plan.featureList
      : Array.isArray(feat.featureList) && feat.featureList.length > 0
      ? feat.featureList
      : [
          "Full Offline POS Counter Dispensing",
          "Multi-Branch Stock Synchronization",
          "Inventory & Batch Expiry Tracking",
          "Sales & Financial Ledger Analytics",
        ];

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
      isPopular,
      whatsappNumber: plan.whatsappNumber || feat.whatsappNumber || "",
      customMessage: plan.customMessage || feat.customMessage || "Hello, I am interested in the Custom Enterprise plan for PharmaBiz. Please share details regarding custom setup.",
      featuresText: rawList.join("\n"),
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

      const featureList = formData.featuresText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

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
        isPopular: formData.isPopular,
        whatsappNumber: formData.whatsappNumber.trim(),
        customMessage: formData.customMessage.trim(),
        featureList,
        features: {
          ...(editingPlan?.features || {}),
          yearlyDiscountPercent: isTrial || isCustom ? 0 : Number(formData.yearlyDiscountPercent || 0),
          maxStaffPerBranch: isCustom ? 999 : Number(formData.maxStaffPerBranch),
          maxTotalStaff: isCustom ? 999 : Number(formData.maxTotalStaff),
          trialDays: trialDaysNum,
          isTrial,
          isCustom,
          isPopular: formData.isPopular,
          whatsappNumber: formData.whatsappNumber.trim(),
          customMessage: formData.customMessage.trim(),
          featureList,
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
        if (typeof window !== "undefined") {
          localStorage.removeItem("pharmabiz_site_settings");
        }
        setSuccessMessage("Plan saved successfully!");
        setTimeout(() => {
          setModalOpen(false);
          loadPlans();
        }, 400);
      } else {
        setErrorMessage(res.message || "Failed to save plan");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error saving plan");
    } finally {
      setFormLoading(false);
    }
  };

  const handleTogglePopular = async (plan: PlanItem) => {
    try {
      const feat = (typeof plan.features === "object" && plan.features !== null) ? plan.features : {} as PlanFeatures;
      const currentPopular = Boolean(plan.isPopular ?? feat.isPopular);
      const res = await fetchApi(`/super-admin/plans/${plan.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPopular: !currentPopular }),
      });
      if (res.success) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("pharmabiz_site_settings");
        }
        await loadPlans();
      }
    } catch (err) {
      console.error("Failed to toggle plan popular status", err);
    }
  };

  const handleToggleStatus = async (plan: PlanItem) => {
    try {
      const res = await fetchApi(`/super-admin/plans/${plan.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      if (res.success) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("pharmabiz_site_settings");
        }
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
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Subscription Plans
          </h2>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-none bg-brand-primary text-white text-sm font-bold shadow-none hover:bg-brand-primary/90 transition shrink-0"
        >
          <Plus className="h-4 w-4" />
          Create Plan
        </button>
      </div>

      {/* Plans List Cards */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="h-7 w-7 animate-spin text-brand-primary" />
          <span className="text-xs font-semibold">Loading plans...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const feat = (typeof plan.features === "object" && plan.features !== null) ? plan.features : {} as PlanFeatures;
            const staffPerBranch = plan.maxStaffPerBranch ?? (feat.maxStaffPerBranch ?? 1);
            const totalStaff = plan.maxTotalStaff ?? (feat.maxTotalStaff ?? 2);
            const trialDays = plan.trialDays ?? (feat.trialDays ?? 7);

            const displayFeatures = (Array.isArray(plan.featureList) && plan.featureList.length > 0)
              ? plan.featureList
              : (Array.isArray(feat.featureList) && feat.featureList.length > 0)
              ? feat.featureList
              : [];

            return (
              <div
                key={plan.id}
                className={`rounded-none p-6 bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between relative shadow-none ${
                  plan.isActive
                    ? "border-slate-300 dark:border-slate-800"
                    : "border-dashed border-slate-300 dark:border-slate-800 opacity-60 bg-slate-50/50 dark:bg-slate-900/50"
                }`}
              >
                <div className="space-y-4">
                  {/* Tier Badge & Status */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-none text-xs font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                        {plan.tier}
                      </span>
                      {(plan.isPopular || feat.isPopular) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-xs font-black bg-blue-600 text-white shadow-xs">
                          <Sparkles className="h-3 w-3" /> Popular
                        </span>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-none border ${
                        plan.isActive
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 ${plan.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                      {plan.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Plan Name & Price */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">
                      {plan.name}
                    </h3>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      {plan.isTrial || plan.tier === "TRIAL" ? (
                        <span className="text-2xl font-black text-amber-500 flex items-center gap-1.5">
                          <span>৳ 0</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-none bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Free Trial
                          </span>
                        </span>
                      ) : plan.isCustom ? (
                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <span>Custom</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            WhatsApp
                          </span>
                        </span>
                      ) : (
                        <>
                          <span className="text-2xl font-black text-slate-900 dark:text-white">
                            ৳{Number(plan.price).toLocaleString()}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            /{plan.billingCycle?.toLowerCase() || "month"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Quotas Box */}
                  <div className="space-y-1.5 pt-1">
                    {!plan.isCustom && (
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <div className="p-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 rounded-none flex items-center gap-2">
                          <Building className="h-3.5 w-3.5 text-brand-primary shrink-0" />
                          <span>Branches: <strong>{plan.maxBranches >= 999 ? "Unlimited" : plan.maxBranches}</strong></span>
                        </div>
                        <div className="p-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 rounded-none flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>Staff/Branch: <strong>{staffPerBranch >= 999 ? "Unlimited" : staffPerBranch}</strong></span>
                        </div>
                        <div className="p-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 rounded-none flex items-center gap-2 col-span-2">
                          <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          <span>Total Staff: <strong>{totalStaff >= 999 ? "Unlimited" : totalStaff}</strong></span>
                        </div>
                      </div>
                    )}

                    {(plan.isTrial || plan.tier === "TRIAL") && (
                      <div className="p-2 border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2 rounded-none">
                        <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>Trial Duration: <strong>{trialDays} Days</strong></span>
                      </div>
                    )}

                    {plan.isCustom && (
                      <div className="p-2 border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 rounded-none">
                        <Users className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">WhatsApp: <strong>{plan.whatsappNumber || feat.whatsappNumber || "Direct Contact"}</strong></span>
                      </div>
                    )}

                    {!plan.isTrial && plan.tier !== "TRIAL" && !plan.isCustom && Number(plan.yearlyDiscountPercent ?? feat.yearlyDiscountPercent ?? 0) > 0 && (
                      <div className="p-2 border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 rounded-none">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Yearly Discount: <strong>{plan.yearlyDiscountPercent ?? feat.yearlyDiscountPercent}% Off</strong></span>
                      </div>
                    )}

                    {/* Features List */}
                    {displayFeatures.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                        <div className="text-[11px] font-bold uppercase text-slate-500">Plan Features:</div>
                        <ul className="space-y-1">
                          {displayFeatures.map((f: string, i: number) => (
                            <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(plan)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-bold border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-brand-primary" />
                      Edit Plan
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePopular(plan)}
                      title="Set or unset as the Most Popular highlighted plan on the Landing Page"
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-none text-xs font-bold border transition ${
                        (plan.isPopular || feat.isPopular)
                          ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 shadow-xs"
                          : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600"
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {(plan.isPopular || feat.isPopular) ? "Popular ★" : "Set Popular"}
                    </button>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(plan)}
                    className={`px-3 py-1.5 rounded-none text-xs font-bold border transition ${
                      plan.isActive
                        ? "border-amber-300 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        : "border-emerald-300 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
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
          <div className="max-w-2xl w-full max-h-[90vh] flex flex-col rounded-none bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-5 sm:p-6 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingPlan ? `Edit ${editingPlan.name}` : "Create Plan"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-none text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Alerts */}
            {errorMessage && (
              <div className="mt-3 p-2.5 rounded-none bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2 shrink-0">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mt-3 p-2.5 rounded-none bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 shrink-0">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Scrollable Form Content */}
            <form onSubmit={handleSavePlan} className="flex flex-col min-h-0 flex-1 mt-4">
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                {/* Plan Type Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-none border flex items-center gap-3 cursor-pointer transition ${
                      formData.isTrial
                        ? "bg-amber-500/10 border-amber-500"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
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
                      className="h-4 w-4 rounded-none text-amber-600 focus:ring-0 border-slate-300 cursor-pointer"
                    />
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Free Trial / Demo Tier
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-none border flex items-center gap-3 cursor-pointer transition ${
                      formData.isCustom
                        ? "bg-emerald-500/10 border-emerald-500"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
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
                      className="h-4 w-4 rounded-none text-emerald-600 focus:ring-0 border-slate-300 cursor-pointer"
                    />
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Custom (WhatsApp Plan)
                    </div>
                  </label>
                </div>

                {/* Section 1: Basic Information */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold uppercase text-slate-500 border-b pb-1">
                    Basic Info
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Plan Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={formData.isTrial ? "7-Day Free Trial" : formData.isCustom ? "Enterprise Custom" : "Plan 2 - Growth"}
                        className="w-full px-3 py-2 rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Tier Key
                      </label>
                      <select
                        disabled={!!editingPlan || formData.isTrial || formData.isCustom}
                        value={formData.tier}
                        onChange={(e) => setFormData({ ...formData, tier: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none disabled:opacity-60"
                      >
                        <option value="TRIAL">TRIAL</option>
                        <option value="STARTER">STARTER</option>
                        <option value="GROWTH">GROWTH</option>
                        <option value="ENTERPRISE">ENTERPRISE</option>
                      </select>
                    </div>
                  </div>

                  {formData.isTrial && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Trial Duration (Days) *
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="365"
                          value={formData.trialDays}
                          onChange={(e) => setFormData({ ...formData, trialDays: parseInt(e.target.value, 10) || 7 })}
                          className="w-full px-3 py-2 rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Price
                        </label>
                        <div className="px-3 py-2 rounded-none border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-sm font-bold text-emerald-600">
                          ৳ 0 (Free)
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.isCustom && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            WhatsApp Number *
                          </label>
                          <input
                            type="text"
                            required={formData.isCustom}
                            value={formData.whatsappNumber}
                            onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                            placeholder="017XXXXXXXX"
                            className="w-full px-3 py-2 rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Price Display
                          </label>
                          <div className="px-3 py-2 rounded-none border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-sm font-bold text-emerald-600">
                            Custom
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          WhatsApp Message Template
                        </label>
                        <textarea
                          rows={2}
                          value={formData.customMessage}
                          onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
                          className="w-full px-3 py-2 rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-brand-primary"
                        />
                      </div>
                    </div>
                  )}

                  {!formData.isTrial && !formData.isCustom && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Price (৳) *
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Billing Cycle
                        </label>
                        <select
                          value={formData.billingCycle}
                          onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                          className="w-full px-3 py-2 rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-primary"
                        >
                          <option value="MONTHLY">Monthly</option>
                          <option value="YEARLY">Yearly</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Yearly Discount (%)
                        </label>
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
                          className="w-full px-3 py-2 rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-primary"
                          placeholder="5"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 2: Store & Staff Limits */}
                {!formData.isCustom && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b pb-1">
                      <div className="text-xs font-bold uppercase text-slate-500">
                        Limits (999 for Unlimited)
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Max Branches
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={formData.maxBranches}
                          onChange={(e) => setFormData({ ...formData, maxBranches: parseInt(e.target.value, 10) || 1 })}
                          className="w-full px-3 py-2 rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Staff Per Branch
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={formData.maxStaffPerBranch}
                          onChange={(e) => setFormData({ ...formData, maxStaffPerBranch: parseInt(e.target.value, 10) || 1 })}
                          className="w-full px-3 py-2 rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Total Staff Limit
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={formData.maxTotalStaff}
                          onChange={(e) => setFormData({ ...formData, maxTotalStaff: parseInt(e.target.value, 10) || 1 })}
                          className="w-full px-3 py-2 rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-primary"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 3: Plan Features */}
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-bold uppercase text-slate-500 border-b pb-1">
                    Plan Features (One per line)
                  </div>
                  <textarea
                    rows={5}
                    value={formData.featuresText}
                    onChange={(e) => setFormData({ ...formData, featuresText: e.target.value })}
                    placeholder={"Full Offline POS Counter Dispensing\nMulti-Branch Stock Synchronization\nInventory & Batch Expiry Tracking\nSales & Financial Ledger Analytics"}
                    className="w-full px-3 py-2 rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono focus:outline-none focus:border-brand-primary"
                  />
                </div>

                {/* Section 4: Most Popular & Plan Status */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="text-xs font-bold uppercase text-slate-500 border-b pb-1">
                    Display & Visibility
                  </div>

                  {/* Most Popular Plan Checkbox */}
                  <label
                    className={`p-3 rounded-none border flex items-start gap-3 cursor-pointer transition ${
                      formData.isPopular
                        ? "bg-blue-50 dark:bg-blue-950/30 border-blue-400 dark:border-blue-600"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.isPopular}
                      onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded-none text-blue-600 focus:ring-0 border-slate-300 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                        Most Popular Plan (Landing Page Highlight)
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                        When checked, this plan card will be prominently highlighted in blue on the Landing Page pricing section. (Only one plan can be Most Popular; setting this will make it the sole highlighted plan).
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 rounded-none text-brand-primary focus:ring-0 border-slate-300 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Plan Active Status ({formData.isActive ? "Active" : "Disabled"})
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0 mt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-none border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-none bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary/90 transition disabled:opacity-50"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Plan</span>
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
