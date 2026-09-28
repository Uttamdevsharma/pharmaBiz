"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import { showAlert } from "@/lib/swal";
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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSuccess, setCreatedSuccess] = useState<any | null>(null);

  const isManager = user?.role === "BRANCH_MANAGER";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    phone: "",
    password: "",
    confirmPassword: "",
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strictly numeric only, discard any non-digit chars like letters a, b, etc. Max 12 digits.
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 12);
    setFormData((prev) => ({ ...prev, phone: digitsOnly }));
  };

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

    // Phone number validation: 11 or 12 digits
    if (formData.phone && (formData.phone.length < 11 || formData.phone.length > 12)) {
      setError("Phone number must be either 11 or 12 digits (e.g. 01712345678).");
      return;
    }

    // Password validation: minimum 6 characters
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    // Confirm password matching validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match. Please verify your confirm password.");
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
        await showAlert.success(
          "Staff Member Created Successfully!",
          `${res.data.name || res.data.username} has been registered and can now log in.`,
          { timer: 2000 }
        );
        // Reset form
        setFormData({
          name: "",
          email: "",
          username: "",
          phone: "",
          password: "",
          confirmPassword: "",
          role: roles[0]?.id || "",
          branchId: user?.branchId || "",
        });
        // Automatically navigate to Staff List
        if (onNavigate) {
          onNavigate("staff");
        }
      } else {
        const msg = res.message || "Failed to create staff member";
        setError(msg);
        showAlert.error("Creation Failed", msg);
      }
    } catch (err: any) {
      const msg = err.message || "An unexpected error occurred";
      setError(msg);
      showAlert.error("Creation Error", msg);
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
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-1">
            <span>Staff Management</span>
            <span>/</span>
            <span className="text-brand-primary">Create Staff</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="h-7 w-7 text-brand-primary" />
            Create Staff Member
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Add team members, assign their branch and designate their operational role.
          </p>
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate("staff")}
            className="h-10 px-4 rounded-lg text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition flex items-center gap-2"
          >
            <span>View Staff List</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Capacity Alert */}
      {isTotalLimitReached && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-3">
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
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs space-y-3 animate-in fade-in">
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
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
              >
                Go to Staff List
              </button>
            )}
            <button
              type="button"
              onClick={() => setCreatedSuccess(null)}
              className="px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-semibold text-xs hover:bg-emerald-50 transition"
            >
              Add Another Staff
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Create Staff Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Full Name *
              </label>
              <div className="relative flex items-center">
                <User className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Shakil Ahmed"
                  className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Email Address *
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
                  className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            {/* Phone Number (Strictly Digits Only, 11-12 digits) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  Phone Number
                </label>
                <span className="text-[11px] text-slate-400 font-medium">11 or 12 digits</span>
              </div>
              <div className="relative flex items-center">
                <Phone className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={12}
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="01700000000"
                  className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Password *
              </label>
              <div className="relative flex items-center">
                <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min. 6 characters"
                  className="w-full h-11 pl-10 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Confirm Password *
              </label>
              <div className="relative flex items-center">
                <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Re-type password"
                  className="w-full h-11 pl-10 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Select Role */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  Select Role *
                </label>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate("create_role")}
                    className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
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
                  className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary cursor-pointer"
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
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Assign to Branch
              </label>
              <div className="relative flex items-center max-w-md">
                <Building className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                {isManager ? (
                  <input
                    type="text"
                    disabled
                    value={branches.find((b) => b.id === user?.branchId)?.name || "Your Branch"}
                    className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-400"
                  />
                ) : (
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary cursor-pointer"
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

          {/* Role Preview Card */}
          {selectedRoleObj && (
            <div className="p-3.5 rounded-lg bg-brand-primary/5 dark:bg-brand-primary/10 border border-brand-primary/20 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand-primary" />
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Assigned Role: {selectedRoleObj.name}
                </span>
                {selectedRoleObj.description && (
                  <span className="text-xs text-slate-500 font-medium">
                    ({selectedRoleObj.description})
                  </span>
                )}
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-primary/15 text-brand-primary">
                {selectedRoleObj.permissions?.length || 0} Modules Permitted
              </span>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate("staff")}
                className="h-10 px-5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm transition"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={submitting || isTotalLimitReached}
              className="h-10 px-6 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs sm:text-sm shadow-xs transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
