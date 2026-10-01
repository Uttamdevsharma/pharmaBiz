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
  FileCheck,
  CreditCard,
  FileText,
} from "lucide-react";
import { getClientPlanConfig } from "@/lib/planLimits";
import { ImageUploader } from "@/components/common/ImageUploader";

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
    nidNumber: "",
    nidFrontUrl: "",
    nidFrontPublicId: "",
    nidBackUrl: "",
    nidBackPublicId: "",
    documentsSubmitted: false,
    grossSalary: "",
    isPermanent: false,
    staffId: "",
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
      if (bRes.success && bRes.data && bRes.data.length > 0) {
        const branchList = bRes.data;
        setBranches(branchList);
        const defaultBranchId = user?.branchId || branchList[0]?.id || "";
        setFormData((prev) => ({ ...prev, branchId: prev.branchId || defaultBranchId }));
      }
      if (pRes.success && pRes.data) setProfile(pRes.data);
      if (sRes.success && sRes.data) {
        const nonOwner = (sRes.data || []).filter(
          (s: any) => s.role !== "COMPANY_OWNER" && s.role !== "SUPER_ADMIN"
        );
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
          nidNumber: formData.nidNumber.trim() || null,
          nidFrontUrl: formData.nidFrontUrl || null,
          nidFrontPublicId: formData.nidFrontPublicId || null,
          nidBackUrl: formData.nidBackUrl || null,
          nidBackPublicId: formData.nidBackPublicId || null,
          documentsSubmitted: formData.documentsSubmitted,
          grossSalary: formData.grossSalary ? Number(formData.grossSalary) : null,
          isPermanent: formData.isPermanent,
          staffId: formData.staffId?.trim()
            ? `${formData.isPermanent ? "P" : "T"}-${formData.staffId.trim().replace(/^[PTpt]-?/, "")}`
            : null,
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
          nidNumber: "",
          nidFrontUrl: "",
          nidFrontPublicId: "",
          nidBackUrl: "",
          nidBackPublicId: "",
          documentsSubmitted: false,
          grossSalary: "",
          isPermanent: false,
          staffId: "",
        });
        // Automatically navigate to Staff List
        if (onNavigate) {
          onNavigate("staff");
        }
      } else {
        const msg = res.message || "Failed to create staff member";
        setError(msg);
        if (msg.toLowerCase().includes("limit")) {
          await showAlert.warning("Staff Limit Reached", msg);
        } else {
          showAlert.error("Creation Failed", msg);
        }
      }
    } catch (err: any) {
      const msg = err.message || "An unexpected error occurred";
      setError(msg);
      if (msg.toLowerCase().includes("limit")) {
        await showAlert.warning("Staff Limit Reached", msg);
      } else {
        showAlert.error("Creation Error", msg);
      }
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
                  onChange={(e) => {
                    const nextRole = e.target.value;
                    const rObj = roles.find((r) => r.id === nextRole || r.name === nextRole);
                    const isAcc = (rObj?.name || nextRole).toLowerCase().includes("account") || nextRole === "ACCOUNTS";
                    setFormData((prev) => ({
                      ...prev,
                      role: nextRole,
                      branchId: isAcc ? "" : (prev.branchId || branches[0]?.id || ""),
                    }));
                  }}
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
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  Assign to Branch
                </label>
                {(selectedRoleObj?.name?.toLowerCase().includes("account") || formData.role === "ACCOUNTS") && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Company-wide Role
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
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
                    {(selectedRoleObj?.name?.toLowerCase().includes("account") || formData.role === "ACCOUNTS") && (
                      <option value="">🏢 All Branches (Central Accounts Lead)</option>
                    )}
                    {branches.length === 0 && <option value="">No branch available</option>}
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}{b.location ? ` (${b.location})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {(selectedRoleObj?.name?.toLowerCase().includes("account") || formData.role === "ACCOUNTS") && (
                <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ℹ️ Ekjon accounts officer-i sobgula branch er accounts & finances monitor korben.
                </p>
              )}
            </div>

            {/* Gross Salary */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Gross Monthly Salary (৳)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-sm font-bold text-slate-400 pointer-events-none font-mono">৳</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={formData.grossSalary}
                  onChange={(e) => setFormData({ ...formData, grossSalary: e.target.value })}
                  placeholder="e.g. 25000"
                  className="w-full h-11 pl-9 pr-3.5 rounded-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary font-mono"
                />
              </div>
            </div>

            {/* Permanent Employee Toggle */}
            <div
              onClick={() => setFormData((prev) => ({ ...prev, isPermanent: !prev.isPermanent }))}
              className="md:col-span-2 p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition select-none"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Employment Type:
                    </span>
                    {formData.isPermanent ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        Permanent Employee (Paid Leave Eligible - 30 Days/Year)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
                        Probation
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                    {formData.isPermanent
                      ? "Eligible for 30 days annual paid leave."
                      : "Probation period staff."}
                  </p>
                </div>

                {/* Modern Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.isPermanent}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFormData((prev) => ({ ...prev, isPermanent: !prev.isPermanent }));
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formData.isPermanent ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"
                  }`}
                  title={formData.isPermanent ? "Click to set as Probation" : "Click to set as Permanent Employee"}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      formData.isPermanent ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Staff Institutional ID */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  Staff ID / Employee Code
                </label>
                <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-none ${
                  formData.isPermanent
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                }`}>
                  Prefix: {formData.isPermanent ? "P (Permanent)" : "T (Temporary)"}
                </span>
              </div>
              <div className="relative flex items-center">
                <div className={`h-11 px-3.5 flex items-center justify-center font-mono font-black text-sm border border-r-0 border-slate-200 dark:border-slate-700 select-none ${
                  formData.isPermanent
                    ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}>
                  {formData.isPermanent ? "P-" : "T-"}
                </div>
                <input
                  type="text"
                  value={formData.staffId}
                  onChange={(e) => setFormData({ ...formData, staffId: e.target.value.replace(/^[PTpt]-?/, "") })}
                  placeholder="e.g. 221902234"
                  className="w-full h-11 px-3.5 rounded-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary font-mono"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Full Staff ID:{" "}
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formData.staffId?.trim() ? `${formData.isPermanent ? "P" : "T"}-${formData.staffId.trim().replace(/^[PTpt]-?/, "")}` : "Not assigned"}
                </span>
              </p>
            </div>
          </div>

          {/* Section: Staff NID & Verification Documents */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-brand-primary" />
                <span>National ID & Verification Documents</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* NID Number */}
              <div className="md:col-span-3 max-w-md">
                <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  NID Card Number
                </label>
                <div className="relative flex items-center">
                  <CreditCard className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.nidNumber}
                    onChange={(e) => setFormData({ ...formData, nidNumber: e.target.value })}
                    placeholder="e.g. 19901234567890123"
                    className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary font-mono"
                  />
                </div>
              </div>

              {/* NID Front Side Upload */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-brand-primary"></span>
                  <span>NID Front Side</span>
                </label>
                <ImageUploader
                  value={formData.nidFrontUrl}
                  publicId={formData.nidFrontPublicId}
                  folder="pharmacy_saas/staff_nid"
                  label="Upload NID Front"
                  hint="PNG, JPG, WebP up to 5MB"
                  aspectRatio="wide"
                  onChange={(img) =>
                    setFormData((prev) => ({
                      ...prev,
                      nidFrontUrl: img?.url || "",
                      nidFrontPublicId: img?.publicId || "",
                    }))
                  }
                />
              </div>

              {/* NID Back Side Upload */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                  <span>NID Back Side</span>
                </label>
                <ImageUploader
                  value={formData.nidBackUrl}
                  publicId={formData.nidBackPublicId}
                  folder="pharmacy_saas/staff_nid"
                  label="Upload NID Back"
                  hint="PNG, JPG, WebP up to 5MB"
                  aspectRatio="wide"
                  onChange={(img) =>
                    setFormData((prev) => ({
                      ...prev,
                      nidBackUrl: img?.url || "",
                      nidBackPublicId: img?.publicId || "",
                    }))
                  }
                />
              </div>
            </div>

            {/* Document Submission Checkbox / Terms */}
            <div className={`p-4 rounded-xl border transition-all ${formData.documentsSubmitted
                ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                : "bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800"
              }`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.documentsSubmitted}
                  onChange={(e) => setFormData({ ...formData, documentsSubmitted: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer shrink-0"
                />
                <div className="space-y-0.5">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileCheck className={`h-4 w-4 ${formData.documentsSubmitted ? "text-emerald-600" : "text-amber-600"}`} />
                    <span>All required certificates & documents submitted</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {formData.documentsSubmitted
                      ? "Verified — Staff is eligible for salary disbursement."
                      : "Unchecked — Salary disbursement blocked until verified."}
                  </p>
                </div>
              </label>
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
