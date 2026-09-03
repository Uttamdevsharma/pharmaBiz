"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import {
  KeyRound,
  ShieldCheck,
  Shield,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Users,
  X,
  RefreshCw,
  Building2,
  CreditCard,
  Layers,
  UserPlus,
  BarChart3,
  Palette,
  Database,
  CheckSquare,
  Square,
  Info,
} from "lucide-react";

interface CustomRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;
  userCount?: number;
  createdAt?: string;
}

interface RolesPermissionsTabProps {
  onNavigateToCreateStaff?: () => void;
}

const ALL_SUPER_ADMIN_PERMISSIONS = [
  {
    id: "pharmacies.manage",
    name: "Manage Pharmacies",
    category: "Pharmacies & Tenants",
    description: "View, inspect, activate, and suspend pharmacy tenant accounts.",
    icon: Building2,
  },
  {
    id: "subscriptions.manage",
    name: "Manage Subscriptions",
    category: "Subscriptions & Billing",
    description: "Manage tenant subscription lifecycle, renewals, and statuses.",
    icon: Layers,
  },
  {
    id: "plans.manage",
    name: "Manage Plans",
    category: "Subscriptions & Billing",
    description: "Create, configure, update, and manage pricing tiers and feature limits.",
    icon: CreditCard,
  },
  {
    id: "payments.view",
    name: "View Payments",
    category: "Subscriptions & Billing",
    description: "Inspect revenue transactions, payment statuses, and invoice records.",
    icon: CreditCard,
  },
  {
    id: "staff.create",
    name: "Create Staff",
    category: "Staff & Access Control",
    description: "Create new platform staff members and assign roles and permissions.",
    icon: UserPlus,
  },
  {
    id: "staff.manage",
    name: "Manage Staff",
    category: "Staff & Access Control",
    description: "Edit staff profiles, update permission matrix, toggle status, and delete staff.",
    icon: Users,
  },
  {
    id: "roles.manage",
    name: "Manage Roles & Permissions",
    category: "Staff & Access Control",
    description: "Create dynamic custom roles, edit permissions, and manage role assignments.",
    icon: KeyRound,
  },
  {
    id: "reports.view",
    name: "View Reports",
    category: "Platform Administration",
    description: "Access platform MRR, revenue growth analytics, and tenant reports.",
    icon: BarChart3,
  },
  {
    id: "settings.manage",
    name: "Manage System Settings",
    category: "Platform Administration",
    description: "Configure platform branding, landing page content, and global settings.",
    icon: Palette,
  },
  {
    id: "platform.data",
    name: "Manage Platform Data",
    category: "Platform Administration",
    description: "Access system telemetry, audit logs, and platform diagnostic data.",
    icon: Database,
  },
];

const CATEGORIES = [
  "Pharmacies & Tenants",
  "Subscriptions & Billing",
  "Staff & Access Control",
  "Platform Administration",
] as const;

