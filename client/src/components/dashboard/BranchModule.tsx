"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Store, Plus, Edit2, Loader2, MapPin, Phone, AlertCircle } from "lucide-react";
import { getClientPlanConfig } from "@/lib/planLimits";

export function BranchModule() {
  const [branches, setBranches] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    phone: "",
    email: "",
    isActive: true,
  });

  const loadBranches = async () => {
    try {
      setLoading(true);
      const [bRes, pRes] = await Promise.all([
        fetchApi("/branches"),
        fetchApi("/tenant/profile"),
      ]);

      if (bRes.success) setBranches(bRes.data || []);
      if (pRes.success) setProfile(pRes.data);
    } catch (err) {
      console.error("Failed to load branches", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const tier = (profile?.tier || "TRIAL").toUpperCase();
  const planConfig = getClientPlanConfig(tier);
  const maxBranches = planConfig.maxBranches;
  const isLimitReached = branches.length >= maxBranches;

  const handleOpenCreate = () => {
    if (isLimitReached) {
      alert(`Your ${planConfig.name} allows up to ${maxBranches >= 999 ? "Unlimited" : maxBranches} branch store(s). Please upgrade your plan to add more branches.`);
      return;
    }
    setEditingBranch(null);
    setFormData({ name: "", location: "", phone: "", email: "", isActive: true });
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (b: any) => {
    setEditingBranch(b);
    setFormData({
      name: b.name,
      location: b.location || "",
      phone: b.phone || "",
      email: b.email || "",
      isActive: b.isActive,
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setSaving(true);
      let res;
      if (editingBranch) {
        res = await fetchApi(`/branches/${editingBranch.id}`, {
          method: "PATCH",
          body: JSON.stringify(formData),
        });
      } else {
        res = await fetchApi("/branches", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }

      if (res.success) {
        setModalOpen(false);
        await loadBranches();
      } else {
        setError(res.message || "Failed to save branch");
      }
    } catch (err: any) {
      setError(err.message || "Error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (b: any) => {
    try {
      const res = await fetchApi(`/branches/${b.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !b.isActive }),
      });
      if (res.success) {
        await loadBranches();
      }
    } catch (err) {
      console.error("Failed to toggle branch status", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Branch Store Network</h2>
          <p className="text-xs text-slate-500">
            Managing {branches.length} of {maxBranches >= 999 ? "Unlimited" : maxBranches} physical branch stores ({planConfig.name})
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          disabled={isLimitReached}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold shadow hover:opacity-90 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Add Store Branch
        </button>
      </div>

      {isLimitReached && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <strong>Branch Limit Reached ({branches.length}/{maxBranches >= 999 ? "Unlimited" : maxBranches})</strong>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                Your <strong>{planConfig.name}</strong> allows a maximum of {maxBranches >= 999 ? "Unlimited" : maxBranches} store location(s).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Branch Cards */}
      {loading ? (
        <div className="py-20 flex items-center justify-center gap-2 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
          <span>Loading branch locations...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((b) => (
            <div
              key={b.id}
              className={`rounded-2xl p-6 bg-white dark:bg-slate-900 border transition-all space-y-4 flex flex-col justify-between ${
                b.isActive ? "border-slate-200 dark:border-slate-800 shadow-sm" : "border-dashed border-slate-300 opacity-60"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="h-9 w-9 rounded-xl brand-subtle-bg text-brand-primary flex items-center justify-center">
                    <Store className="h-5 w-5" />
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      b.isActive
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${b.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                    {b.isActive ? "Operating" : "Inactive"}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{b.name}</h3>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{b.location || "Location not specified"}</span>
                  </div>
                </div>

                <div className="pt-2 text-xs text-slate-500 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{b.phone || "No direct phone"}</span>
                  </div>
                  <div>Staff Assigned: {b.users?.length || 0} Members</div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => handleOpenEdit(b)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit
                </button>

                <button
                  onClick={() => handleToggleStatus(b)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    b.isActive ? "text-red-600 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50"
                  }`}
                >
                  {b.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Branch Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingBranch ? "Edit Branch Store" : "Create New Branch Store"}
            </h3>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dhanmondi Outlet #2"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Location / Physical Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Street, City, Area"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Branch Contact Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="01700000000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Branch Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="branch@pharmacy.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-brand-primary text-white font-bold shadow hover:opacity-90 transition"
                >
                  {saving ? "Saving..." : "Save Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
