"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  Phone,
} from "lucide-react";
import { getClientPlanConfig } from "@/lib/planLimits";
import { Pagination } from "@/components/common/Pagination";

interface PharmacyRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
}

interface StaffModuleProps {
  onNavigate?: (module: any) => void;
}

// Persistent module cache
let cachedStaff: any[] = [];
let cachedStaffRoles: PharmacyRole[] = [];
let cachedStaffBranches: any[] = [];

export function StaffModule({ onNavigate }: StaffModuleProps = {}) {
  const { user } = useAuth();
  const [staff, setStaff] = useState<any[]>(() => cachedStaff);
  const [roles, setRoles] = useState<PharmacyRole[]>(() => cachedStaffRoles);
  const [branches, setBranches] = useState<any[]>(() => cachedStaffBranches);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const isManager = user?.role === "BRANCH_MANAGER";
  const isOwner = user?.role === "COMPANY_OWNER" || user?.role === "SUPER_ADMIN";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    phone: "",
    password: "",
    confirmPassword: "",
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

      if (sRes.success) {
        setStaff(sRes.data || []);
        cachedStaff = sRes.data || [];
      }
      if (bRes.success) {
        setBranches(bRes.data || []);
        cachedStaffBranches = bRes.data || [];
      }
      if (pRes.success) setProfile(pRes.data);
      if (rRes.success && rRes.data) {
        setRoles(rRes.data);
        cachedStaffRoles = rRes.data;
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
      confirmPassword: "",
      role: roles[0]?.id || "",
      branchId: user?.branchId || branches[0]?.id || "",
    });
    setError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
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
      confirmPassword: "",
      role: member.pharmacyRoleId || member.role || roles[0]?.id || "",
      branchId: member.branchId || "",
    });
    setError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setModalOpen(true);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strictly numeric only, discard any non-digit chars like letters a, b, etc. Max 12 digits.
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 12);
    setFormData((prev) => ({ ...prev, phone: digitsOnly }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.role) {
      setError("Please select a role for this staff member.");
      return;
    }

    // Phone number validation: 11 or 12 digits
    if (formData.phone && (formData.phone.length < 11 || formData.phone.length > 12)) {
      setError("Phone number must be either 11 or 12 digits (e.g. 01712345678).");
      return;
    }

    // Password validation for new staff
    if (!editingStaff) {
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match. Please verify your confirm password.");
        return;
      }
    } else if (formData.password) {
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match. Please verify your confirm password.");
        return;
      }
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

  // Pagination calculation
  const totalPages = Math.ceil(staff.length / pageSize) || 1;
  const paginatedStaff = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return staff.slice(start, start + pageSize);
  }, [staff, currentPage, pageSize]);

  return (
    <div className="space-y-6 w-full">
      {/* Header & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-1">
            <span>Staff Management</span>
            <span>/</span>
            <span className="text-brand-primary">Staff List</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="h-7 w-7 text-brand-primary" />
            <span>{isManager ? "Branch Staff" : "Staff List"}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Overview of all staff members, their assigned roles, branches, and account status.
          </p>
        </div>

        {user?.role !== "AUDITOR" && (
          <div className="flex items-center gap-3">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate("staff_create")}
                disabled={isTotalLimitReached}
                className="h-10 px-4 rounded-lg bg-brand-primary text-white text-xs sm:text-sm font-bold shadow-xs hover:bg-brand-primary-hover transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                <span>Create Staff</span>
              </button>
            )}
            <button
              onClick={handleOpenCreate}
              disabled={isTotalLimitReached}
              className="h-10 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs sm:text-sm font-bold transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              <span>Quick Add</span>
            </button>
          </div>
        )}
      </div>

      {/* Feedback Notification */}
      {feedback && (
        <div
          className={`p-4 rounded-lg text-xs font-semibold flex items-center justify-between transition-all ${
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
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
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

      {/* Staff Table Container */}
      <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-primary" />
            <span>Staff Members ({staff.length})</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {/* Skeleton Loading State */}
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse flex items-center justify-between py-3.5 px-4 border border-slate-100 dark:border-slate-800/80 rounded-lg bg-slate-50/50 dark:bg-slate-800/30"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded-sm" />
                    <div className="h-3 w-44 bg-slate-100 dark:bg-slate-800 rounded-sm" />
                  </div>
                </div>
                <div className="h-6 w-28 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded-sm" />
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-sm" />
                <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg" />
              </div>
            ))}
          </div>
        ) : staff.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Users className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-base font-bold text-slate-700 dark:text-slate-300">No staff members found</p>
            <p className="text-xs mt-1">Click "Create Staff" to add team members to your pharmacy.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="text-[11px] uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Staff Member</th>
                  <th className="px-5 py-3.5">Assigned Role</th>
                  <th className="px-5 py-3.5">Branch</th>
                  <th className="px-5 py-3.5">Phone</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                {paginatedStaff.map((member) => {
                  const isOwnerMember = member.role === "COMPANY_OWNER";
                  const roleTitle = isOwnerMember
                    ? "Pharmacy Owner"
                    : member.pharmacyRoleName || member.pharmacyRole?.name || member.role?.replace("_", " ");

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                              isOwnerMember
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-brand-primary/10 text-brand-primary"
                            }`}
                          >
                            {(member.name || member.username || "S").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900 dark:text-white">
                              {member.name || member.username}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">{member.email || member.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                            isOwnerMember
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                          }`}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>{roleTitle}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {member.branch?.name || (isOwnerMember ? "All Branches (Owner)" : "HQ / Main Branch")}
                      </td>
                      <td className="px-5 py-3.5 text-xs sm:text-sm font-mono text-slate-600 dark:text-slate-400">
                        {member.phone || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            member.isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${member.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                          {member.isActive ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {!isOwnerMember && user?.role !== "AUDITOR" && (
                          <div className="inline-flex items-center gap-2">
                            {/* Edit Action */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(member)}
                              className="h-8 px-3 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                            >
                              Edit
                            </button>

                            {/* Deactivate / Activate Action */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(member)}
                              className={`h-8 px-3 rounded-lg text-xs font-bold transition ${
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
                                className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition disabled:opacity-50"
                                title="Delete Staff Member"
                              >
                                {deletingId === member.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
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
        )}

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={staff.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          alwaysShow={true}
        />
      </div>

      {/* Quick Add / Edit Staff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-xl w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingStaff ? "Edit Staff Member" : "Quick Add Staff Member"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Full Name *
                </label>
                <div className="relative flex items-center">
                  <User className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Shakil Ahmed"
                    className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value, username: e.target.value })}
                    placeholder="name@pharmacy.com"
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      Phone Number
                    </label>
                    <span className="text-[10px] text-slate-400">11-12 digits</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={12}
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    placeholder="01700000000"
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              {/* Select Role */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Select Role *
                </label>
                <select
                  value={formData.role}
                  required
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary cursor-pointer"
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
                <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Assign to Branch
                </label>
                {isManager ? (
                  <input
                    type="text"
                    disabled
                    value={branches.find((b) => b.id === user?.branchId)?.name || "Your Branch"}
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-400"
                  />
                ) : (
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary cursor-pointer"
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

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                    {editingStaff ? "Reset Password" : "Password *"}
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required={!editingStaff}
                      minLength={6}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingStaff ? "Leave blank to keep" : "Min 6 chars"}
                      className="w-full h-11 pl-10 pr-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                    {editingStaff ? "Confirm Reset Password" : "Confirm Password *"}
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required={!editingStaff && Boolean(formData.password)}
                      minLength={6}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Re-type password"
                      className="w-full h-11 pl-10 pr-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-10 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-5 rounded-lg bg-brand-primary text-white font-bold hover:bg-brand-primary-hover transition text-xs sm:text-sm shadow-xs flex items-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{editingStaff ? "Save Changes" : "Create Staff"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
