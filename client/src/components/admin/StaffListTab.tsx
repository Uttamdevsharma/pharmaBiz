"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import { showAlert } from "@/lib/swal";
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
  Edit2,
  Power,
} from "lucide-react";
import { Pagination } from "@/components/common/Pagination";

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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

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
      setActionMsg({ type: "error", text: err.message || "Error adding staff member" });
    } finally {
      setQuickSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleStatus = async (member: StaffUser) => {
    if (member.role === "SUPER_ADMIN") return;
    const nextStatus = !member.isActive;

    try {
      setTogglingId(member.id);
      const res = await fetchApi(`/super-admin/staff/${member.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: nextStatus }),
      });

      if (res.success) {
        setStaffList((prev) =>
          prev.map((s) => (s.id === member.id ? { ...s, isActive: nextStatus } : s))
        );
        setActionMsg({
          type: "success",
          text: `Staff member "${member.name || member.username}" is now ${nextStatus ? "Active" : "Disabled"}.`,
        });
      } else {
        setActionMsg({ type: "error", text: res.message || "Failed to update staff status" });
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Error updating staff status" });
    } finally {
      setTogglingId(null);
    }
  };

  // Delete staff member
  const handleDeleteStaff = async (member: StaffUser) => {
    if (member.role === "SUPER_ADMIN") return;
    const confirmed = await showAlert.confirm(
      "Delete Staff Member",
      `Are you sure you want to remove ${member.name || member.username}? They will lose access to the platform immediately.`,
      "Yes, Delete Staff",
      "Cancel",
      true
    );
    if (!confirmed) return;

    try {
      setDeletingId(member.id);
      const res = await fetchApi(`/super-admin/staff/${member.id}`, {
        method: "DELETE",
      });

      if (res.success) {
        setStaffList((prev) => prev.filter((s) => s.id !== member.id));
        setActionMsg({ type: "success", text: `Staff member "${member.name || member.username}" was removed.` });
      } else {
        setActionMsg({ type: "error", text: res.message || "Failed to remove staff member" });
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Error removing staff member" });
    } finally {
      setDeletingId(null);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (member: StaffUser) => {
    setEditingStaff(member);
    setEditFormData({
      name: member.name || "",
      email: member.email || "",
      phone: member.phone || "",
      role: member.customRoleId || member.role,
      password: "",
    });
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    if (!editFormData.name.trim() || !editFormData.email.trim() || !editFormData.role) {
      setActionMsg({ type: "error", text: "Name, Email, and Role are required." });
      return;
    }

    try {
      setSavingEdit(true);
      const payload: any = {
        name: editFormData.name.trim(),
        email: editFormData.email.trim(),
        phone: editFormData.phone.trim() || undefined,
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

  // Pagination calculation
  const totalPages = Math.ceil(staffList.length / pageSize) || 1;
  const paginatedStaff = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return staffList.slice(start, start + pageSize);
  }, [staffList, currentPage, pageSize]);

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
            <span>Staff List</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your platform team members, custom role assignments, and account statuses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="h-10 px-4 rounded-none text-xs sm:text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          {canCreateStaff && onNavigateToCreate && (
            <button
              type="button"
              onClick={onNavigateToCreate}
              className="h-10 px-5 rounded-none bg-brand-primary text-white text-xs sm:text-sm font-bold shadow-xs hover:bg-brand-primary-hover transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create Staff</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsQuickAddOpen(true)}
            className="h-10 px-4 rounded-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Quick Add</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionMsg && (
        <div
          className={`p-4 rounded-none text-xs font-semibold flex items-center justify-between transition-all ${
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
      <div className="rounded-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-primary" />
            <span>Staff Members ({staffList.length})</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {loading ? (
          /* Animated Skeleton Table */
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse flex items-center justify-between py-3 px-4 border border-slate-100 dark:border-slate-800/80 rounded-none bg-slate-50/50 dark:bg-slate-800/30"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-slate-200 dark:bg-slate-700 rounded-none shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded-none" />
                    <div className="h-3 w-48 bg-slate-200 dark:bg-slate-700 rounded-none" />
                  </div>
                </div>
                <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-none hidden sm:block" />
                <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded-none hidden md:block" />
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-none" />
                <div className="h-8 w-28 bg-slate-200 dark:bg-slate-700 rounded-none" />
              </div>
            ))}
          </div>
        ) : staffList.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <Users className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="font-bold text-slate-700 dark:text-slate-300">No staff members found</p>
            <p className="text-xs text-slate-400 mt-1">Click &quot;Create Staff&quot; or &quot;Quick Add&quot; to register team members.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="text-[11px] uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Staff Member</th>
                  <th className="px-5 py-3.5">Assigned Role</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Phone</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                {paginatedStaff.map((member) => {
                  const isRootSuperAdmin = member.role === "SUPER_ADMIN";
                  const roleTitle = isRootSuperAdmin
                    ? "Super Admin"
                    : member.customRoleName || member.customRole?.name || member.role.replace("_", " ");

                  const initial = (member.name || member.username || "S").charAt(0).toUpperCase();
                  const isActive = member.isActive !== false;

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Staff Member (Avatar + Name + Email) */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-none flex items-center justify-center font-black text-sm shrink-0 ${
                              isRootSuperAdmin
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-brand-primary/10 text-brand-primary"
                            }`}
                          >
                            {initial}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{member.name || member.username}</span>
                              {isRootSuperAdmin && (
                                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.2 rounded-none bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold border border-amber-300 dark:border-amber-800">
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
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-bold ${
                            isRootSuperAdmin
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                              : "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                          }`}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>{roleTitle}</span>
                        </span>
                      </td>

                      {/* Department / Branch */}
                      <td className="px-5 py-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {member.branchName || "Platform Headquarters (HQ)"}
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-400">
                        {member.phone || "—"}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-bold ${
                            isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-none ${
                              isActive ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          />
                          {isActive ? "Active" : "Disabled"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Edit Action */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(member)}
                            className="h-8 px-3 rounded-none text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Edit</span>
                          </button>

                          {/* Deactivate / Activate Action */}
                          {!isRootSuperAdmin && (
                            <button
                              type="button"
                              disabled={togglingId === member.id}
                              onClick={() => handleToggleStatus(member)}
                              className={`h-8 px-3 rounded-none text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                isActive
                                  ? "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                                  : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                              }`}
                            >
                              {togglingId === member.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Power className="h-3 w-3" />
                              )}
                              <span>{isActive ? "Disable" : "Enable"}</span>
                            </button>
                          )}

                          {/* Delete Action */}
                          {!isRootSuperAdmin && (
                            <button
                              type="button"
                              disabled={deletingId === member.id}
                              onClick={() => handleDeleteStaff(member)}
                              className="h-8 w-8 flex items-center justify-center rounded-none text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition cursor-pointer disabled:opacity-50"
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
          totalItems={staffList.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          alwaysShow={true}
          rounded="none"
        />
      </div>

      {/* Quick Add Modal (flat clean borders) */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-none max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Quick Add Staff</h3>
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-none cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAdd} className="p-5 space-y-4">
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-sm focus:outline-none focus:border-brand-primary"
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-sm focus:outline-none focus:border-brand-primary"
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-sm focus:outline-none focus:border-brand-primary font-mono"
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-sm font-semibold focus:outline-none focus:border-brand-primary cursor-pointer"
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-sm focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="px-4 py-2 rounded-none text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickSubmitting}
                  className="px-5 py-2 rounded-none text-xs sm:text-sm font-bold bg-brand-primary hover:bg-brand-primary-hover text-white shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {quickSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>Add Member</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal (flat clean borders) */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-none max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Edit Staff Member</h3>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-none cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-sm focus:outline-none focus:border-brand-primary"
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-sm focus:outline-none focus:border-brand-primary"
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-sm font-semibold focus:outline-none focus:border-brand-primary cursor-pointer"
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-sm focus:outline-none focus:border-brand-primary"
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-sm focus:outline-none focus:border-brand-primary font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-none text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-none text-xs sm:text-sm font-bold bg-brand-primary hover:bg-brand-primary-hover text-white shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
