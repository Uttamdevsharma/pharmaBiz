"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Loader2,
  KeyRound,
  Shield,
  Eye,
  Lock,
  X,
  RefreshCw,
  SlidersHorizontal,
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
}

interface StaffListTabProps {
  onNavigateToCreate?: () => void;
}

const ALL_AVAILABLE_PERMISSIONS: { id: string; name: string; category: string }[] = [
  { id: "pharmacies.manage", name: "Manage Pharmacies", category: "Pharmacies & Tenants" },
  { id: "subscriptions.manage", name: "Manage Subscriptions", category: "Subscriptions & Billing" },
  { id: "plans.manage", name: "Manage Plans", category: "Subscriptions & Billing" },
  { id: "payments.view", name: "View Payments", category: "Subscriptions & Billing" },
  { id: "reports.view", name: "View Reports", category: "Analytics & Telemetry" },
  { id: "staff.create", name: "Create Staff", category: "Staff & Access Control" },
  { id: "staff.manage", name: "Manage Staff", category: "Staff & Access Control" },
  { id: "roles.manage", name: "Manage Roles & Permissions", category: "Staff & Access Control" },
  { id: "settings.manage", name: "Manage System Settings", category: "Platform Administration" },
  { id: "platform.data", name: "Manage Platform Data", category: "Platform Administration" },
];

