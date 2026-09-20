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

export function CreateStaffTab({
  onSuccess,
  onNavigateToList,
  onNavigateToRoles,
}: CreateStaffTabProps) {
  const { isSuperAdmin } = useAuth();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [assignedDepartment, setAssignedDepartment] = useState("Platform Headquarters (HQ)");

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
        </div>

        {onNavigateToList && (
          <button
            type="button"
            onClick={onNavigateToList}
            className="h-11 px-5 rounded-xl text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition flex items-center gap-2 cursor-pointer"
          >
            <span>View Staff List</span>
            <ArrowRight className="h-4 w-4" />
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

      {/* Staff Information Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6"
      >
        {/* Row 1: Full Name, Email Address, Phone Number */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Shakil Ahmed"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@pharmacy.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01700000000"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Password, Select Role, Assign to Department */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
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
              {onNavigateToRoles && (
                <button
                  type="button"
                  onClick={onNavigateToRoles}
                  className="text-[11px] font-bold text-brand-primary hover:underline cursor-pointer"
                >
                  Manage Roles
                </button>
              )}
            </div>
            <div className="relative">
              <KeyRound className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                required
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                disabled={loadingRoles}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer appearance-none"
              >
                {loadingRoles ? (
                  <option>Loading roles...</option>
                ) : (
                  roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Assign Department / Scope */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Assign to Branch / Department
            </label>
            <div className="relative">
              <Building className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={assignedDepartment}
                onChange={(e) => setAssignedDepartment(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer appearance-none"
              >
                <option value="Main Branch (Dhanmondi, Dhaka)">Main Branch (Dhanmondi, Dhaka)</option>
                <option value="Platform Headquarters (HQ)">Platform Headquarters (HQ)</option>
                <option value="System Administration">System Administration</option>
                <option value="Customer Operations">Customer Operations</option>
              </select>
            </div>
          </div>
        </div>

        {/* Row 3: Role Info Card */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 flex items-center justify-between text-xs font-bold shadow-2xs">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <ShieldCheck className="h-4 w-4 text-brand-primary" />
            <span>
              Assigned Role: {selectedRoleObj?.name || "Super Admin"}
            </span>
          </div>
          <span className="text-brand-primary font-mono text-xs">
            {selectedRoleObj?.permissions?.length || 10} Modules Permitted
          </span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          {onNavigateToList && (
            <button
              type="button"
              onClick={onNavigateToList}
              className="h-11 px-6 rounded-xl text-sm font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="h-11 px-6 rounded-xl text-sm font-bold bg-brand-primary hover:bg-brand-primary-hover text-white shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            <span>Create Staff Member</span>
          </button>
        </div>
      </form>
    </div>
  );
}
