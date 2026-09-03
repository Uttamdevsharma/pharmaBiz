"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import {
  User,
  Mail,
  Lock,
  Phone,
  Building,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  ArrowRight,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import { getClientPlanConfig } from "@/lib/planLimits";

interface PharmacyRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;
}

interface CreateStaffTabProps {
  onNavigate?: (module: any) => void;
}

export function CreateStaffTab({ onNavigate }: CreateStaffTabProps) {
  const { user } = useAuth();
  const [roles, setRoles] = useState<PharmacyRole[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [staffCount, setStaffCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSuccess, setCreatedSuccess] = useState<any | null>(null);

  const isManager = user?.role === "BRANCH_MANAGER";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    phone: "",
    password: "",
    role: "",
    branchId: user?.branchId || "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [rRes, bRes, pRes, sRes] = await Promise.all([
        fetchApi<PharmacyRole[]>("/users/roles"),
        fetchApi<any[]>("/branches"),
        fetchApi<any>("/tenant/profile"),
        fetchApi<any[]>("/users"),
      ]);

      if (rRes.success && rRes.data) {
        setRoles(rRes.data);
        if (!formData.role && rRes.data && rRes.data.length > 0) {
          setFormData((prev) => ({ ...prev, role: rRes.data![0].id }));
        }
      }
      if (bRes.success && bRes.data) setBranches(bRes.data);
      if (pRes.success && pRes.data) setProfile(pRes.data);
      if (sRes.success && sRes.data) {
        const nonOwner = (sRes.data || []).filter((s: any) => s.role !== "COMPANY_OWNER");
        setStaffCount(nonOwner.length);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load initial data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const tier = (profile?.tier || "TRIAL").toUpperCase();
  const planConfig = getClientPlanConfig(tier);
  const isTrial = tier === "TRIAL";
  const maxStaff = isTrial ? 1 : planConfig.maxTotalStaff || 999;
  const isTotalLimitReached = staffCount >= maxStaff;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreatedSuccess(null);

    if (isTotalLimitReached) {
      setError("Staff capacity reached for your current subscription plan.");
      return;
    }

    if (!formData.role) {
      setError("Please select a role for the new staff member.");
      return;
    }

    try {
      setSubmitting(true);
      const targetBranchId = isManager ? user?.branchId : formData.branchId || null;

      const res = await fetchApi("/users", {
        method: "POST",
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          username: formData.username.trim() || formData.email.trim(),
          phone: formData.phone.trim(),
          password: formData.password,
          role: formData.role,
          branchId: targetBranchId,
        }),
      });

      if (res.success && res.data) {
        setCreatedSuccess(res.data);
        setStaffCount((prev) => prev + 1);
        // Reset form
        setFormData({
          name: "",
          email: "",
          username: "",
          phone: "",
          password: "",
          role: roles[0]?.id || "",
          branchId: user?.branchId || "",
        });
      } else {
        setError(res.message || "Failed to create staff member");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRoleObj = roles.find((r) => r.id === formData.role || r.name === formData.role);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <span className="text-xs font-semibold">Loading roles and configuration...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Create Staff Member
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Add a new staff user to your pharmacy. Permissions are automatically inherited from the selected role.
            </p>
          </div>
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate("staff")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
          >
            <span>View Staff List</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Capacity Alert */}
      {isTotalLimitReached && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <strong>Staff Capacity Limit Reached ({staffCount}/{maxStaff})</strong>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              {isTrial
                ? "Plan 0 - Free Trial allows a maximum of 1 staff member. Upgrade to a paid plan to add more team members."
                : `Your current ${planConfig.name} allows up to ${planConfig.maxTotalStaff} staff members.`}
            </p>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {createdSuccess && (
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Staff Member Created Successfully!</h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                <strong>{createdSuccess.name}</strong> has been registered with role{" "}
                <strong>{createdSuccess.pharmacyRoleName || selectedRoleObj?.name}</strong> and can now log in.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate("staff")}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
              >
                Go to Staff List
              </button>
            )}
            <button
              type="button"
              onClick={() => setCreatedSuccess(null)}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-semibold text-xs hover:bg-emerald-50 transition"
            >
              Add Another Staff
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Create Staff Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <User className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Shakil Ahmed"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: e.target.value,
                      username: e.target.value,
                    })
                  }
                  placeholder="name@pharmacy.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number
              </label>
              <div className="relative flex items-center">
                <Phone className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="01700000000"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Select Role */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Role <span className="text-red-500">*</span>
                </label>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate("roles")}
                    className="text-[11px] font-bold text-brand-primary hover:underline flex items-center gap-1"
                  >
                    <span>Manage Roles</span>
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <KeyRound className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.description ? `— ${r.description}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Branch Assignment */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Assign to Branch
              </label>
              <div className="relative flex items-center">
                <Building className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                {isManager ? (
                  <input
                    type="text"
                    disabled
                    value={branches.find((b) => b.id === user?.branchId)?.name || "Your Branch"}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-400"
                  />
                ) : (
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
                  >
                    <option value="">HQ / Main Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.location || "Branch"})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Role Preview Card & Inheritance Banner */}
          {selectedRoleObj && (
            <div className="p-4 rounded-2xl bg-brand-primary/5 dark:bg-brand-primary/10 border border-brand-primary/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand-primary" />
                  <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Assigned Role: {selectedRoleObj.name}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-primary/15 text-brand-primary">
                  {selectedRoleObj.permissions?.length || 0} Modules Permitted
                </span>
              </div>

              {selectedRoleObj.description && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedRoleObj.description}
                </p>
              )}

              <div className="pt-2 border-t border-brand-primary/10 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 text-brand-primary shrink-0 mt-0.5" />
                <span>
                  <strong>Automatic Role Inheritance:</strong> This staff member will automatically inherit all
                  permissions configured for <strong>{selectedRoleObj.name}</strong>. You can customize permissions anytime in the{" "}
                  <strong>Roles & Permissions</strong> section.
                </span>
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate("staff")}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={submitting || isTotalLimitReached}
              className="px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs shadow-sm transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating Staff...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  <span>Create Staff Member</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