export function RolesPermissionsTab({ onNavigateToCreateStaff }: RolesPermissionsTabProps) {
  const { isSuperAdmin, hasPermission } = useAuth();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });
  const [submittingForm, setSubmittingForm] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);

  const canManageRoles = isSuperAdmin || hasPermission("roles.manage");

  const loadRoles = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<CustomRole[]>("/super-admin/roles");
      if (res.success && res.data) {
        setRoles(res.data);
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to load dynamic roles" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleOpenCreate = () => {
    setEditingRole(null);
    setFormData({
      name: "",
      description: "",
      permissions: ["pharmacies.manage", "subscriptions.manage"],
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (role: CustomRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
      permissions: role.permissions || [],
    });
    setIsCreateModalOpen(true);
  };

  const handleTogglePermission = (permId: string) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(permId);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== permId)
          : [...prev.permissions, permId],
      };
    });
  };

  const handleSelectAllPerms = () => {
    setFormData((prev) => ({
      ...prev,
      permissions: ALL_SUPER_ADMIN_PERMISSIONS.map((p) => p.id),
    }));
  };

  const handleClearAllPerms = () => {
    setFormData((prev) => ({
      ...prev,
      permissions: [],
    }));
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setActionMsg({ type: "error", text: "Role name is required" });
      return;
    }

    try {
      setSubmittingForm(true);
      if (editingRole) {
        // Update existing role
        const res = await fetchApi(`/super-admin/roles/${editingRole.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            permissions: formData.permissions,
          }),
        });

        if (res.success) {
          setActionMsg({ type: "success", text: `Role "${formData.name}" was updated successfully.` });
          setIsCreateModalOpen(false);
          loadRoles();
        } else {
          setActionMsg({ type: "error", text: res.message || "Failed to update role" });
        }
      } else {
        // Create new role
        const res = await fetchApi("/super-admin/roles", {
          method: "POST",
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            permissions: formData.permissions,
          }),
        });

        if (res.success) {
          setActionMsg({ type: "success", text: `Custom role "${formData.name}" created successfully.` });
          setIsCreateModalOpen(false);
          loadRoles();
        } else {
          setActionMsg({ type: "error", text: res.message || "Failed to create custom role" });
        }
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Error saving role" });
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleDeleteRole = async (role: CustomRole) => {
    if (role.isSystem) {
      setActionMsg({ type: "error", text: "System protected roles cannot be deleted." });
      return;
    }

    if ((role.userCount || 0) > 0) {
      setActionMsg({
        type: "error",
        text: `Cannot delete "${role.name}" because ${role.userCount} staff member(s) are assigned to it.`,
      });
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete role "${role.name}"?`);
    if (!confirmed) return;

    try {
      setDeletingRoleId(role.id);
      const res = await fetchApi(`/super-admin/roles/${role.id}`, {
        method: "DELETE",
      });

      if (res.success) {
        setRoles((prev) => prev.filter((r) => r.id !== role.id));
        setActionMsg({ type: "success", text: `Role "${role.name}" was deleted successfully.` });
      } else {
        setActionMsg({ type: "error", text: res.message || "Failed to delete role" });
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Error deleting role" });
    } finally {
      setDeletingRoleId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Dynamic Roles & Permissions
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              {roles.length} Roles Configured
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create custom roles without hardcoded constraints and customize their baseline module permissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadRoles}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          {canManageRoles && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-brand-primary hover:bg-brand-primary/90 text-white shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              <span>Create Custom Role</span>
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

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Protected Super Admin Card */}
        <div className="bg-linear-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 p-6 rounded-2xl border border-amber-500/30 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h3 className="font-black text-lg text-slate-900 dark:text-white">Super Admin</h3>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500 text-white">
                ROOT MASTER
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Highest protected master role possessing unconditional full authority over all tenants, modules, and platform data.
            </p>
          </div>

          <div className="pt-3 border-t border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>Scope:</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">Full Root (10/10 Modules)</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>Immutability:</span>
              <span className="text-slate-500">Protected Invariant</span>
            </div>
          </div>
        </div>

        {/* Dynamic Roles Cards */}
        {roles.map((role) => {
          const permsCount = role.permissions?.length || 0;
          return (
            <div
              key={role.id}
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-brand-primary" />
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">{role.name}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {role.userCount || 0} Staff
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                  {role.description || "Custom dynamic platform role."}
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>Assigned Permissions:</span>
                  <span className="text-brand-primary font-bold">
                    {permsCount} / {ALL_SUPER_ADMIN_PERMISSIONS.length} Modules
                  </span>
                </div>

                {/* Badges preview */}
                <div className="flex flex-wrap gap-1 max-h-16 overflow-hidden">
                  {role.permissions?.slice(0, 3).map((p) => {
                    const matched = ALL_SUPER_ADMIN_PERMISSIONS.find((x) => x.id === p);
                    return (
                      <span
                        key={p}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      >
                        {matched?.name || p}
                      </span>
                    );
                  })}
                  {permsCount > 3 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-400">
                      +{permsCount - 3} more
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    disabled={!canManageRoles}
                    onClick={() => handleOpenEdit(role)}
                    className="flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:underline"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit Permissions</span>
                  </button>

                  {!role.isSystem && (
                    <button
                      type="button"
                      disabled={!canManageRoles || deletingRoleId === role.id}
                      onClick={() => handleDeleteRole(role)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                    >
                      {deletingRoleId === role.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create / Edit Role */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {editingRole ? `Edit Role: ${editingRole.name}` : "Create Custom Role"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Define role title, operational description, and default module permissions.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole}>
              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Role Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CTO, Project Manager, Support Lead, DevOps Engineer"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Role Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Technical oversight over platform telemetry, tenant states, and system settings."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                  />
                </div>

                {/* Permission Selection */}
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Default Role Permissions
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {formData.permissions.length} of {ALL_SUPER_ADMIN_PERMISSIONS.length} selected
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllPerms}
                        className="text-[11px] font-bold text-brand-primary hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={handleClearAllPerms}
                        className="text-[11px] font-bold text-slate-400 hover:text-slate-600"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ALL_SUPER_ADMIN_PERMISSIONS.map((perm) => {
                      const checked = formData.permissions.includes(perm.id);
                      return (
                        <div
                          key={perm.id}
                          onClick={() => handleTogglePermission(perm.id)}
                          className={`p-3 rounded-xl border cursor-pointer select-none transition flex items-start gap-2.5 ${
                            checked
                              ? "bg-brand-primary/5 border-brand-primary/50 text-slate-900 dark:text-white"
                              : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500"
                          }`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {checked ? (
                              <CheckSquare className="h-4 w-4 text-brand-primary" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold leading-tight">{perm.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{perm.description}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingForm}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-primary hover:bg-brand-primary/90 text-white shadow-sm transition flex items-center gap-2"
                >
                  {submittingForm ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span>{editingRole ? "Save Changes" : "Create Role"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
