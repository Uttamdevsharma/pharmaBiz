"use client";

import React, { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { showAlert } from "@/lib/swal";
import { getClientPlanConfig } from "@/lib/planLimits";
import {
  Store,
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Building,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
} from "lucide-react";

interface BranchCreateViewProps {
  onNavigate: (module: any) => void;
}

export function BranchCreateView({ onNavigate }: BranchCreateViewProps) {
  const [profile, setProfile] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    phone: "",
    email: "",
    isActive: true,
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [bRes, pRes] = await Promise.all([
          fetchApi("/branches"),
          fetchApi("/tenant/profile"),
        ]);
        if (bRes.success) setBranches(bRes.data || []);
        if (pRes.success) setProfile(pRes.data);
      } catch (err) {
        console.error("Failed to load branch limits", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const tier = (profile?.tier || "TRIAL").toUpperCase();
  const planConfig = getClientPlanConfig(tier);
  const maxBranches = planConfig.maxBranches;
  const isLimitReached = branches.length >= maxBranches;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLimitReached) {
      showAlert.error(
        "Branch Limit Reached",
        `Your ${planConfig.name} plan allows up to ${maxBranches >= 999 ? "Unlimited" : maxBranches} branch store(s). Please upgrade your subscription to add more branches.`
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const res = await fetchApi("/branches", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to create branch");
      }

      await showAlert.success(
        "Branch Created Successfully!",
        `"${formData.name}" has been added to your branch network.`,
        { timer: 2000 }
      );

      onNavigate("branches");
    } catch (err: any) {
      const msg = err.message || "An error occurred while creating the branch";
      setError(msg);
      showAlert.error("Creation Failed", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-16 px-2 sm:px-4">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-400 mb-1.5">
            <span>Branch Management</span>
            <span>/</span>
            <span className="text-brand-primary">Create Branch</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Store className="h-7 w-7 text-brand-primary shrink-0" />
            <span>Create New Branch</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Register a physical store outlet or pharmacy branch location to your central network.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate("branches")}
            className="h-11 sm:h-12 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold transition flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Branch List
          </button>
        </div>
      </div>

      {/* Plan Usage & Limit Alert */}
      {!loading && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            isLimitReached
              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
              : "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 text-blue-950 dark:text-blue-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <AlertCircle
              className={`h-6 w-6 shrink-0 ${
                isLimitReached ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"
              }`}
            />
            <div>
              <div className="font-bold text-sm sm:text-base">
                Plan Capacity: {branches.length} of {maxBranches >= 999 ? "Unlimited" : maxBranches} Branches Used ({planConfig.name})
              </div>
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                {isLimitReached
                  ? `Your current plan has reached its maximum branch allowance. Upgrade to add more locations.`
                  : `You can create up to ${maxBranches >= 999 ? "Unlimited" : maxBranches - branches.length} additional branch store(s) under your current plan.`}
              </div>
            </div>
          </div>
          {isLimitReached && (
            <button
              type="button"
              onClick={() => onNavigate("subscription_plans")}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold transition shrink-0"
            >
              Upgrade Plan
            </button>
          )}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 sm:p-5 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-200 dark:border-rose-900 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-300 text-sm font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Create Form */}
      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 xl:p-8 rounded-2xl border-2 border-slate-200/90 dark:border-slate-800 shadow-xs space-y-5 sm:space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <Building className="h-5 w-5 text-brand-primary" />
            <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
              Branch Store Information
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* Branch Name */}
            <div className="md:col-span-2">
              <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mb-2">
                Branch Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={isLimitReached}
                placeholder="e.g. Dhanmondi Outlet #2, Uttara Branch, Mirpur Point"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-12 px-4 bg-slate-50/70 hover:bg-slate-50 dark:bg-slate-800/60 dark:hover:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-xs sm:placeholder:text-sm placeholder:font-normal placeholder:text-slate-400 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition disabled:opacity-50"
              />
            </div>

            {/* Location / Physical Address */}
            <div className="md:col-span-2">
              <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-slate-400" />
                Physical Location / Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={isLimitReached}
                placeholder="e.g. House 14, Road 7, Sector 3, Dhanmondi, Dhaka"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full h-12 px-4 bg-slate-50/70 hover:bg-slate-50 dark:bg-slate-800/60 dark:hover:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-xs sm:placeholder:text-sm placeholder:font-normal placeholder:text-slate-400 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition disabled:opacity-50"
              />
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-slate-400" />
                Branch Contact Phone
              </label>
              <input
                type="tel"
                disabled={isLimitReached}
                placeholder="e.g. +880 1712-345678"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full h-12 px-4 bg-slate-50/70 hover:bg-slate-50 dark:bg-slate-800/60 dark:hover:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-xs sm:placeholder:text-sm placeholder:font-normal placeholder:text-slate-400 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition disabled:opacity-50"
              />
            </div>

            {/* Branch Email */}
            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-slate-400" />
                Branch Email Address
              </label>
              <input
                type="email"
                disabled={isLimitReached}
                placeholder="e.g. dhanmondi@pharmabiz.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full h-12 px-4 bg-slate-50/70 hover:bg-slate-50 dark:bg-slate-800/60 dark:hover:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-xs sm:placeholder:text-sm placeholder:font-normal placeholder:text-slate-400 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition disabled:opacity-50"
              />
            </div>

            {/* Active Status */}
            <div className="md:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="h-12 px-4 bg-slate-50/70 hover:bg-slate-50 dark:bg-slate-800/60 dark:hover:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between cursor-pointer transition">
                <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Active Operating Status
                </span>
                <input
                  type="checkbox"
                  disabled={isLimitReached}
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-5 w-5 text-brand-primary rounded accent-brand-primary cursor-pointer disabled:opacity-50"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 sm:gap-4 pt-2">
          <button
            type="button"
            onClick={() => onNavigate("branches")}
            className="h-12 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm sm:text-base font-bold transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || isLimitReached}
            className="h-12 px-8 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-sm sm:text-base font-bold transition flex items-center gap-2.5 shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Creating Branch...</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>Save Branch</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
