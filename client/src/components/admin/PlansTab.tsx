"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Plus, Edit2, Building, Loader2 } from "lucide-react";

export function PlansTab() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    tier: "STARTER",
    price: 500,
    billingCycle: "MONTHLY",
    maxBranches: 3,
    isActive: true,
  });

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await fetchApi("/super-admin/plans");
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
    setFormData({
      name: "",
      tier: "STARTER",
      price: 500,
      billingCycle: "MONTHLY",
      maxBranches: 3,
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      tier: plan.tier,
      price: Number(plan.price),
      billingCycle: plan.billingCycle || "MONTHLY",
      maxBranches: plan.maxBranches,
      isActive: plan.isActive,
    });
    setModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      let res;
      if (editingPlan) {
        res = await fetchApi(`/super-admin/plans/${editingPlan.id}`, {
          method: "PATCH",
          body: JSON.stringify(formData),
        });
      } else {
        res = await fetchApi("/super-admin/plans", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }

      if (res.success) {
        setModalOpen(false);
        await loadPlans();
      } else {
        alert(res.message || "Failed to save plan");
      }
    } catch (err: any) {
      alert(err.message || "Error saving plan");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (plan: any) => {
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
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Subscription Plans</h2>
          <p className="text-sm text-slate-500">Configure tiered pricing, max branch allowances, and feature gating</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-bold shadow hover:opacity-90 transition active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Create New Plan
        </button>
      </div>

      {/* Plans Cards */}
      {loading ? (
        <div className="py-20 flex items-center justify-center gap-2 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
          <span>Loading subscription plans...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl p-6 bg-white dark:bg-slate-900 border transition-all space-y-5 flex flex-col justify-between ${
                plan.isActive
                  ? "border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md"
                  : "border-dashed border-slate-300 dark:border-slate-800 opacity-60"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                    {plan.tier}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold ${
                      plan.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                    }`}
                  >
                    {plan.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                      ৳{Number(plan.price).toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/{plan.billingCycle?.toLowerCase() || "month"}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Building className="h-4 w-4 text-brand-primary shrink-0" />
                  <span>
                    Up to <strong>{plan.maxBranches >= 999 ? "Unlimited" : plan.maxBranches} Branch Stores</strong>
                  </span>
                </div>

                <div className="text-xs text-slate-500 space-y-1.5 pt-2">
                  <div className="font-semibold text-slate-700 dark:text-slate-300">Included Rules:</div>
                  <div>• Offline-First POS Engine</div>
                  <div>• {plan.tier === "STARTER" ? "No Inter-branch transfers" : "Inter-branch stock transfers"}</div>
                  <div>• {plan.tier === "ENTERPRISE" ? "Full compliance & custom audit" : "Standard audit trails"}</div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenEdit(plan)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit
                </button>

                <button
                  onClick={() => handleToggleStatus(plan)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    plan.isActive ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"
                  }`}
                >
                  {plan.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {editingPlan ? "Edit Subscription Plan" : "Create Subscription Plan"}
            </h3>

            <form onSubmit={handleSavePlan} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Plan Display Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Growth Pro"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pricing Tier
                  </label>
                  <select
                    disabled={!!editingPlan}
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="STARTER">Starter (1-3 Branches)</option>
                    <option value="GROWTH">Growth (4-20 Branches)</option>
                    <option value="ENTERPRISE">Enterprise (21+ Branches)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Price (BDT ৳)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Branch Allowance
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.maxBranches}
                    onChange={(e) => setFormData({ ...formData, maxBranches: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Billing Cycle
                  </label>
                  <select
                    value={formData.billingCycle}
                    onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl bg-brand-primary text-white font-bold shadow hover:opacity-90 transition"
                >
                  {formLoading ? "Saving..." : "Save Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
