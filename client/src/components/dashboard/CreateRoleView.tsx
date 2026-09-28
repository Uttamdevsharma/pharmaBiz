"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import {
  ShieldPlus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Power,
  X,
  Shield,
  KeyRound,
} from "lucide-react";
import { Pagination } from "@/components/common/Pagination";

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

  // Inline form state (Role Name ONLY, no description)
  const [editingRole, setEditingRole] = useState<PharmacyRole | null>(null);
  const [roleName, setRoleName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const formRef = useRef<HTMLDivElement>(null);

  const isOwner = user?.role === "COMPANY_OWNER" || user?.role === "SUPER_ADMIN";

  const loadRoles = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<PharmacyRole[]>("/users/roles");
      if (res.success && res.data) {
        // Exclude system roles (Owner role), only keep custom roles created by the user
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

  const handleStartEdit = (role: PharmacyRole) => {
    setEditingRole(role);
    setRoleName(role.name);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleCancelEdit = () => {
    setEditingRole(null);
    setRoleName("");
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
        // Update existing custom role
        const res = await fetchApi(`/users/roles/${editingRole.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: trimmed,
          }),
        });

        if (res.success) {
          setActionMsg({ type: "success", text: `Role updated to "${trimmed}".` });
          handleCancelEdit();
          await loadRoles();
        } else {
          setActionMsg({ type: "error", text: res.message || "Failed to update role" });
        }
      } else {
        // Create new custom role
        const res = await fetchApi("/users/roles", {
          method: "POST",
          body: JSON.stringify({
            name: trimmed,
            permissions: [],
            isActive: true,
          }),
        });

        if (res.success) {
          setActionMsg({ type: "success", text: `Role "${trimmed}" created successfully.` });
          handleCancelEdit();
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
    const confirmed = window.confirm(`Are you sure you want to delete role "${role.name}"?`);
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

  // Only display custom roles created by the user (owner system role excluded)
  const totalPages = Math.ceil(customRoles.length / pageSize) || 1;
  const paginatedRoles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return customRoles.slice(start, start + pageSize);
  }, [customRoles, currentPage, pageSize]);

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
            <KeyRound className="h-7 w-7 text-brand-primary" />
            <span>Create & Manage Roles</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Define custom roles for your pharmacy staff. Permissions can be assigned under Permission Assignment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadRoles}
            disabled={loading}
            className="h-10 px-4 rounded-lg text-xs sm:text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionMsg && (
        <div
          className={`flex items-center justify-between p-4 rounded-lg text-xs font-semibold transition-all ${
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

      {/* INLINE FORM: Create / Edit Role Name (No popup modal, no description field) */}
      {isOwner && (
        <div
          ref={formRef}
          className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs"
        >
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldPlus className="h-5 w-5 text-brand-primary" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {editingRole ? `Edit Role: ${editingRole.name}` : "Create New Role"}
              </h2>
            </div>
            {editingRole && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSaveRole} className="space-y-4">
            <div className="max-w-md">
              <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Role Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Senior Pharmacist, Cashier, Inventory Manager"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="w-full h-11 px-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-primary"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="h-10 px-6 rounded-lg text-xs sm:text-sm font-bold bg-brand-primary hover:bg-brand-primary-hover text-white transition flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldPlus className="h-4 w-4" />}
                <span>{editingRole ? "Update Role" : "Create Role"}</span>
              </button>
              {editingRole && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="h-10 px-4 rounded-lg text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Roles List Table with Skeleton Loading & Pagination */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="h-4 w-4 text-brand-primary" />
            <span>Created Roles ({customRoles.length})</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {loading ? (
          /* Animated Skeleton Table */
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse flex items-center justify-between py-3.5 px-4 border border-slate-100 dark:border-slate-800/80 rounded-lg bg-slate-50/50 dark:bg-slate-800/30"
              >
                <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded-sm" />
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="h-8 w-28 bg-slate-200 dark:bg-slate-700 rounded-lg" />
              </div>
            ))}
          </div>
        ) : customRoles.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Shield className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No custom roles created yet</p>
            <p className="text-xs text-slate-400 mt-1">Use the form above to create your first pharmacy role.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Role Name</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                {paginatedRoles.map((role) => {
                  const isActive = role.isActive !== false;

                  return (
                    <tr
                      key={role.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                        <span>{role.name}</span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          />
                          {isActive ? "Active" : "Disabled"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {isOwner && (
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(role)}
                              className="h-8 px-3 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1"
                            >
                              <Edit2 className="h-3 w-3" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              disabled={togglingId === role.id}
                              onClick={() => handleToggleStatus(role)}
                              className={`h-8 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                isActive
                                  ? "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                                  : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                              }`}
                            >
                              {togglingId === role.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Power className="h-3 w-3" />
                              )}
                              <span>{isActive ? "Disable" : "Enable"}</span>
                            </button>

                            <button
                              type="button"
                              disabled={deletingId === role.id}
                              onClick={() => handleDeleteRole(role)}
                              className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition disabled:opacity-50"
                              title="Delete Role"
                            >
                              {deletingId === role.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
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

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={customRoles.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          alwaysShow={true}
        />
      </div>
    </div>
  );
}
