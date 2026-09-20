"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import {
  Users,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  RefreshCw,
  User,
  Mail,
  Lock,
  Phone,
  KeyRound,
  Building,
} from "lucide-react";

interface CustomRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
}

interface StaffUser {
  id: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  role: string;
  customRoleId?: string;
  customRoleName?: string;
  customRole?: CustomRole;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  branchName?: string;
}

interface StaffListTabProps {
  onNavigateToCreate?: () => void;
}

export function StaffListTab({ onNavigateToCreate }: StaffListTabProps) {
  const { isSuperAdmin, hasPermission } = useAuth();
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Notification
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Quick Add Modal
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickFormData, setQuickFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "",
  });
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  // Edit Modal
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    password: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const canManageStaff = isSuperAdmin || hasPermission("staff.manage");
  const canCreateStaff = isSuperAdmin || hasPermission("staff.create");

  const loadData = async () => {
    try {
      setLoading(true);
      const [staffRes, rolesRes] = await Promise.all([
        fetchApi<StaffUser[]>("/super-admin/staff"),
        fetchApi<CustomRole[]>("/super-admin/roles"),
      ]);

      if (staffRes.success && staffRes.data) {
        setStaffList(staffRes.data);
      }
      if (rolesRes.success && rolesRes.data) {
        setRoles(rolesRes.data);
        if (!quickFormData.role && rolesRes.data.length > 0) {
          setQuickFormData((prev) => ({ ...prev, role: rolesRes.data![0].id }));
        }
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to load staff list" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick Add submit
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFormData.name.trim() || !quickFormData.email.trim() || !quickFormData.password.trim() || !quickFormData.role) {
      setActionMsg({ type: "error", text: "Please fill all required fields." });
      return;
    }

    try {
      setQuickSubmitting(true);
      const res = await fetchApi<StaffUser>("/super-admin/staff", {
        method: "POST",
        body: JSON.stringify({
          name: quickFormData.name.trim(),
          email: quickFormData.email.trim(),
          username: quickFormData.email.trim(),
          phone: quickFormData.phone.trim() || undefined,
          password: quickFormData.password.trim(),
          role: quickFormData.role,
        }),
      });

      if (res.success && res.data) {
        setStaffList((prev) => [res.data!, ...prev]);
        setActionMsg({ type: "success", text: `Staff member "${quickFormData.name}" added successfully.` });
        setIsQuickAddOpen(false);
        setQuickFormData({
          name: "",
          email: "",
          phone: "",
          password: "",
          role: roles[0]?.id || "",
        });
      } else {
        setActionMsg({ type: "error", text: res.message || "Failed to add staff member" });
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Error creating staff member" });
    } finally {
      setQuickSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleStatus = async (staff: StaffUser) => {
    if (!canManageStaff && !isSuperAdmin) return;
    if (staff.role === "SUPER_ADMIN") {
      setActionMsg({ type: "error", text: "Root Super Admin account cannot be disabled." });
      return;
    }

    try {
      setTogglingId(staff.id);
      const res = await fetchApi(`/super-admin/staff/${staff.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !staff.isActive }),
      });

      if (res.success) {
        setStaffList((prev) =>
          prev.map((s) => (s.id === staff.id ? { ...s, isActive: !s.isActive } : s))
        );
        setActionMsg({
          type: "success",
          text: `Staff member "${staff.name || staff.username}" is now ${!staff.isActive ? "Active" : "Disabled"}.`,
        });
      } else {
        setActionMsg({ type: "error", text: res.message || "Failed to update status" });
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Error toggling status" });
    } finally {
      setTogglingId(null);
    }
  };

  // Delete staff member
  const handleDeleteStaff = async (staff: StaffUser) => {
    if (!canManageStaff && !isSuperAdmin) return;
    if (staff.role === "SUPER_ADMIN") {
      setActionMsg({ type: "error", text: "Root Super Admin account cannot be deleted." });
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete staff member "${staff.name || staff.username}"?`
    );
    if (!confirmed) return;

    try {
      setDeletingId(staff.id);
      const res = await fetchApi(`/super-admin/staff/${staff.id}`, {
        method: "DELETE",
      });

      if (res.success) {
        setStaffList((prev) => prev.filter((s) => s.id !== staff.id));
        setActionMsg({
          type: "success",
          text: `Staff member "${staff.name || staff.username}" deleted successfully.`,
        });
      } else {
        setActionMsg({ type: "error", text: res.message || "Failed to delete staff member" });
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Error deleting staff member" });
    } finally {
      setDeletingId(null);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (staff: StaffUser) => {
    setEditingStaff(staff);
    setEditFormData({
      name: staff.name || staff.username,
      email: staff.email || "",
      phone: staff.phone || "",
      role: staff.customRoleId || staff.role || (roles[0]?.id ?? ""),
      password: "",
    });
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    try {
      setSavingEdit(true);
      const payload: any = {
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone || undefined,
        role: editFormData.role,
      };

      if (editFormData.password.trim()) {
        payload.password = editFormData.password.trim();
      }

      const res = await fetchApi<StaffUser>(`/super-admin/staff/${editingStaff.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (res.success && res.data) {
        setStaffList((prev) =>
          prev.map((s) => (s.id === editingStaff.id ? { ...s, ...res.data! } : s))
        );
        setActionMsg({ type: "success", text: `Staff member "${editFormData.name}" updated successfully.` });
        setEditingStaff(null);
      } else {
        setActionMsg({ type: "error", text: res.message || "Failed to update staff member" });
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Error saving staff changes" });
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-1">
            <span>Staff Management</span>
            <span>/</span>
            <span className="text-brand-primary">Staff List</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="h-7 w-7 text-brand-primary" />
            Staff List
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {canCreateStaff && onNavigateToCreate && (
            <button
              type="button"
              onClick={onNavigateToCreate}
              className="h-11 px-5 rounded-xl bg-brand-primary text-white text-sm font-bold shadow-xs hover:bg-brand-primary-hover transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create Staff</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsQuickAddOpen(true)}
            className="h-11 px-5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-sm font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Quick Add</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
            actionMsg.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMsg.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500 shrink-0" />
            )}
            <span>{actionMsg.text}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Staff Table Card */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
            <span className="text-xs font-medium">Loading staff list...</span>
          </div>
        ) : staffList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-black tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-black">Staff Member</th>
                  <th className="px-6 py-4 font-black">Assigned Role</th>
                  <th className="px-6 py-4 font-black">Branch</th>
                  <th className="px-6 py-4 font-black">Phone</th>
                  <th className="px-6 py-4 font-black">Status</th>
                  <th className="px-6 py-4 font-black text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {staffList.map((member) => {
                  const isRootSuperAdmin = member.role === "SUPER_ADMIN";
                  const roleTitle = isRootSuperAdmin
                    ? "Super Admin"
                    : member.customRoleName || member.customRole?.name || member.role.replace("_", " ");

                  const initial = (member.name || member.username || "S").charAt(0).toUpperCase();

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Staff Member (Avatar + Name + Email) */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-sm ${
                              isRootSuperAdmin
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-brand-primary/10 text-brand-primary"
                            }`}
                          >
                            {initial}
                          </div>
                          <div>
                            <div className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{member.name || member.username}</span>
                              {isRootSuperAdmin && (
                                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold">
                                  ROOT
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 font-medium">
                              {member.email || member.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Role */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
                            isRootSuperAdmin
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                              : "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                          }`}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <span>{roleTitle}</span>
                        </span>
                      </td>

                      {/* Branch */}
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {member.branchName || "Main Branch"}
                      </td>

                      {/* Phone */}
                      <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                        {member.phone || "—"}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            member.isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              member.isActive ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          />
                          {member.isActive ? "Active" : "Disabled"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {/* Edit Action */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(member)}
                            className="h-9 px-3.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                          >
                            Edit
                          </button>

                          {/* Deactivate / Activate Action */}
                          {!isRootSuperAdmin && (
                            <button
                              type="button"
                              disabled={togglingId === member.id}
                              onClick={() => handleToggleStatus(member)}
                              className={`h-9 px-3.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                member.isActive
                                  ? "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                                  : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                              }`}
                            >
                              {togglingId === member.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : member.isActive ? (
                                "Deactivate"
                              ) : (
                                "Activate"
                              )}
                            </button>
                          )}

                          {/* Delete Action */}
                          {!isRootSuperAdmin && (
                            <button
                              type="button"
                              disabled={deletingId === member.id}
                              onClick={() => handleDeleteStaff(member)}
                              className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition cursor-pointer disabled:opacity-50"
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400 text-sm">
            No staff members found. Click &quot;Create Staff&quot; or &quot;Quick Add&quot; to register team members.
          </div>
        )}
      </div>

      {/* Quick Add Modal */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Quick Add Staff</h3>
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={quickFormData.name}
                  onChange={(e) => setQuickFormData({ ...quickFormData, name: e.target.value })}
                  placeholder="e.g. Alif Hossain"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={quickFormData.email}
                  onChange={(e) => setQuickFormData({ ...quickFormData, email: e.target.value })}
                  placeholder="alif@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={quickFormData.password}
                  onChange={(e) => setQuickFormData({ ...quickFormData, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Role <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={quickFormData.role}
                  onChange={(e) => setQuickFormData({ ...quickFormData, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={quickFormData.phone}
                  onChange={(e) => setQuickFormData({ ...quickFormData, phone: e.target.value })}
                  placeholder="01782878766"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickSubmitting}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-brand-primary hover:bg-brand-primary-hover text-white shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {quickSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>Add Member</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Edit Staff Member</h3>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Role <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password <span className="text-slate-400 font-normal">(Leave blank to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  placeholder="Optional new password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-brand-primary hover:bg-brand-primary-hover text-white shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
