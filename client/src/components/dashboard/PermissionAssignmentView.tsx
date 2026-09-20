"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import {
  PHARMACY_MODULE_PERMISSIONS,
  CATEGORIES,
  PermissionDef,
} from "@/lib/permissions";
import {
  CheckSquare,
  Square,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Search,
  Save,
  RotateCcw,
  X,
  Sliders,
} from "lucide-react";
import { PharmacyRole } from "./CreateRoleView";

export function PermissionAssignmentView() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<PharmacyRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Matrix state: roleId -> string[]
  const [rolePermissionsMap, setRolePermissionsMap] = useState<Record<string, string[]>>({});
  const [initialRolePermissionsMap, setInitialRolePermissionsMap] = useState<Record<string, string[]>>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isOwner = user?.role === "COMPANY_OWNER" || user?.role === "SUPER_ADMIN";

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<PharmacyRole[]>("/users/roles");
      if (res.success && res.data) {
        // Exclude Pharmacy Owner / Owner role from the permission assignment matrix
        const filteredRoles = res.data.filter(
          (role) =>
            role.name !== "Pharmacy Owner" &&
            role.name.toUpperCase() !== "COMPANY_OWNER" &&
            role.name.toUpperCase() !== "SUPER_ADMIN"
        );
        setRoles(filteredRoles);

        const permMap: Record<string, string[]> = {};
        filteredRoles.forEach((role) => {
          permMap[role.id] = role.permissions || [];
        });
        setRolePermissionsMap(permMap);
        setInitialRolePermissionsMap(JSON.parse(JSON.stringify(permMap)));
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to load roles" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Check if matrix has unsaved changes
  const isDirty = useMemo(() => {
    return JSON.stringify(rolePermissionsMap) !== JSON.stringify(initialRolePermissionsMap);
  }, [rolePermissionsMap, initialRolePermissionsMap]);

  // Toggle single permission for role
  const handleToggleCell = (roleId: string, permId: string) => {
    if (!isOwner) return;

    setRolePermissionsMap((prev) => {
      const currentPerms = prev[roleId] || [];
      const exists = currentPerms.includes(permId);
      const updated = exists
        ? currentPerms.filter((p) => p !== permId)
        : [...currentPerms, permId];

      return {
        ...prev,
        [roleId]: updated,
      };
    });
  };

  // Select All permissions for a role
  const handleSelectAllForRole = (roleId: string) => {
    if (!isOwner) return;
    const allPermIds = PHARMACY_MODULE_PERMISSIONS.map((p) => p.id);
    setRolePermissionsMap((prev) => ({
      ...prev,
      [roleId]: Array.from(new Set(allPermIds)),
    }));
  };

  // Clear All permissions for a role
  const handleClearAllForRole = (roleId: string) => {
    if (!isOwner) return;
    setRolePermissionsMap((prev) => ({
      ...prev,
      [roleId]: [],
    }));
  };

  // Reset to initial state
  const handleReset = () => {
    setRolePermissionsMap(JSON.parse(JSON.stringify(initialRolePermissionsMap)));
  };

  // Save changes to backend
  const handleSaveMatrix = async () => {
    if (!isOwner) return;
    try {
      setSaving(true);
      setActionMsg(null);

      const matrix = Object.keys(rolePermissionsMap).map((roleId) => ({
        roleId,
        permissions: rolePermissionsMap[roleId] || [],
      }));

      const res = await fetchApi("/users/roles/matrix", {
        method: "POST",
        body: JSON.stringify({ matrix }),
      });

      if (res.success) {
        setActionMsg({
          type: "success",
          text: "Permissions saved successfully.",
        });
        setInitialRolePermissionsMap(JSON.parse(JSON.stringify(rolePermissionsMap)));
      } else {
        setActionMsg({ type: "error", text: res.message || "Failed to save permissions" });
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Error saving permissions" });
    } finally {
      setSaving(false);
    }
  };

  // Filter permissions based on search query & selected category
  const filteredPermissions = useMemo(() => {
    return PHARMACY_MODULE_PERMISSIONS.filter((perm) => {
      const matchesSearch =
        perm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        perm.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = selectedCategory === "ALL" || perm.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [searchQuery, selectedCategory]);

  // Group filtered permissions by category
  const groupedPermissions = useMemo(() => {
    const map: Record<string, PermissionDef[]> = {};
    filteredPermissions.forEach((perm) => {
      if (!map[perm.category]) {
        map[perm.category] = [];
      }
      map[perm.category].push(perm);
    });
    return map;
  }, [filteredPermissions]);

  return (
    <div className="space-y-6 w-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
            <Sliders className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Permission Assignment
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading || saving}
            className="flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-bold bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition shadow-xs cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionMsg && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl text-sm font-bold transition-all ${
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
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Controls Bar: Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search permissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-11 pr-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:outline-none focus:border-brand-primary transition"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:outline-none focus:border-brand-primary cursor-pointer transition text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clean Permission Matrix Table */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
          <span className="text-sm font-bold">Loading matrix...</span>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto max-h-[72vh]">
            <table className="w-full text-left text-sm border-collapse">
              {/* Sticky Table Header */}
              <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-4 px-5 font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200 min-w-[280px] w-[320px]">
                    Permissions
                  </th>

                  {/* Role Column Headers */}
                  {roles.map((role) => (
                    <th
                      key={role.id}
                      className="p-4 text-center min-w-[170px] border-l-2 border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <div className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                          {role.name}
                        </div>

                        {/* Select All / Clear All buttons per role */}
                        {isOwner && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleSelectAllForRole(role.id)}
                              className="text-xs font-bold text-brand-primary hover:underline cursor-pointer"
                            >
                              Select All
                            </button>
                            <span className="text-slate-300 dark:text-slate-600">|</span>
                            <button
                              type="button"
                              onClick={() => handleClearAllForRole(role.id)}
                              className="text-xs font-bold text-slate-400 hover:text-red-500 cursor-pointer"
                            >
                              Clear All
                            </button>
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body Grouped by Category */}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {Object.keys(groupedPermissions).map((category) => {
                  const categoryPerms = groupedPermissions[category];
                  return (
                    <React.Fragment key={category}>
                      {/* Category Header Row */}
                      <tr className="bg-slate-50 dark:bg-slate-800/60">
                        <td
                          colSpan={roles.length + 1}
                          className="px-5 py-3 font-black uppercase text-xs tracking-wider text-slate-600 dark:text-slate-300"
                        >
                          {category}
                        </td>
                      </tr>

                      {/* Permissions Rows */}
                      {categoryPerms.map((perm) => (
                        <tr
                          key={perm.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Permission Name Only */}
                          <td className="px-5 py-4 font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {perm.name}
                          </td>

                          {/* Role Checkbox Cells */}
                          {roles.map((role) => {
                            const isChecked = (rolePermissionsMap[role.id] || []).includes(perm.id);

                            return (
                              <td
                                key={`${role.id}-${perm.id}`}
                                onClick={() => handleToggleCell(role.id, perm.id)}
                                className={`px-4 py-4 text-center align-middle border-l border-slate-100 dark:border-slate-800 cursor-pointer select-none transition ${
                                  isChecked ? "bg-brand-primary/5" : ""
                                }`}
                              >
                                <div className="flex items-center justify-center">
                                  {isChecked ? (
                                    <CheckSquare className="h-5 w-5 text-brand-primary" />
                                  ) : (
                                    <Square className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sticky Bottom Save Action Bar */}
      {isOwner && isDirty && (
        <div className="sticky bottom-4 z-30 p-4 px-6 rounded-2xl bg-slate-900 text-white shadow-2xl flex items-center justify-between gap-4 border border-slate-800">
          <div>
            <div className="font-black text-base text-white">Unsaved Changes</div>
            <div className="text-xs text-slate-400 font-medium">
              Save changes to update staff role permissions.
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="h-11 px-5 rounded-xl text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
            >
              Reset
            </button>

            <button
              onClick={handleSaveMatrix}
              disabled={saving}
              className="h-11 px-6 rounded-xl text-sm font-black bg-brand-primary hover:bg-brand-primary/90 text-white shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{saving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
