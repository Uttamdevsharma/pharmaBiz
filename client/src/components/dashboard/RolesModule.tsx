"use client";

import React, { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import {
  ShieldCheck,
  Check,
  X,
  Lock,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Users,
  Settings,
  Package,
  ShoppingCart,
  Wallet,
  BarChart3,
  RefreshCw,
} from "lucide-react";

interface RoleDef {
  role: string;
  name: string;
  level: string;
  description: string;
}

interface PermissionDef {
  id: string;
  label: string;
  category: string;
}

export function RolesModule() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<RoleDef[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionDef[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("BRANCH_MANAGER");
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetchApi<any>("/users/roles/permissions");
      if (res.success && res.data) {
        setRoles(res.data.roles || []);
        setAllPermissions(res.data.allPermissions || []);
        setRolePermissions(res.data.activePermissions || {});
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load role permissions hierarchy");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTogglePermission = (permissionId: string) => {
    if (selectedRole === "COMPANY_OWNER" || selectedRole === "SUPER_ADMIN") return;

    const currentPerms = rolePermissions[selectedRole] || [];
    const exists = currentPerms.includes(permissionId);

    const updated = exists
      ? currentPerms.filter((p) => p !== permissionId)
      : [...currentPerms, permissionId];

    setRolePermissions({
      ...rolePermissions,
      [selectedRole]: updated,
    });
  };

  const handleSavePermissions = async () => {
    if (selectedRole === "COMPANY_OWNER" || selectedRole === "SUPER_ADMIN") return;

    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetchApi<any>("/users/roles/permissions", {
        method: "POST",
        body: JSON.stringify({
          role: selectedRole,
          permissions: rolePermissions[selectedRole] || [],
        }),
      });

      if (res.success) {
        setSuccessMsg(`Permissions successfully saved for ${selectedRole}!`);
      } else {
        setErrorMsg(res.message || "Failed to save permissions");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error saving permissions");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <span>Loading role security hierarchy...</span>
      </div>
    );
  }

  const selectedRoleObj = roles.find((r) => r.role === selectedRole) || roles[0];
  const activePermsForSelected = rolePermissions[selectedRole] || [];

  // Group permissions by category
  const categories = Array.from(new Set(allPermissions.map((p) => p.category)));

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-emerald-600" />
            Roles & Granular Permissions (RBAC)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure backend permissions per operational role for strict authorization and staff segregation.
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 self-start sm:self-auto"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Roles Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {roles.map((r) => {
          const isSelected = selectedRole === r.role;
          return (
            <button
              key={r.role}
              onClick={() => setSelectedRole(r.role)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shadow-xs ${
                isSelected
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 ring-2 ring-emerald-500"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {r.name}
            </button>
          );
        })}
      </div>

      {/* Selected Role Detail & Permissions Matrix */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              Role: {selectedRoleObj.role}
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {selectedRoleObj.name} Permissions
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{selectedRoleObj.description}</p>
          </div>

          {selectedRole !== "COMPANY_OWNER" && selectedRole !== "SUPER_ADMIN" ? (
            <button
              onClick={handleSavePermissions}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Role Permissions
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold">
              <Lock className="h-4 w-4" />
              Full System Access (Bypass)
            </div>
          )}
        </div>

        {/* Permissions Groups */}
        <div className="space-y-6">
          {categories.map((cat) => {
            const catPerms = allPermissions.filter((p) => p.category === cat);
            return (
              <div key={cat} className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  {cat} Capabilities
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catPerms.map((perm) => {
                    const isGranted =
                      selectedRole === "COMPANY_OWNER" ||
                      selectedRole === "SUPER_ADMIN" ||
                      activePermsForSelected.includes(perm.id);

                    const isLocked = selectedRole === "COMPANY_OWNER" || selectedRole === "SUPER_ADMIN";

                    return (
                      <div
                        key={perm.id}
                        onClick={() => !isLocked && handleTogglePermission(perm.id)}
                        className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                          isLocked ? "cursor-not-allowed opacity-90" : "cursor-pointer hover:border-slate-400"
                        } ${
                          isGranted
                            ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80"
                            : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{perm.label}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{perm.id}</div>
                        </div>

                        <div
                          className={`h-6 w-6 rounded-full flex items-center justify-center transition shrink-0 ${
                            isGranted
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                          }`}
                        >
                          {isGranted ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
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
  );
}
