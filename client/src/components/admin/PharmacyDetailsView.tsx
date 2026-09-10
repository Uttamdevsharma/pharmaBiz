"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import {
  ArrowLeft,
  Building2,
  User,
  ShieldCheck,
  CreditCard,
  Calendar,
  DollarSign,
  Layers,
  Store,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  FileText,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  History,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  BadgeCheck,
  XCircle,
  Hash,
  ExternalLink,
  Maximize2,
  X,
  FileCheck,
  Pill,
  Image as ImageIcon,
} from "lucide-react";

interface PharmacyDetailsViewProps {
  tenantId: string;
  onBack: () => void;
  onToggleStatusSuccess?: () => void;
}

export function PharmacyDetailsView({ tenantId, onBack, onToggleStatusSuccess }: PharmacyDetailsViewProps) {
  const [tenant, setTenant] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<{ title: string; url: string; number?: string } | null>(null);

  const isPdf = (url?: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes(".pdf") || lower.includes("/raw/") || lower.includes("application/pdf");
  };

  const loadTenantDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<any>(`/super-admin/tenants/${tenantId}`);
      if (res.success && res.data) {
        setTenant(res.data);
      } else {
        throw new Error(res.message || "Failed to load pharmacy details");
      }
    } catch (err: any) {
      console.error("Failed to load pharmacy details", err);
      setError(err.message || "Could not retrieve pharmacy account details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      loadTenantDetails();
    }
  }, [tenantId]);

  const handleToggleStatus = async () => {
    if (!tenant) return;
    try {
      setStatusLoading(true);
      const newStatus = !tenant.isActive;
      const res = await fetchApi(`/super-admin/tenants/${tenant.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (res.success) {
        await loadTenantDetails();
        if (onToggleStatusSuccess) onToggleStatusSuccess();
      } else {
        alert(res.message || "Failed to update tenant status");
      }
    } catch (err) {
      console.error("Failed to toggle status", err);
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <span className="font-bold text-slate-600 dark:text-slate-300">Loading Pharmacy Account & Audit Ledger...</span>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="p-8 text-center space-y-4 max-w-lg mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm my-12">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pharmacy Details Unavailable</h3>
        <p className="text-xs text-slate-500">{error || "Pharmacy record could not be found."}</p>
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold shadow-sm"
        >
          Return to Pharmacies Directory
        </button>
      </div>
    );
  }

  // Find Company Owner User
  const ownerUser = (tenant.users || []).find((u: any) => u.role === "COMPANY_OWNER") || tenant.users?.[0];

  // Active / Latest Subscription
  const subscriptionsList: any[] = tenant.subscriptions || [];
  const latestSubscription = subscriptionsList[0] || null;

  const currentPlan = latestSubscription?.plan || null;
  const currentPlanName = currentPlan?.name || tenant.tier || "Standard";
  const maxBranchesAllowed = currentPlan?.maxBranches ?? (tenant.tier === "ENTERPRISE" ? 999 : tenant.tier === "GROWTH" ? 3 : 1);
  const maxStaffAllowed = currentPlan?.features?.maxUsers || (tenant.tier === "ENTERPRISE" ? 50 : tenant.tier === "GROWTH" ? 15 : 5);

  const activeBranchesCount = (tenant.branches || []).filter((b: any) => b.isActive !== false).length;
  const activeStaffCount = (tenant.users || []).filter((u: any) => u.isActive !== false).length;

  const latestPayment = latestSubscription?.payments?.[0] || tenant.payments?.[0] || null;

  // Determine Subscription Expiry Countdown
  const now = new Date();
  const subEndDate = latestSubscription?.endDate ? new Date(latestSubscription.endDate) : null;
  const daysRemaining = subEndDate ? Math.ceil((subEndDate.getTime() - now.getTime()) / (1000 * 3600 * 24)) : null;

  // Process Subscription History with Plan Transitions (Newest First)
  const sortedSubscriptions = [...subscriptionsList].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
            <button
              type="button"
              onClick={onBack}
              className="hover:text-brand-primary flex items-center gap-1 font-semibold transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Pharmacies Directory</span>
            </button>
            <span>/</span>
            <span className="text-brand-primary font-bold">{tenant.name}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                className="h-12 w-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800"
              />
            ) : (
              <div className="h-12 w-12 rounded-2xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20 flex items-center justify-center">
                <Building2 className="h-6 w-6" />
              </div>
            )}
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <span>{tenant.name}</span>
            </h1>

            {/* Status Pills */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                tenant.isActive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${tenant.isActive ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              {tenant.isActive ? "Active Pharmacy Account" : "Suspended"}
            </span>

            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-brand-primary/10 text-brand-primary border border-brand-primary/20 uppercase tracking-wider">
              {tenant.tier} Tier
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>Pharmacy Account ID:</span>
            <code className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-bold text-slate-700 dark:text-slate-300">
              {tenant.id}
            </code>
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Directory</span>
          </button>

          <button
            type="button"
            disabled={statusLoading}
            onClick={handleToggleStatus}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition flex items-center gap-1.5 ${
              tenant.isActive
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {statusLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : tenant.isActive ? (
              <>
                <XCircle className="h-4 w-4" />
                <span>Suspend Account</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Activate Account</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. CURRENT SUBSCRIPTION & USAGE METRICS HIGHLIGHT GRID */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-primary" />
          <span>Active Subscription & Account Telemetry</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Current Plan */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>Subscription Plan</span>
              <Layers className="h-4 w-4 text-brand-primary" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{currentPlanName}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary font-bold">
                {tenant.tier}
              </span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-slate-400" />
              <span>
                Billing: <strong>{currentPlan?.billingCycle || latestSubscription?.billingCycle || "MONTHLY"}</strong>
              </span>
            </div>
          </div>

          {/* Subscription Validity */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>Validity & Renewal</span>
              <Calendar className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
              {subEndDate ? subEndDate.toLocaleDateString() : "Lifetime / Active"}
            </div>
            <div className="text-xs flex items-center gap-1.5">
              {daysRemaining !== null ? (
                daysRemaining > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{daysRemaining} days remaining</span>
                  </span>
                ) : (
                  <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Subscription Expired</span>
                  </span>
                )
              ) : (
                <span className="text-slate-400">No active expiry date set</span>
              )}
            </div>
          </div>

          {/* Branch Capacity */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>Allowed Branch Outlets</span>
              <Store className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono flex items-center justify-between">
              <span>
                {activeBranchesCount} <span className="text-xs text-slate-400 font-normal">/ {maxBranchesAllowed} Outlets</span>
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (activeBranchesCount / (maxBranchesAllowed || 1)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Staff Capacity */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>Allowed Staff / Users</span>
              <Users className="h-4 w-4 text-sky-500" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono flex items-center justify-between">
              <span>
                {activeStaffCount} <span className="text-xs text-slate-400 font-normal">/ {maxStaffAllowed} Staff</span>
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-sky-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (activeStaffCount / (maxStaffAllowed || 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PHARMACY INFORMATION & OWNER INFORMATION CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pharmacy Information Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-brand-primary" />
              <span>Pharmacy Business Details</span>
            </h3>
            <span className="text-xs text-slate-400">
              Registered: {new Date(tenant.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 font-medium block">Pharmacy Name</span>
              <strong className="text-slate-900 dark:text-white text-sm font-bold block">{tenant.name}</strong>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium block">Business Email</span>
              <div className="text-slate-800 dark:text-slate-200 font-medium flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>{tenant.email || "Not specified"}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium block">Contact Phone</span>
              <div className="text-slate-800 dark:text-slate-200 font-mono font-semibold flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>{tenant.phone || "Not specified"}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium block">Store Address</span>
              <div className="text-slate-800 dark:text-slate-200 font-medium flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>{tenant.address || "Not specified"}</span>
              </div>
            </div>
          </div>

          {/* Regulatory Licenses & Compliance */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Regulatory Verification & Licenses
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
                <span className="text-[10px] text-slate-400 block font-semibold">Trade License</span>
                <strong className="font-mono font-bold text-slate-900 dark:text-white">
                  {tenant.tradeLicenseNumber || "N/A"}
                </strong>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
                <span className="text-[10px] text-slate-400 block font-semibold">Drug License</span>
                <strong className="font-mono font-bold text-slate-900 dark:text-white">
                  {tenant.drugLicenseNumber || "N/A"}
                </strong>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
                <span className="text-[10px] text-slate-400 block font-semibold">Owner NID</span>
                <strong className="font-mono font-bold text-slate-900 dark:text-white">
                  {tenant.nidNumber || "N/A"}
                </strong>
              </div>
            </div>
          </div>

          {/* Verification Status */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
              <span>Compliance Status: {tenant.verificationStatus || "APPROVED"}</span>
            </div>
            {tenant.approvedAt && (
              <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400 font-medium">
                Verified on {new Date(tenant.approvedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Owner Information Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-5 w-5 text-brand-primary" />
              <span>Owner & Administrator Details</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black bg-brand-primary/10 text-brand-primary">
              Company Owner
            </span>
          </div>

          {ownerUser ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 font-medium block">Owner Full Name</span>
                  <strong className="text-slate-900 dark:text-white text-sm font-bold block">
                    {ownerUser.name}
                  </strong>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-medium block">Account Username</span>
                  <strong className="font-mono text-slate-800 dark:text-slate-200 font-bold block">
                    @{ownerUser.username}
                  </strong>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-medium block">Personal Email</span>
                  <div className="text-slate-800 dark:text-slate-200 font-medium flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{ownerUser.email}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-medium block">Contact Phone</span>
                  <div className="text-slate-800 dark:text-slate-200 font-mono font-semibold flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{ownerUser.phone || tenant.phone || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Owner Login Access</span>
                  <strong className="text-slate-900 dark:text-white font-bold">
                    {ownerUser.isActive ? "Active Credentials" : "Access Disabled"}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Account Created</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                    {new Date(ownerUser.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No owner user profile linked to this pharmacy tenant.
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2.5 REGULATORY & COMPLIANCE DOCUMENTS (CLOUDINARY STORAGE) */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Regulatory Verification & Compliance Documents</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified legal records uploaded by applicant and securely archived on Cloudinary CDN.
            </p>
          </div>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 self-start sm:self-auto">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Cloudinary Storage Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              id: "nid_front",
              title: "Owner National ID (Front)",
              number: tenant.nidNumber,
              url: tenant.nidFrontUrl || tenant.nidDocUrl,
              icon: FileText,
              iconColor: "text-brand-primary",
              bgColor: "bg-brand-primary/10",
            },
            {
              id: "nid_back",
              title: "Owner National ID (Back)",
              number: tenant.nidNumber,
              url: tenant.nidBackUrl,
              icon: FileText,
              iconColor: "text-brand-primary",
              bgColor: "bg-brand-primary/10",
            },
            {
              id: "trade",
              title: "Trade License Document",
              number: tenant.tradeLicenseNumber,
              url: tenant.tradeLicenseDocUrl || tenant.tradeLicenseFrontUrl,
              icon: FileCheck,
              iconColor: "text-emerald-500",
              bgColor: "bg-emerald-500/10",
            },
            {
              id: "drug",
              title: "DGDA Drug License",
              number: tenant.drugLicenseNumber,
              url: tenant.drugLicenseDocUrl || tenant.drugLicenseFrontUrl,
              icon: Pill,
              iconColor: "text-purple-500",
              bgColor: "bg-purple-500/10",
            },
          ].map((doc) => {
            const hasDoc = Boolean(doc.url);
            const docIsPdf = isPdf(doc.url);
            const isCloudinary = doc.url?.includes("cloudinary.com");

            return (
              <div
                key={doc.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className={`h-9 w-9 rounded-xl ${doc.bgColor} ${doc.iconColor} flex items-center justify-center`}>
                      <doc.icon className="h-5 w-5" />
                    </div>
                    {hasDoc ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        {docIsPdf ? "PDF Document" : "Image File"}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400">
                        Not Uploaded
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                      {doc.title}
                    </h4>
                    {doc.number && (
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        Ref: <span className="font-bold text-slate-700 dark:text-slate-300">{doc.number}</span>
                      </div>
                    )}
                  </div>

                  {hasDoc && (
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>{isCloudinary ? "Cloudinary CDN Verified" : "Direct Cloud Asset"}</span>
                    </div>
                  )}
                </div>

                {hasDoc ? (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setViewingDoc({ title: doc.title, url: doc.url!, number: doc.number })}
                      className="flex-1 py-2 px-3 rounded-xl bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span>Preview</span>
                    </button>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition cursor-pointer"
                      title="Open in new browser tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ) : (
                  <div className="py-2 text-center text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-100 dark:border-slate-800">
                    No document attached
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CHRONOLOGICAL SUBSCRIPTION HISTORY SECTION (TIMELINE / CARDS) */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <History className="h-5 w-5 text-brand-primary" />
              <span>Subscription & Upgrade History Ledger</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Permanently auditable chronological record of all plan purchases, tier upgrades, and billing events (Newest activity first).
            </p>
          </div>

          <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold">
            Total Entries: {sortedSubscriptions.length}
          </span>
        </div>

        {sortedSubscriptions.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-2">
            <Layers className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="font-bold text-slate-700 dark:text-slate-300">No subscription history entries found</p>
            <p>This tenant is operating under default trial or legacy plan configuration.</p>
          </div>
        ) : (
          <div className="relative pl-6 md:pl-8 space-y-6 before:absolute before:left-3 md:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {sortedSubscriptions.map((sub: any, idx: number) => {
              const subPlan = sub.plan || {};
              const planName = subPlan.name || tenant.tier || "Subscription";
              const planTier = subPlan.tier || tenant.tier || "STARTER";
              const price = Number(subPlan.price || 0);

              // Calculate transition if there is a chronologically preceding subscription
              const prevSub = sortedSubscriptions[idx + 1];
              const prevPlanName = prevSub?.plan?.name || prevSub?.plan?.tier || null;

              const isCurrent = idx === 0;
              const subPayments = sub.payments || [];
              const subPayment = subPayments[0];
              const paymentStatus = subPayment?.status || sub.status || "VALIDATED";
              const amountPaid = Number(subPayment?.amount || price);

              return (
                <div key={sub.id} className="relative">
                  {/* Timeline Icon Node */}
                  <div
                    className={`absolute -left-6 md:-left-8 top-1.5 h-6 w-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black ${
                      isCurrent
                        ? "bg-brand-primary border-white dark:border-slate-950 text-white shadow-md ring-4 ring-brand-primary/20"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500"
                    }`}
                  >
                    {idx + 1}
                  </div>

                  {/* History Entry Card */}
                  <div
                    className={`p-6 rounded-3xl border transition shadow-xs space-y-4 ${
                      isCurrent
                        ? "bg-white dark:bg-slate-900 border-brand-primary/40 shadow-sm"
                        : "bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-black text-slate-900 dark:text-white">
                            {planName}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-brand-primary/10 text-brand-primary">
                            {planTier} Tier
                          </span>

                          {isCurrent && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Active Plan
                            </span>
                          )}

                          {/* Upgrade Indicator */}
                          {prevPlanName && prevPlanName !== planName && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                              <TrendingUp className="h-3 w-3 text-amber-500" />
                              <span>Plan Upgrade ({prevPlanName} → {planName})</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                          <span>Subscription Ref: #{sub.id.substring(0, 8).toUpperCase()}</span>
                          <span>•</span>
                          <span>Purchase Date: {new Date(sub.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Payment Status Pill */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                            paymentStatus === "VALIDATED" || paymentStatus === "ACTIVE" || paymentStatus === "PAID"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : paymentStatus === "PENDING"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {paymentStatus}
                        </span>
                      </div>
                    </div>

                    {/* Detailed Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
                        <span className="text-[10px] text-slate-400 block font-semibold">Start Date</span>
                        <strong className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {new Date(sub.startDate).toLocaleDateString()}
                        </strong>
                      </div>

                      <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
                        <span className="text-[10px] text-slate-400 block font-semibold">End Date</span>
                        <strong className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : "N/A"}
                        </strong>
                      </div>

                      <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
                        <span className="text-[10px] text-slate-400 block font-semibold">Amount Paid</span>
                        <strong className="font-mono font-black text-brand-primary text-sm">
                          ৳{amountPaid.toFixed(2)}
                        </strong>
                      </div>

                      <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
                        <span className="text-[10px] text-slate-400 block font-semibold">Billing Cycle</span>
                        <strong className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                          {subPlan.billingCycle || sub.billingCycle || "MONTHLY"}
                        </strong>
                      </div>
                    </div>

                    {/* Transaction Reference Footer */}
                    {subPayment?.tranId && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center gap-1.5 font-mono">
                          <Hash className="h-3.5 w-3.5 text-slate-400" />
                          <span>Transaction ID: {subPayment.tranId}</span>
                          {subPayment.paymentMethod && <span>({subPayment.paymentMethod})</span>}
                        </div>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">Verified Audit Record</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* STANDALONE DOCUMENT PREVIEW MODAL                         */}
      {/* ========================================================= */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {viewingDoc.title}
                </h3>
                {viewingDoc.number && (
                  <p className="text-xs font-mono text-brand-primary">License/Doc No: {viewingDoc.number}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewingDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open in New Tab</span>
                </a>
                <button
                  type="button"
                  onClick={() => setViewingDoc(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-auto flex items-center justify-center bg-slate-950/5 dark:bg-slate-950 min-h-[450px]">
              {isPdf(viewingDoc.url) ? (
                <iframe
                  src={viewingDoc.url}
                  className="w-full h-[580px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white"
                  title={viewingDoc.title}
                />
              ) : (
                <img
                  src={viewingDoc.url}
                  alt={viewingDoc.title}
                  className="max-h-[580px] max-w-full object-contain rounded-2xl shadow-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
