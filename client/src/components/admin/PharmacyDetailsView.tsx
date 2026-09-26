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
  XCircle,
  Hash,
  ExternalLink,
  Maximize2,
  X,
  FileCheck,
  Pill,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from "lucide-react";
import { PharmacyBillingLedger } from "./PharmacyBillingLedger";

interface PharmacyDetailsViewProps {
  tenantId: string;
  onBack: () => void;
  onToggleStatusSuccess?: () => void;
}

type ActiveTab = "overview" | "documents" | "subscriptions" | "branches";
type DatePreset = "ALL" | "TODAY" | "YESTERDAY" | "THIS_MONTH" | "LAST_MONTH" | "THIS_YEAR" | "CUSTOM";

export function PharmacyDetailsView({
  tenantId,
  onBack,
  onToggleStatusSuccess,
}: PharmacyDetailsViewProps) {
  const [tenant, setTenant] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");


  // Document Preview Modal State
  const [viewingDoc, setViewingDoc] = useState<{
    title: string;
    url: string;
    number?: string;
  } | null>(null);
  const [docZoom, setDocZoom] = useState(1);
  const [docRotate, setDocRotate] = useState(0);

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
      <div className="py-24 text-center space-y-4">
        <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-brand-primary mx-auto" />
        <p className="text-base sm:text-lg font-bold text-slate-600 dark:text-slate-400">
          Loading pharmacy profile...
        </p>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="p-8 sm:p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 max-w-lg mx-auto my-12">
        <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto" />
        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
          Pharmacy Not Found
        </h3>
        <p className="text-sm sm:text-base text-slate-500">{error || "Could not retrieve details."}</p>
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 transition cursor-pointer"
        >
          Return to Pharmacies
        </button>
      </div>
    );
  }

  // Find Owner User
  const ownerUser =
    (tenant.users || []).find((u: any) => u.role === "COMPANY_OWNER") || tenant.users?.[0];

  // Subscription Data
  const subscriptionsList: any[] = tenant.subscriptions || [];
  const latestSubscription = subscriptionsList[0] || null;
  const currentPlan = latestSubscription?.plan || null;
  const currentPlanName = currentPlan?.name || tenant.tier || "Standard";
  const maxBranchesAllowed =
    currentPlan?.maxBranches ??
    (tenant.tier === "ENTERPRISE" ? 999 : tenant.tier === "GROWTH" ? 3 : 1);
  const maxStaffAllowed =
    currentPlan?.features?.maxUsers ||
    (tenant.tier === "ENTERPRISE" ? 50 : tenant.tier === "GROWTH" ? 15 : 5);

  const activeBranchesCount = (tenant.branches || []).filter((b: any) => b.isActive !== false).length;
  const activeStaffCount = (tenant.users || []).filter((u: any) => u.isActive !== false).length;

  // Subscription Expiry
  const now = new Date();
  const subEndDate = latestSubscription?.endDate ? new Date(latestSubscription.endDate) : null;
  const daysRemaining = subEndDate
    ? Math.ceil((subEndDate.getTime() - now.getTime()) / (1000 * 3600 * 24))
    : null;

  const complianceDocs = [
    {
      id: "nid_front",
      title: "National ID (Front)",
      number: tenant.nidNumber,
      url: tenant.nidFrontUrl || tenant.nidDocUrl,
      icon: FileText,
      color: "text-brand-primary",
      bg: "bg-brand-primary/10",
    },
    {
      id: "nid_back",
      title: "National ID (Back)",
      number: tenant.nidNumber,
      url: tenant.nidBackUrl,
      icon: FileText,
      color: "text-brand-primary",
      bg: "bg-brand-primary/10",
    },
    {
      id: "trade",
      title: "Trade License",
      number: tenant.tradeLicenseNumber,
      url: tenant.tradeLicenseDocUrl || tenant.tradeLicenseFrontUrl,
      icon: FileCheck,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      id: "drug",
      title: "DGDA Drug License",
      number: tenant.drugLicenseNumber,
      url: tenant.drugLicenseDocUrl || tenant.drugLicenseFrontUrl,
      icon: Pill,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];


  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Top Simple Back Navigation */}
      <div className="pb-1">
        <button
          type="button"
          onClick={onBack}
          className="group inline-flex items-center gap-2 text-sm sm:text-base font-bold text-slate-500 hover:text-brand-primary transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Pharmacies</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TOP TAB NAVIGATION BAR                                                   */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { id: "overview", label: "Overview & Profile", icon: Building2 },
          { id: "documents", label: "Compliance Documents", icon: FileCheck },
          { id: "subscriptions", label: "Subscription & Billing", icon: Layers },
          { id: "branches", label: "Branches & Staff", icon: Store },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl text-sm sm:text-base font-bold transition flex items-center gap-2 cursor-pointer ${
                isActive
                  ? "bg-brand-primary text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60"
              }`}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB CONTENTS                                                              */}
      {/* ========================================================================= */}

      {/* TAB 1: OVERVIEW & PROFILE */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Key Metrics Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Card 1: Subscription Plan */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400">
                <span>Current Plan</span>
                <Layers className="h-5 w-5 text-brand-primary" />
              </div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white truncate">
                {currentPlanName}
              </div>
              <div className="text-xs sm:text-sm text-slate-500 font-medium">
                Billing:{" "}
                <strong className="text-slate-800 dark:text-slate-200">
                  {currentPlan?.billingCycle || latestSubscription?.billingCycle || "MONTHLY"}
                </strong>
              </div>
            </div>

            {/* Card 2: Validity / Expiry */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400">
                <span>Subscription Status</span>
                <Calendar className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-mono">
                {daysRemaining !== null ? (
                  daysRemaining > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {daysRemaining} Days Left
                    </span>
                  ) : (
                    <span className="text-rose-600">Expired</span>
                  )
                ) : (
                  "Active"
                )}
              </div>
              <div className="text-xs sm:text-sm text-slate-500 font-medium">
                {subEndDate ? `Renews on ${subEndDate.toLocaleDateString()}` : "Lifetime / Active"}
              </div>
            </div>

            {/* Card 3: Branches */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400">
                <span>Branch Outlets</span>
                <Store className="h-5 w-5 text-indigo-500" />
              </div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-mono">
                {activeBranchesCount}
                <span className="text-sm sm:text-base font-normal text-slate-400 ml-1.5">
                  / {maxBranchesAllowed} Outlets
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (activeBranchesCount / (maxBranchesAllowed || 1)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Card 4: Staff */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400">
                <span>Staff Members</span>
                <Users className="h-5 w-5 text-sky-500" />
              </div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-mono">
                {activeStaffCount}
                <span className="text-sm sm:text-base font-normal text-slate-400 ml-1.5">
                  / {maxStaffAllowed} Staff
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (activeStaffCount / (maxStaffAllowed || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Pharmacy Business & Owner Details 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pharmacy Business Info */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-brand-primary" />
              <span>Pharmacy Business Details</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm sm:text-base">
              <div className="space-y-1">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 block">
                  Pharmacy Name
                </span>
                <strong className="text-base sm:text-lg font-bold text-slate-900 dark:text-white block">
                  {tenant.name}
                </strong>
              </div>

              <div className="space-y-1">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 block">
                  Business Email
                </span>
                <div className="text-slate-800 dark:text-slate-200 font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate">{tenant.email || "Not provided"}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 block">
                  Phone Number
                </span>
                <div className="text-slate-800 dark:text-slate-200 font-mono font-semibold flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{tenant.phone || "Not provided"}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 block">
                  Store Address
                </span>
                <div className="text-slate-800 dark:text-slate-200 font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{tenant.address || "Not specified"}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 block">
                  Registered Date
                </span>
                <div className="text-slate-800 dark:text-slate-200 font-semibold">
                  {new Date(tenant.createdAt).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 block">
                  Compliance Status
                </span>
                <div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{tenant.verificationStatus || "APPROVED"}</span>
                </div>
              </div>
            </div>

            {/* License Numbers Sub-grid */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 block">
                License & Regulatory Numbers
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-xs text-slate-400 block font-semibold">Trade License</span>
                  <strong className="text-sm sm:text-base font-mono font-bold text-slate-900 dark:text-white block mt-0.5">
                    {tenant.tradeLicenseNumber || "N/A"}
                  </strong>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-xs text-slate-400 block font-semibold">Drug License</span>
                  <strong className="text-sm sm:text-base font-mono font-bold text-slate-900 dark:text-white block mt-0.5">
                    {tenant.drugLicenseNumber || "N/A"}
                  </strong>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-xs text-slate-400 block font-semibold">Owner NID</span>
                  <strong className="text-sm sm:text-base font-mono font-bold text-slate-900 dark:text-white block mt-0.5">
                    {tenant.nidNumber || "N/A"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Account Status & Action */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 block">
                  Account Status
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 font-bold text-sm sm:text-base mt-0.5 ${
                    tenant.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${tenant.isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                  {tenant.isActive ? "Active Account" : "Suspended Account"}
                </span>
              </div>

              <button
                type="button"
                disabled={statusLoading}
                onClick={handleToggleStatus}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white shadow-xs transition inline-flex items-center gap-2 cursor-pointer active:scale-95 ${
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

          {/* Owner & Administrator Info */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-brand-primary" />
              <span>Owner & Administrator Details</span>
            </h2>

            {ownerUser ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm sm:text-base">
                <div className="space-y-1">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 block">
                    Full Name
                  </span>
                  <strong className="text-base sm:text-lg font-bold text-slate-900 dark:text-white block">
                    {ownerUser.name}
                  </strong>
                </div>

                <div className="space-y-1">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 block">
                    Username
                  </span>
                  <strong className="text-base sm:text-lg font-mono font-bold text-slate-800 dark:text-slate-200 block">
                    @{ownerUser.username}
                  </strong>
                </div>

                <div className="space-y-1">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 block">
                    Personal Email
                  </span>
                  <div className="text-slate-800 dark:text-slate-200 font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="truncate">{ownerUser.email}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 block">
                    Phone
                  </span>
                  <div className="text-slate-800 dark:text-slate-200 font-mono font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{ownerUser.phone || tenant.phone || "Not provided"}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 block">
                    Role in System
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-brand-primary/10 text-brand-primary font-bold text-xs sm:text-sm inline-block">
                    {ownerUser.role}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 block">
                    Account Status
                  </span>
                  <span
                    className={`font-bold text-xs sm:text-sm ${
                      ownerUser.isActive ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {ownerUser.isActive ? "Active Login Access" : "Access Suspended"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm sm:text-base">
                No owner profile associated with this account.
              </div>
            )}
          </div>
        </div>
      </div>
    )}

      {/* TAB 2: COMPLIANCE DOCUMENTS */}
      {activeTab === "documents" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {complianceDocs.map((doc) => {
              const hasDoc = Boolean(doc.url);
              const docIsPdf = isPdf(doc.url);

              return (
                <div
                  key={doc.id}
                  className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`h-10 w-10 rounded-2xl ${doc.bg} ${doc.color} flex items-center justify-center`}>
                        <doc.icon className="h-5 w-5" />
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                          hasDoc
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        }`}
                      >
                        {hasDoc ? (docIsPdf ? "PDF" : "Image") : "Missing"}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                        {doc.title}
                      </h3>
                      {doc.number && (
                        <div className="text-xs font-mono text-slate-500 mt-1">
                          No: <strong className="text-slate-800 dark:text-slate-200">{doc.number}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {hasDoc ? (
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setViewingDoc({ title: doc.title, url: doc.url!, number: doc.number });
                          setDocZoom(1);
                          setDocRotate(0);
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:!text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 group/btn"
                      >
                        <Maximize2 className="h-4 w-4 shrink-0 transition-colors group-hover/btn:!text-white" />
                        <span className="transition-colors group-hover/btn:!text-white">Preview</span>
                      </button>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition cursor-pointer"
                        title="Open in new window"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  ) : (
                    <div className="py-2.5 text-center text-xs text-slate-400 font-medium pt-3 border-t border-slate-100 dark:border-slate-800">
                      No document uploaded
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SUBSCRIPTIONS & BILLING */}
      {activeTab === "subscriptions" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <PharmacyBillingLedger
            tenant={tenant}
            ownerUser={ownerUser}
            onRefresh={loadTenantDetails}
          />
        </div>
      )}


      {/* TAB 4: BRANCHES & STAFF */}
      {activeTab === "branches" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-150">
          {/* Branches List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Store className="h-5 w-5 text-indigo-500" />
                <span>Store Branches ({tenant.branches?.length || 0})</span>
              </h2>
            </div>

            <div className="space-y-3">
              {(tenant.branches || []).length === 0 ? (
                <p className="text-slate-400 text-sm py-4">No branch outlets created yet.</p>
              ) : (
                (tenant.branches || []).map((branch: any) => (
                  <div
                    key={branch.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between"
                  >
                    <div>
                      <strong className="text-base font-bold text-slate-900 dark:text-white block">
                        {branch.name}
                      </strong>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {branch.location || branch.address || "Location not specified"}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        branch.isActive !== false
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-red-500/10 text-red-600"
                      }`}
                    >
                      {branch.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Staff List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-sky-500" />
                <span>Pharmacy Staff ({tenant.users?.length || 0})</span>
              </h2>
            </div>

            <div className="space-y-3">
              {(tenant.users || []).length === 0 ? (
                <p className="text-slate-400 text-sm py-4">No staff members created yet.</p>
              ) : (
                (tenant.users || []).map((user: any) => (
                  <div
                    key={user.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-base font-bold text-slate-900 dark:text-white">
                          {user.name}
                        </strong>
                        <span className="text-xs px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary font-bold">
                          {user.role}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {user.email} • {user.phone || "No phone"}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        user.isActive !== false
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-red-500/10 text-red-600"
                      }`}
                    >
                      {user.isActive !== false ? "Active" : "Disabled"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ZOOMABLE DOCUMENT PREVIEW MODAL                           */}
      {/* ========================================================= */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/70">
              <div>
                <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                  {viewingDoc.title}
                </h3>
                {viewingDoc.number && (
                  <p className="text-xs font-mono text-brand-primary">License No: {viewingDoc.number}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isPdf(viewingDoc.url) && (
                  <>
                    <button
                      type="button"
                      onClick={() => setDocZoom((z) => Math.max(0.5, z - 0.25))}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 px-1">
                      {Math.round(docZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setDocZoom((z) => Math.min(3, z + 0.25))}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocRotate((r) => (r + 90) % 360)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                      title="Rotate 90deg"
                    >
                      <RotateCw className="h-4 w-4" />
                    </button>
                  </>
                )}

                <a
                  href={viewingDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold transition flex items-center gap-1.5"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open Full</span>
                </a>

                <button
                  type="button"
                  onClick={() => setViewingDoc(null)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 overflow-auto flex items-center justify-center bg-slate-950/5 dark:bg-slate-950 min-h-[420px]">
              {isPdf(viewingDoc.url) ? (
                <iframe
                  src={viewingDoc.url}
                  className="w-full h-[580px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white"
                  title={viewingDoc.title}
                />
              ) : (
                <div className="overflow-auto max-h-[580px] flex items-center justify-center">
                  <img
                    src={viewingDoc.url}
                    alt={viewingDoc.title}
                    style={{
                      transform: `scale(${docZoom}) rotate(${docRotate}deg)`,
                      transition: "transform 0.15s ease",
                    }}
                    className="max-h-[540px] max-w-full object-contain rounded-2xl shadow-lg select-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