export function StaffListTab({ onNavigateToCreate }: StaffListTabProps) {
  const { isSuperAdmin, hasPermission, user: currentUser } = useAuth();
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Notifications
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals
  const [selectedStaffForPerms, setSelectedStaffForPerms] = useState<StaffUser | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    password: "",
    permissions: [] as string[],
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

  const handleToggleStatus = async (staff: StaffUser) => {
    if (staff.role === "SUPER_ADMIN") {
      setActionMsg({ type: "error", text: "Super Admin account cannot be deactivated." });
      return;
    }
    if (!canManageStaff) {
      setActionMsg({ type: "error", text: "You do not have permission to manage staff status." });
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
          text: `Staff member ${staff.name || staff.username} has been ${!staff.isActive ? "activated" : "deactivated"}.`,
        });
      } else {
        setActionMsg({ type: "error", text: res.message || "Failed to update staff status" });
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Error updating status" });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteStaff = async (staff: StaffUser) => {
    if (staff.role === "SUPER_ADMIN") {
      setActionMsg({ type: "error", text: "Super Admin root account cannot be deleted." });
      return;
    }
    if (!canManageStaff) {
      setActionMsg({ type: "error", text: "You do not have permission to delete staff." });
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to remove ${staff.name || staff.username}? This action is irreversible.`);
    if (!confirmed) return;

    try {
      setDeletingId(staff.id);
      const res = await fetchApi(`/super-admin/staff/${staff.id}`, {
        method: "DELETE",
      });

      if (res.success) {
        setStaffList((prev) => prev.filter((s) => s.id !== staff.id));
        setActionMsg({ type: "success", text: `Staff member ${staff.name || staff.username} was successfully removed.` });
      } else {
        setActionMsg({ type: "error", text: res.message || "Failed to remove staff member" });
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Error deleting staff member" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenEdit = (staff: StaffUser) => {
    setEditingStaff(staff);
    setEditFormData({
      name: staff.name || "",
      email: staff.email || "",
      phone: staff.phone || "",
      role: staff.customRoleId || staff.customRoleName || staff.role,
      password: "",
      permissions: staff.permissions || [],
    });
  };

  const handleRoleChangeInEdit = (roleIdOrName: string) => {
    const selectedRole = roles.find((r) => r.id === roleIdOrName || r.name === roleIdOrName);
    setEditFormData((prev) => ({
      ...prev,
      role: roleIdOrName,
      permissions: selectedRole?.permissions || prev.permissions,
    }));
  };

  const handleTogglePermissionInEdit = (permId: string) => {
    setEditFormData((prev) => {
      const exists = prev.permissions.includes(permId);
      const newPerms = exists
        ? prev.permissions.filter((p) => p !== permId)
        : [...prev.permissions, permId];
      return { ...prev, permissions: newPerms };
    });
  };

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
        permissions: editFormData.permissions,
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

  // Filter staff
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.customRoleName || s.role || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole =
      roleFilter === "ALL" ||
      s.role === roleFilter ||
      s.customRoleName === roleFilter ||
      s.customRoleId === roleFilter;

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && s.isActive) ||
      (statusFilter === "INACTIVE" && !s.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalStaffCount = staffList.length;
  const activeStaffCount = staffList.filter((s) => s.isActive).length;
  const customRoleCount = roles.length;

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Platform Staff Directory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-primary/10 text-brand-primary">
              {totalStaffCount} Members
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage administrative delegates, dynamic roles, and granular permission access.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          {canCreateStaff && onNavigateToCreate && (
            <button
              onClick={onNavigateToCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-brand-primary hover:bg-brand-primary/90 text-white shadow-sm transition"
            >
              <UserPlus className="h-4 w-4" />
              <span>Create Staff Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {actionMsg && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl text-sm font-medium transition-all ${
            actionMsg.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionMsg.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500 shrink-0" />
            )}
            <span>{actionMsg.text}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Staff</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalStaffCount}</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Access</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeStaffCount}</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Custom Roles</p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{customRoleCount}</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600">
            <KeyRound className="h-6 w-6" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Root Security</p>
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">Super Admin Invariant</p>
            <p className="text-[11px] text-slate-400">Master role is protected</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
            <Shield className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, role..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              {roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Deactivated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-brand-primary" />
            <span className="text-sm font-medium">Loading Platform Staff directory...</span>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-base font-bold text-slate-700 dark:text-slate-300">No staff members found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="table-responsive-container">
            <table className="w-full min-w-[750px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Dynamic Role</th>
                  <th className="py-3.5 px-4">Granted Permissions</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created On</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {filteredStaff.map((staff) => {
                  const isRootSuperAdmin = staff.role === "SUPER_ADMIN";
                  const roleTitle = isRootSuperAdmin ? "Super Admin" : staff.customRoleName || staff.customRole?.name || staff.role;
                  const permsCount = isRootSuperAdmin ? ALL_AVAILABLE_PERMISSIONS.length : (staff.permissions?.length || 0);

                  return (
                    <tr
                      key={staff.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Name / User Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                              isRootSuperAdmin
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-brand-primary/10 text-brand-primary"
                            }`}
                          >
                            {(staff.name || staff.username || "S").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{staff.name || staff.username}</span>
                              {isRootSuperAdmin && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                                  MASTER
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">{staff.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Dynamic Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            isRootSuperAdmin
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                              : roleTitle === "CTO"
                              ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20"
                              : roleTitle === "Project Manager"
                              ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>{roleTitle}</span>
                        </span>
                      </td>

                      {/* Granted Permissions */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => setSelectedStaffForPerms(staff)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                        >
                          <KeyRound className="h-3.5 w-3.5 text-brand-primary" />
                          <span>
                            {isRootSuperAdmin
                              ? "Full Root Access (10/10)"
                              : `${permsCount} / ${ALL_AVAILABLE_PERMISSIONS.length} Permissions`}
                          </span>
                          <Eye className="h-3 w-3 text-slate-400 ml-0.5" />
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          disabled={isRootSuperAdmin || !canManageStaff || togglingId === staff.id}
                          onClick={() => handleToggleStatus(staff)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold transition ${
                            staff.isActive
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:opacity-80"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:opacity-80"
                          } ${isRootSuperAdmin ? "cursor-not-allowed opacity-90" : "cursor-pointer"}`}
                        >
                          {togglingId === staff.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : staff.isActive ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-rose-500" />
                          )}
                          <span>{staff.isActive ? "Active" : "Suspended"}</span>
                        </button>
                      </td>

                      {/* Created On */}
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {new Date(staff.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit Details & Permissions */}
                          <button
                            type="button"
                            disabled={!canManageStaff && !isSuperAdmin}
                            onClick={() => handleOpenEdit(staff)}
                            title="Edit Staff & Permissions"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-brand-primary transition"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          {/* Delete */}
                          {!isRootSuperAdmin && (
                            <button
                              type="button"
                              disabled={!canManageStaff || deletingId === staff.id}
                              onClick={() => handleDeleteStaff(staff)}
                              title="Delete Staff Member"
                              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 transition"
                            >
                              {deletingId === staff.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
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
        )}
      </div>

      {/* Permissions View Popover Modal */}
      {selectedStaffForPerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Assigned Permissions
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedStaffForPerms.name || selectedStaffForPerms.username} •{" "}
                    <span className="font-semibold text-brand-primary">
                      {selectedStaffForPerms.role === "SUPER_ADMIN"
                        ? "Super Admin (Root)"
                        : selectedStaffForPerms.customRoleName || selectedStaffForPerms.role}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaffForPerms(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 max-h-[65vh] overflow-y-auto space-y-3">
              {selectedStaffForPerms.role === "SUPER_ADMIN" ? (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-amber-600" />
                    Unrestricted Root Authority
                  </div>
                  <p>
                    Super Admin possesses unconditional root bypass permissions over all platform modules and features.
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ALL_AVAILABLE_PERMISSIONS.map((perm) => {
                  const hasPerm =
                    selectedStaffForPerms.role === "SUPER_ADMIN" ||
                    selectedStaffForPerms.permissions.includes("*") ||
                    selectedStaffForPerms.permissions.includes(perm.id);

                  return (
                    <div
                      key={perm.id}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 transition ${
                        hasPerm
                          ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-slate-900 dark:text-slate-100"
                          : "bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-400 opacity-60"
                      }`}
                    >
                      {hasPerm ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="text-xs font-bold leading-tight">{perm.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{perm.category}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStaffForPerms(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff & Permissions Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Edit Staff & Permissions
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update role assignment, profile data, or fine-tune module permissions.
                </p>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Assigned Role
                    </label>
                    {editingStaff.role === "SUPER_ADMIN" ? (
                      <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-200">
                        Super Admin (Protected Master Role)
                      </div>
                    ) : (
                      <select
                        value={editFormData.role}
                        onChange={(e) => handleRoleChangeInEdit(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer font-semibold"
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reset Password (leave blank to keep existing)
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                {/* Role Inheritance Information Notice */}
                {editingStaff.role !== "SUPER_ADMIN" && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                    <KeyRound className="h-4 w-4 text-brand-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">Role-Based Permission Management: </span>
                      Permissions are configured per role in the Roles & Permissions section. This staff member automatically inherits all permissions assigned to their selected role.
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-primary hover:bg-brand-primary/90 text-white shadow-sm transition flex items-center gap-2"
                >
                  {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
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

