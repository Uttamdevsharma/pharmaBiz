"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import {
  UserPlus,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Users,
  ArrowLeft,
  Sparkles,
  Info,
} from "lucide-react";

interface CustomRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
}

interface CreateStaffTabProps {
  onSuccess?: () => void;
  onNavigateToList?: () => void;
  onNavigateToRoles?: () => void;
}

export function CreateStaffTab({ onSuccess, onNavigateToList, onNavigateToRoles }: CreateStaffTabProps) {
  const { isSuperAdmin } = useAuth();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load existing roles from backend
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoadingRoles(true);
        const res = await fetchApi<CustomRole[]>("/super-admin/roles");
        if (res.success && res.data && res.data.length > 0) {
          setRoles(res.data);
          // Default to first role (e.g. CTO or Project Manager)
          setSelectedRole(res.data[0].id);
        }
      } catch (err: any) {
        console.error("Failed to load roles", err);
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchRoles();
  }, []);

  const selectedRoleObj = roles.find((r) => r.id === selectedRole || r.name === selectedRole);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim() || !email.trim() || !password.trim() || !selectedRole) {
      setErrorMsg("Please complete all required fields (Name, Email, Password, Role).");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetchApi<{ id: string; name: string }>("/super-admin/staff", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          username: email.trim(),
          phone: phone.trim() || undefined,
          password: password.trim(),
          role: selectedRole,
        }),
      });

      if (res.success) {
        setSuccessMsg(`Platform staff member "${name}" was created successfully.`);
        // Reset form
        setName("");
        setEmail("");
        setPassword("");
        setPhone("");
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1000);
        } else if (onNavigateToList) {
          setTimeout(() => {
            onNavigateToList();
          }, 1000);
        }
      } else {
        setErrorMsg(res.message || "Failed to create staff member");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred while creating staff member");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {onNavigateToList && (
              <button
                type="button"
                onClick={onNavigateToList}
                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Create Staff Member
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Add a new platform staff member and assign their dynamic role.
          </p>
        </div>

        {onNavigateToList && (
          <button
            type="button"
            onClick={onNavigateToList}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
          >
            <Users className="h-4 w-4" />
            <span>Staff List</span>
          </button>
        )}
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl text-sm font-medium bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl text-sm font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Staff Information Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="h-9 w-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Staff Member Information</h3>
            <p className="text-xs text-slate-400">Enter personal credentials and select a role</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. sarah@pharmabiz.com"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1 555-0199"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          {/* Role Selector */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Select Role <span className="text-red-500">*</span>
              </label>
              {onNavigateToRoles && (
                <button
                  type="button"
                  onClick={onNavigateToRoles}
                  className="text-[11px] font-bold text-brand-primary hover:underline flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Manage Roles & Permissions</span>
                </button>
              )}
            </div>
            <select
              required
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              disabled={loadingRoles}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
            >
              {loadingRoles ? (
                <option>Loading roles...</option>
              ) : (
                roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.description ? `— ${r.description}` : ""}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Role & Permissions Inheritance Information Notice */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
            <KeyRound className="h-4 w-4" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>Automatic Role Permissions Inheritance</span>
              {selectedRoleObj && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-primary/10 text-brand-primary">
                  {selectedRoleObj.name} ({selectedRoleObj.permissions.length} Permissions)
                </span>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Staff members automatically inherit all module permissions configured for their role. Permissions are managed centrally under the{" "}
              <strong className="text-slate-700 dark:text-slate-300">Roles & Permissions</strong> section.
            </p>
          </div>
        </div>

        {/* Submit & Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          {onNavigateToList && (
            <button
              type="button"
              onClick={onNavigateToList}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-brand-primary hover:bg-brand-primary/90 text-white shadow-md transition"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            <span>Create Staff Member</span>
          </button>
        </div>
      </form>
    </div>
  );
}
