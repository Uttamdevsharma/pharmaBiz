"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Power,
  X,
} from "lucide-react";

export interface PharmacyRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;
  isActive?: boolean;
  userCount?: number;
  createdAt?: string;
}

export function CreateRoleView() {
  const { user } = useAuth();
  const [customRoles, setCustomRoles] = useState<PharmacyRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal state for Create / Edit role (Role Name ONLY)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<PharmacyRole | null>(null);
  const [roleName, setRoleName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isOwner = user?.role === "COMPANY_OWNER" || user?.role === "SUPER_ADMIN";

  const loadRoles = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<PharmacyRole[]>("/users/roles");
      if (res.success && res.data) {
        // Only load custom roles created by the owner (exclude pre-created system roles)
        const customOnly = res.data.filter((r) => !r.isSystem);
        setCustomRoles(customOnly);
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
    setRoleName("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role: PharmacyRole) => {
    setEditingRole(role);
    setRoleName(role.name);
    setIsModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = roleName.trim();
    if (!trimmed) {
      setActionMsg({ type: "error", text: "Role name is required." });
      return;
    }

    try {
      setSubmitting(true);
      if (editingRole) {
        // Update existing custom role name
        const res = await fetchApi(`/users/roles/${editingRole.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: trimmed,
          }),
        });

        if (res.success) {
          setActionMsg({ type: "success", text: `Role updated to "${trimmed}".` });
          setIsModalOpen(false);
          await loadRoles();
        } else {
          setActionMsg({ type: "error", text: res.message || "Failed to update role" });
        }
      } else {
        // Create custom role with no pre-selected permissions
        const res = await fetchApi("/users/roles", {
          method: "POST",
          body: JSON.stringify({
            name: trimmed,
            permissions: [], // Start with no permissions
            isActive: true,
          }),
        });

        if (res.success) {
          setActionMsg({ type: "success", text: `Role "${trimmed}" created successfully.` });
          setIsModalOpen(false);
          await loadRoles();
        } else {
          setActionMsg({ type: "error", text: res.message || "Failed to create role" });
        }
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Error saving role" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (role: PharmacyRole) => {
    const nextStatus = role.isActive === false;
    try {
      setTogglingId(role.id);
      const res = await fetchApi(`/users/roles/${role.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          isActive: nextStatus,
        }),
      });

      if (res.success) {
        setCustomRoles((prev) =>
          prev.map((r) => (r.id === role.id ? { ...r, isActive: nextStatus } : r))
        );
        setActionMsg({
          type: "success",
          text: `Role "${role.name}" ${nextStatus ? "enabled" : "disabled"}.`,
        });
      } else {
        setActionMsg({ type: "error", text: res.message || "Failed to update status" });
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Error updating status" });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteRole = async (role: PharmacyRole) => {
    const confirmed = window.confirm(`Delete role "${role.name}"?`);
    if (!confirmed) return;

    try {
      setDeletingId(role.id);
      const res = await fetchApi(`/users/roles/${role.id}`, {
        method: "DELETE",
      });

      if (res.success) {
        setCustomRoles((prev) => prev.filter((r) => r.id !== role.id));
        setActionMsg({ type: "success", text: `Role "${role.name}" deleted.` });
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
    <div className="space-y-6 w-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-1">
            <span>Staff Management</span>
            <span>/</span>
            <span>Role Management</span>
            <span>/</span>
            <span className="text-brand-primary">Create Role</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Power className="h-7 w-7 text-brand-primary" />
            <span>Create & Manage Roles</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadRoles}
            disabled={loading}
            className="h-11 px-5 rounded-xl text-sm font-bold bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          {isOwner && (
            <button
              onClick={handleOpenCreate}
              className="h-11 px-5 rounded-xl text-sm font-bold bg-brand-primary hover:bg-brand-primary-hover text-white shadow-sm transition flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Role</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Notification */}
      {actionMsg && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl text-xs font-semibold transition-all ${
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

      {/* Roles List Table */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
          <span className="text-sm font-semibold">Loading roles...</span>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-black uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Role Name</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
              {/* Permanent Pharmacy Owner Role */}
              <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white text-base">
                  Pharmacy Owner
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Default System Role
                </td>
              </tr>

              {/* Custom Roles Created by Owner */}
              {customRoles.map((role) => {
                const isActive = role.isActive !== false;
                return (
                  <tr
                    key={role.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white text-base">
                      {role.name}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isActive ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                        {isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isOwner && (
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(role)}
                            className="h-9 px-3.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition flex items-center gap-1.5"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            disabled={togglingId === role.id}
                            onClick={() => handleToggleStatus(role)}
                            className={`h-9 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                              isActive
                                ? "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                            }`}
                          >
                            {togglingId === role.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Power className="h-3.5 w-3.5" />
                            )}
                            <span>{isActive ? "Disable" : "Enable"}</span>
                          </button>

                          <button
                            type="button"
                            disabled={deletingId === role.id}
                            onClick={() => handleDeleteRole(role)}
                            className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition disabled:opacity-50"
                            title="Delete Role"
                          >
                            {deletingId === role.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
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

      {/* Modal: Create / Edit Role Name ONLY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-black text-xl text-slate-900 dark:text-white">
                {editingRole ? "Edit Role" : "Create Role"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole}>
              <div className="p-6">
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Role Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Senior Pharmacist"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="w-full h-12 px-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-11 px-5 rounded-xl text-sm font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 px-6 rounded-xl text-sm font-black bg-brand-primary hover:bg-brand-primary-hover text-white shadow-sm transition flex items-center gap-2"
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
