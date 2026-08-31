"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import {
  Plus,
  Loader2,
  Lock,
  User,
  AlertCircle,
} from "lucide-react";
import { getClientPlanConfig } from "@/lib/planLimits";

export function StaffModule() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isManager = user?.role === "BRANCH_MANAGER";
  const isOwner = user?.role === "COMPANY_OWNER";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    phone: "",
    password: "",
    role: "CASHIER",
    branchId: user?.branchId || "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (isManager && user?.branchId) {
        params.append("branchId", user.branchId);
      }
      const [sRes, bRes, pRes] = await Promise.all([
        fetchApi(`/users?${params.toString()}`),
        fetchApi("/branches"),
        fetchApi("/tenant/profile"),
      ]);

      if (sRes.success) setStaff(sRes.data || []);
      if (bRes.success) setBranches(bRes.data || []);
      if (pRes.success) setProfile(pRes.data);
    } catch (err) {
      console.error("Failed to load staff", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.branchId, user?.role]);

  const tier = (profile?.tier || "TRIAL").toUpperCase();
  const planConfig = getClientPlanConfig(tier);
  const isTrial = tier === "TRIAL";
  const allowsRegionalAdmin = isOwner && (tier === "GROWTH" || tier === "ENTERPRISE");
  const allowsAuditor = isOwner && tier === "ENTERPRISE";

  const nonOwnerStaff = staff.filter((s) => s.role !== "COMPANY_OWNER");
  const maxStaff = isTrial ? 1 : planConfig.maxTotalStaff || 999;
  const isTotalLimitReached = nonOwnerStaff.length >= maxStaff;

  const handleOpenCreate = () => {
    if (isTotalLimitReached) {
      alert(
        isTrial
          ? `Plan 0 - Free Trial allows a maximum of 1 staff member. Please upgrade to a paid plan to add more staff.`
          : `You have reached the staff limit for ${planConfig.name}. Please upgrade to a higher plan to add more staff.`
      );
      return;
    }
    setEditingStaff(null);
    setFormData({
      name: "",
      email: "",
      username: "",
      phone: "",
      password: "",
      role: "CASHIER",
      branchId: user?.branchId || branches[0]?.id || "",
    });
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (member: any) => {
    setEditingStaff(member);
    setFormData({
      name: member.name || "",
      email: member.email || "",
      username: member.username || "",
      phone: member.phone || "",
      password: "",
      role: member.role || "CASHIER",
      branchId: member.branchId || "",
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
      const targetBranchId = isManager ? user?.branchId : formData.branchId;

      if (editingStaff) {
        res = await fetchApi(`/users/${editingStaff.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            role: formData.role,
            branchId: targetBranchId || null,
            ...(formData.password ? { password: formData.password } : {}),
          }),
        });
      } else {
        res = await fetchApi("/users", {
          method: "POST",
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            username: formData.username || formData.email,
            phone: formData.phone,
            password: formData.password,
            role: formData.role,
            branchId: targetBranchId || null,
          }),
        });
      }

      if (res.success) {
        setModalOpen(false);
        await loadData();
      } else {
        setError(res.message || "Failed to save staff member");
      }
    } catch (err: any) {
      setError(err.message || "Error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (member: any) => {
    try {
      const res = await fetchApi(`/users/${member.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      if (res.success) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to toggle staff status", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {isManager ? "Branch Staff & Cashiers" : "Staff & RBAC Assignment"}
          </h2>
          <p className="text-xs text-slate-500">
            {isManager
              ? "Manage cashiers and staff assigned to your branch"
              : `Managing ${nonOwnerStaff.length} of ${maxStaff >= 999 ? "Unlimited" : maxStaff} staff members (${planConfig.name})`}
          </p>
        </div>

        {user?.role !== "AUDITOR" && (
          <button
            onClick={handleOpenCreate}
            disabled={isTotalLimitReached}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold shadow hover:opacity-90 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Add Staff Member
          </button>
        )}
      </div>

      {isTotalLimitReached && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <strong>Staff Capacity Reached ({nonOwnerStaff.length}/{maxStaff >= 999 ? "Unlimited" : maxStaff})</strong>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                {isTrial
                  ? "Plan 0 - Free Trial allows a maximum of 1 staff member. Upgrade to Plan 1, 2, or 3 to add more team members."
                  : `Your ${planConfig.name} allows up to ${planConfig.maxStaffPerBranch} staff per branch. Upgrade for higher capacity.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Staff Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
            <span>Loading staff team...</span>
          </div>
        ) : staff.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Staff Member</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Branch Assigned</th>
                  <th className="px-6 py-4 font-semibold">Phone</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      <div>{member.name || member.username}</div>
                      <div className="text-xs text-slate-400 font-normal">{member.email || member.username}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {member.role?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium">
                      {member.branch?.name || (member.role === "COMPANY_OWNER" ? "All Branches (Owner)" : "HQ / Unassigned")}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{member.phone || "—"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          member.isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${member.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                        {member.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {member.role !== "COMPANY_OWNER" && user?.role !== "AUDITOR" && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(member)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleStatus(member)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                              member.isActive
                                ? "bg-red-50 text-red-600 hover:bg-red-100"
                                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            }`}
                          >
                            {member.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-sm text-slate-400">No staff members found.</div>
        )}
      </div>

      {/* Add / Edit Staff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingStaff ? "Edit Staff Member" : "Add New Staff Member"}
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
                  Full Name *
                </label>
                <div className="relative">
                  <User className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Shakil Ahmed"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value, username: e.target.value })}
                    placeholder="name@pharmacy.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="01700000000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none text-xs font-bold"
                  >
                    <option value="CASHIER">Cashier (POS Sales)</option>
                    {!isManager && <option value="BRANCH_MANAGER">Branch Manager (Stock/Voids)</option>}
                    {allowsRegionalAdmin && (
                      <option value="REGIONAL_ADMIN">Regional Admin (Transfers)</option>
                    )}
                    {allowsAuditor && <option value="AUDITOR">Auditor (Read-Only)</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assign to Branch
                  </label>
                  {isManager ? (
                    <input
                      type="text"
                      disabled
                      value={branches.find((b) => b.id === user?.branchId)?.name || "Your Branch"}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
                    />
                  ) : (
                    <select
                      value={formData.branchId}
                      onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none text-xs"
                    >
                      <option value="">HQ / Unassigned</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {editingStaff ? "New Password (leave empty to keep current)" : "Password *"}
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required={!editingStaff}
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
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
                  {saving ? "Saving..." : "Save Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
