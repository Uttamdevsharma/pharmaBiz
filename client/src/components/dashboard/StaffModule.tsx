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
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Building,
  CheckCircle2,
  XCircle,
  Users,
  Trash2,
  Edit2,
  X,
} from "lucide-react";
import { getClientPlanConfig } from "@/lib/planLimits";

interface PharmacyRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
}

interface StaffModuleProps {
  onNavigate?: (module: any) => void;
}

export function StaffModule({ onNavigate }: StaffModuleProps = {}) {
  const { user } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [roles, setRoles] = useState<PharmacyRole[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const isManager = user?.role === "BRANCH_MANAGER";
  const isOwner = user?.role === "COMPANY_OWNER" || user?.role === "SUPER_ADMIN";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    phone: "",
    password: "",
    role: "",
    branchId: user?.branchId || "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (isManager && user?.branchId) {
        params.append("branchId", user.branchId);
      }
      const [sRes, bRes, pRes, rRes] = await Promise.all([
        fetchApi(`/users?${params.toString()}`),
        fetchApi("/branches"),
        fetchApi("/tenant/profile"),
        fetchApi("/users/roles"),
      ]);

      if (sRes.success) setStaff(sRes.data || []);
      if (bRes.success) setBranches(bRes.data || []);
      if (pRes.success) setProfile(pRes.data);
      if (rRes.success && rRes.data) {
        setRoles(rRes.data);
        if (!formData.role && rRes.data.length > 0) {
          setFormData((prev) => ({ ...prev, role: rRes.data[0].id }));
        }
      }
    } catch (err) {
      console.error("Failed to load staff data", err);
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
      role: roles[0]?.id || "",
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
      role: member.pharmacyRoleId || member.role || roles[0]?.id || "",
      branchId: member.branchId || "",
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.role) {
      setError("Please select a role for this staff member.");
      return;
    }

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
            username: formData.email,
            phone: formData.phone,
            password: formData.password,
            role: formData.role,
            branchId: targetBranchId || null,
          }),
        });
      }

      if (res.success) {
        setModalOpen(false);
        setFeedback({
          type: "success",
          text: `Staff member "${formData.name}" ${editingStaff ? "updated" : "created"} successfully.`,
        });
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
        setFeedback({
          type: "success",
          text: `Staff member "${member.name || member.username}" ${
            !member.isActive ? "activated" : "deactivated"
          } successfully.`,
        });
        await loadData();
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to update status" });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to toggle staff status" });
    }
  };

  const handleDeleteStaff = async (member: any) => {
    if (member.role === "COMPANY_OWNER") {
      setFeedback({ type: "error", text: "Pharmacy Owner account cannot be deleted." });
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete staff member "${
        member.name || member.username
      }"? This action will remove their system access immediately.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(member.id);
      const res = await fetchApi(`/users/${member.id}`, {
        method: "DELETE",
      });

      if (res.success) {
        setFeedback({
          type: "success",
          text: res.message || `Staff member "${member.name || member.username}" deleted successfully.`,
        });
        await loadData();
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to delete staff member" });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Error deleting staff member" });
    } finally {
      setDeletingId(null);
    }
  };

  const selectedRoleObj = roles.find((r) => r.id === formData.role || r.name === formData.role);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="h-6 w-6 text-brand-primary" />
            <span>{isManager ? "Branch Staff" : "Staff List"}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isManager
              ? "Manage cashiers and staff assigned to your branch"
              : `Managing ${nonOwnerStaff.length} of ${maxStaff >= 999 ? "Unlimited" : maxStaff} staff members (${planConfig.name})`}
          </p>
        </div>

        {user?.role !== "AUDITOR" && (
          <div className="flex items-center gap-2.5">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate("staff_create")}
                disabled={isTotalLimitReached}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold shadow hover:bg-brand-primary/90 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                <span>Create Staff</span>
              </button>
            )}
            <button
              onClick={handleOpenCreate}
              disabled={isTotalLimitReached}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Quick Add</span>
            </button>
          </div>
        )}
      </div>

      {/* Feedback Notification */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
            <span className="text-xs font-medium">Loading staff team...</span>
          </div>
        ) : staff.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Staff Member</th>
                  <th className="px-6 py-4 font-semibold">Assigned Role</th>
                  <th className="px-6 py-4 font-semibold">Branch</th>
                  <th className="px-6 py-4 font-semibold">Phone</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {staff.map((member) => {
                  const isOwnerMember = member.role === "COMPANY_OWNER";
                  const roleTitle = isOwnerMember
                    ? "Pharmacy Owner"
                    : member.pharmacyRoleName || member.pharmacyRole?.name || member.role?.replace("_", " ");

                  return (
                    <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isOwnerMember
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-brand-primary/10 text-brand-primary"
                            }`}
                          >
                            {(member.name || member.username || "S").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {member.name || member.username}
                            </div>
                            <div className="text-xs text-slate-400 font-normal">{member.email || member.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                            isOwnerMember
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                          }`}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>{roleTitle}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium">
                        {member.branch?.name || (isOwnerMember ? "All Branches (Owner)" : "HQ / Main Branch")}
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
                      <td className="px-6 py-4 text-right space-x-1.5">
                        {!isOwnerMember && user?.role !== "AUDITOR" && (
                          <div className="inline-flex items-center gap-1.5">
                            {/* Edit Action */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(member)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                            >
                              Edit
                            </button>

                            {/* Deactivate / Activate Action */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(member)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                                member.isActive
                                  ? "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                                  : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                              }`}
                            >
                              {member.isActive ? "Deactivate" : "Activate"}
                            </button>

                            {/* Delete Action */}
                            {isOwner && (
                              <button
                                type="button"
                                disabled={deletingId === member.id}
                                onClick={() => handleDeleteStaff(member)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition disabled:opacity-50"
                                title="Delete Staff Member"
                              >
                                {deletingId === member.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-sm text-slate-400">No staff members found.</div>
        )}
      </div>

      {/* Add / Edit Staff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingStaff ? "Edit Staff Member" : "Add New Staff Member"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Shakil Ahmed"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value, username: e.target.value })}
                    placeholder="name@pharmacy.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="01700000000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Select Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  required
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none text-xs font-bold cursor-pointer"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.description ? `— ${r.description}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Branch Assignment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                    <option value="">HQ / Main Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {editingStaff ? "Reset Password (leave empty to keep current)" : "Password *"}
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required={!editingStaff}
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="w-full pl-9 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Role Permissions Inheritance Notice */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                <KeyRound className="h-4 w-4 text-brand-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Automatic Role Permissions Inheritance:{" "}
                  </span>
                  This staff member will automatically inherit all sidebar module permissions configured for{" "}
                  <strong>{selectedRoleObj?.name || "this role"}</strong> in the Roles & Permissions section.
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-brand-primary text-white font-bold shadow hover:bg-brand-primary/90 transition text-xs"
                >
                  {saving ? "Saving..." : editingStaff ? "Save Changes" : "Create Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
