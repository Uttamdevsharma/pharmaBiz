"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import {
  ShieldCheck,
  KeyRound,
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
  LayoutDashboard,
  ShoppingCart,
  History,
  Percent,
  Package,
  Boxes,
  Truck,
  Wallet,
  Building2,
  CheckSquare,
  Square,
  Sparkles,
  Receipt,
  Briefcase,
  DollarSign,
  CalendarCheck,
  Lock,
  FolderTree,
} from "lucide-react";

interface PharmacyRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;
  userCount?: number;
  createdAt?: string;
}

import {
  PHARMACY_MODULE_PERMISSIONS,
  CATEGORIES,
  CategoryType,
  PermissionDef,
} from "@/lib/permissions";

function getPermissionIcon(permId: string, category: string): React.ComponentType<{ className?: string }> {
  switch (category) {
    case "Dashboard":
      return LayoutDashboard;
    case "Sales & POS":
      if (permId === "pos.history") return History;
      if (permId === "pos.vat") return Percent;
      if (permId === "accounts.payment_sales") return Wallet;
      if (permId === "accounts.product_sales") return Package;
      if (permId === "accounts.reports") return LayoutDashboard;
      return ShoppingCart;
    case "Category Management":
      return FolderTree;
    case "Inventory":
      if (permId === "inventory.add_product") return Plus;
      return Boxes;
    case "Stock Management":
      if (permId.includes("history")) return History;
      if (permId.includes("add")) return Plus;
      if (permId.includes("damaged")) return AlertCircle;
      if (permId.includes("transfer")) return RefreshCw;
      return Boxes;
    case "Location Management":
      if (permId.includes("create")) return Plus;
      return Boxes;
    case "Supplier Management":
      if (permId.includes("history")) return Receipt;
      if (permId.includes("due") || permId.includes("payment")) return DollarSign;
      if (permId.includes("contact")) return Users;
      return Truck;
    case "Accounts & Finance":
      if (permId.includes("history")) return History;
      if (permId.includes("transfer")) return RefreshCw;
      if (permId.includes("due")) return DollarSign;
      return Wallet;
    case "Expenses & Bills":
      if (permId.includes("history")) return History;
      if (permId.includes("pay")) return DollarSign;
      return Receipt;
    case "Employee & Salary":
      if (permId.includes("history")) return History;
      if (permId.includes("attendance") || permId.includes("offday")) return CalendarCheck;
      if (permId.includes("deduction")) return Percent;
      if (permId.includes("base_salary")) return Lock;
      if (permId.includes("manage")) return Briefcase;
      return Users;
    case "Staff Management":
      if (permId.includes("role")) return KeyRound;
      if (permId.includes("create")) return Plus;
      return Users;
    case "Branch Network & Settings":
      return Building2;
    default:
      return Shield;
  }
}

export function RolesModule() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<PharmacyRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<PharmacyRole | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isOwner = user?.role === "COMPANY_OWNER" || user?.role === "SUPER_ADMIN";

  const loadRoles = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<PharmacyRole[]>("/users/roles");
      if (res.success && res.data) {
        setRoles(res.data);
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to load roles" });
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
      permissions: ["dashboard.view", "pos.manage", "pos.history"],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role: PharmacyRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
      permissions: role.permissions || [],
    });
    setIsModalOpen(true);
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

  const handleToggleCategory = (category: string) => {
    const catPerms = PHARMACY_MODULE_PERMISSIONS.filter((p) => p.category === category).map((p) => p.id);
    const allSelected = catPerms.every((p) => formData.permissions.includes(p));

    if (allSelected) {
      setFormData((prev) => ({
        ...prev,
        permissions: prev.permissions.filter((p) => !catPerms.includes(p)),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        permissions: Array.from(new Set([...prev.permissions, ...catPerms])),
      }));
    }
  };

  const handleSelectAll = () => {
    setFormData((prev) => ({
      ...prev,
      permissions: PHARMACY_MODULE_PERMISSIONS.map((p) => p.id),
    }));
  };

  const handleClearAll = () => {
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
      setSubmitting(true);
      if (editingRole) {
        // Update existing role
        const res = await fetchApi(`/users/roles/${editingRole.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            permissions: formData.permissions,
          }),
        });

        if (res.success) {
          setActionMsg({ type: "success", text: `Role "${formData.name}" updated successfully.` });
          setIsModalOpen(false);
          await loadRoles();
        } else {
          setActionMsg({ type: "error", text: res.message || "Failed to update role" });
        }
      } else {
        // Create custom role
        const res = await fetchApi("/users/roles", {
          method: "POST",
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            permissions: formData.permissions,
          }),
        });

        if (res.success) {
          setActionMsg({ type: "success", text: `Custom role "${formData.name}" created successfully.` });
          setIsModalOpen(false);
          await loadRoles();
        } else {
          setActionMsg({ type: "error", text: res.message || "Failed to create custom role" });
        }
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Error saving role" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (role: PharmacyRole) => {
    if (role.isSystem) {
      setActionMsg({ type: "error", text: "Default system roles cannot be deleted." });
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
      setDeletingId(role.id);
      const res = await fetchApi(`/users/roles/${role.id}`, {
        method: "DELETE",
      });

      if (res.success) {
        setRoles((prev) => prev.filter((r) => r.id !== role.id));
        setActionMsg({ type: "success", text: `Role "${role.name}" deleted successfully.` });
      } else {
        setActionMsg({ type: "error", text: res.message || "Failed to delete role" });
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Error deleting role" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Roles & Permissions
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Create custom roles and configure granular sidebar module permissions for your pharmacy staff.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadRoles}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          {isOwner && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-brand-primary hover:bg-brand-primary/90 text-white shadow-sm transition"
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
          className={`flex items-center justify-between p-4 rounded-xl text-xs font-medium transition-all ${
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
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Roles Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-brand-primary" />
          <span className="text-xs font-medium">Loading pharmacy role matrix...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Pharmacy Owner Master Card */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 p-6 rounded-2xl border border-emerald-500/30 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-black text-base text-slate-900 dark:text-white">Pharmacy Owner</h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-600 text-white">
                  ROOT OWNER
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Full authority over all pharmacy branches, revenue records, staff credentials, subscriptions, and system settings.
              </p>
            </div>

            <div className="pt-3 border-t border-emerald-500/20 space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-semibold text-slate-600 dark:text-slate-300">
                <span>Access Scope:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Unconditional Full Access</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Authority:</span>
                <span>Tenant Administrator</span>
              </div>
            </div>
          </div>

          {/* Dynamic & Default Pharmacy Roles */}
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
                      <KeyRound className="h-4 w-4 text-brand-primary" />
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">{role.name}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {role.userCount || 0} Staff
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {role.description || "Custom dynamic pharmacy role."}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span>Permitted Modules:</span>
                    <span className="text-brand-primary font-bold">
                      {permsCount} / {PHARMACY_MODULE_PERMISSIONS.length} Modules
                    </span>
                  </div>

                  {/* Badges preview */}
                  <div className="flex flex-wrap gap-1 max-h-14 overflow-hidden">
                    {role.permissions?.slice(0, 3).map((p) => {
                      const matched = PHARMACY_MODULE_PERMISSIONS.find((x) => x.id === p);
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
                      disabled={!isOwner}
                      onClick={() => handleOpenEdit(role)}
                      className="flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:underline"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit Role & Permissions</span>
                    </button>

                    {!role.isSystem && isOwner && (
                      <button
                        type="button"
                        disabled={deletingId === role.id}
                        onClick={() => handleDeleteRole(role)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                      >
                        {deletingId === role.id ? (
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
      )}

      {/* Modal: Create / Edit Role */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {editingRole ? `Edit Role: ${editingRole.name}` : "Create Custom Role"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Define role title, operational description, and allowed sidebar module permissions.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
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
                    placeholder="e.g. Senior Pharmacist, Procurement Lead, Shift Supervisor"
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
                    placeholder="e.g. Responsible for daily counter checkout, FEFO dispensing, and batch tracking."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                  />
                </div>

                {/* Categorized Permissions Matrix */}
                <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Sidebar Modules & Action Permissions
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {formData.permissions.length} of {PHARMACY_MODULE_PERMISSIONS.length} selected
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-[11px] font-bold text-brand-primary hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="text-[11px] font-bold text-slate-400 hover:text-slate-600"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {CATEGORIES.map((cat) => {
                      const catPerms = PHARMACY_MODULE_PERMISSIONS.filter((p) => p.category === cat);
                      const allCatSelected = catPerms.every((p) => formData.permissions.includes(p.id));

                      return (
                        <div key={cat} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                              {cat}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleCategory(cat)}
                              className="text-[10px] font-bold text-slate-400 hover:text-brand-primary"
                            >
                              {allCatSelected ? "Deselect Group" : "Select Group"}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {catPerms.map((perm) => {
                              const checked = formData.permissions.includes(perm.id);
                              const Icon = getPermissionIcon(perm.id, perm.category);
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
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                                      <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                      <span className="truncate">{perm.name}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                                      {perm.description}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
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
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-primary hover:bg-brand-primary/90 text-white shadow-sm transition flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
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
