"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  ExternalLink,
  Loader2,
  Eye,
  Check,
  X,
  CreditCard,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles,
  Layers,
  FileCheck,
  Pill,
  RefreshCw,
  Maximize2,
  AlertCircle,
  Copy,
  ZoomIn,
  ZoomOut,
  LayoutGrid,
  List,
  AlertTriangle,
  Building2,
  ShieldAlert,
} from "lucide-react";

interface VerificationApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  tier: string;
  isActive: boolean;
  verificationStatus: "PENDING_OTP" | "PENDING_APPROVAL" | "APPROVED_PENDING_PAYMENT" | "ACTIVE" | "REJECTED";
  nidNumber?: string;
  nidDocUrl?: string;
  nidFrontUrl?: string;
  nidBackUrl?: string;
  tradeLicenseNumber?: string;
  tradeLicenseDocUrl?: string;
  tradeLicenseFrontUrl?: string;
  tradeLicenseBackUrl?: string;
  drugLicenseNumber?: string;
  drugLicenseDocUrl?: string;
  drugLicenseFrontUrl?: string;
  drugLicenseBackUrl?: string;
  otpVerifiedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  approvalNotes?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  pendingPlanId?: string;
  pendingBillingCycle?: string;
  createdAt: string;
  owner?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    username: string;
  };
  subscription?: {
    id: string;
    status: string;
    plan?: {
      id: string;
      name: string;
      tier: string;
      price: number;
      maxBranches: number;
    };
  };
}

export function PharmacyVerificationTab() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<VerificationApplication[]>([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    pendingReview: 0,
    approved: 0,
    rejected: 0,
    active: 0,
  });

  const [selectedStatus, setSelectedStatus] = useState<string>("PENDING_APPROVAL");
  const [searchQuery, setSearchQuery] = useState("");
  const [plans, setPlans] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Date Filters
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "YESTERDAY" | "THIS_MONTH" | "LAST_MONTH" | "THIS_YEAR" | "CUSTOM">("ALL");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Selected for full detail modal
  const [detailApp, setDetailApp] = useState<VerificationApplication | null>(null);

  // Standalone Document Preview Modal
  const [viewingDoc, setViewingDoc] = useState<{ title: string; url: string; number?: string; docType?: string } | null>(null);

  // Approve Modal State
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [targetAppToApprove, setTargetAppToApprove] = useState<VerificationApplication | null>(null);
  const [approvePlanId, setApprovePlanId] = useState("");
  const [approveBillingCycle, setApproveBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [approveNotes, setApproveNotes] = useState("");
  const [approving, setApproving] = useState(false);

  // Reject Modal State
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [targetAppToReject, setTargetAppToReject] = useState<VerificationApplication | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Active document preview tab inside the Detail Modal
  const [activeDetailDocTab, setActiveDetailDocTab] = useState<"nid_front" | "nid_back" | "trade" | "drug">("nid_front");
  const [inspectorZoom, setInspectorZoom] = useState(1);
  const [inspectorRotate, setInspectorRotate] = useState(0);

  // Copied feedback helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Feedback Banner
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedStatus && selectedStatus !== "ALL") queryParams.set("status", selectedStatus);
      if (searchQuery.trim()) queryParams.set("search", searchQuery.trim());
      if (dateFilter && dateFilter !== "ALL") queryParams.set("datePreset", dateFilter);
      if (dateFilter === "CUSTOM") {
        if (customStartDate) queryParams.set("startDate", customStartDate);
        if (customEndDate) queryParams.set("endDate", customEndDate);
      }

      const [res, plansRes] = await Promise.all([
        fetchApi<any>(`/super-admin/verifications?${queryParams.toString()}`),
        fetchApi<any[]>("/super-admin/plans"),
      ]);

      if (res.success && res.data) {
        setApplications(res.data);
        if ((res as any).metrics) setMetrics((res as any).metrics);
      }

      if (plansRes.success && plansRes.data) {
        setPlans(plansRes.data);
      }
    } catch (err: any) {
      console.error("Failed to load pharmacy verification applications", err);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, dateFilter, customStartDate, customEndDate, searchQuery]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadApplications();
  };

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const openApproveModal = (app: VerificationApplication) => {
    setTargetAppToApprove(app);
    setApprovePlanId(app.pendingPlanId || app.subscription?.plan?.id || plans[0]?.id || "");
    setApproveBillingCycle((app.pendingBillingCycle as any) || "MONTHLY");
    setApproveNotes("");
    setIsApproveOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!targetAppToApprove) return;
    setApproving(true);
    setFeedback(null);

    try {
      const res = await fetchApi<any>(`/super-admin/verifications/${targetAppToApprove.id}/approve`, {
        method: "POST",
        body: JSON.stringify({
          planId: approvePlanId,
          billingCycle: approveBillingCycle,
          notes: approveNotes,
        }),
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message || `Application for "${targetAppToApprove.name}" approved successfully! Approval email with checkout link dispatched.`,
        });
        setIsApproveOpen(false);
        setDetailApp(null);
        loadApplications();
      } else {
        throw new Error(res.message || "Failed to approve application");
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Approval failed." });
    } finally {
      setApproving(false);
    }
  };

  const openRejectModal = (app: VerificationApplication) => {
    setTargetAppToReject(app);
    setRejectReason("");
    setIsRejectOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!targetAppToReject) return;
    if (!rejectReason.trim()) {
      setFeedback({ type: "error", message: "Please enter a specific rejection reason for the applicant." });
      return;
    }

    setRejecting(true);
    setFeedback(null);

    try {
      const res = await fetchApi<any>(`/super-admin/verifications/${targetAppToReject.id}/reject`, {
        method: "POST",
        body: JSON.stringify({
          reason: rejectReason.trim(),
        }),
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message || `Application for "${targetAppToReject.name}" marked as rejected. Notice email sent.`,
        });
        setIsRejectOpen(false);
        setDetailApp(null);
        loadApplications();
      } else {
        throw new Error(res.message || "Failed to reject application");
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Rejection failed." });
    } finally {
      setRejecting(false);
    }
  };

  const isPdf = (url?: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes(".pdf") || lower.includes("/raw/") || lower.startsWith("data:application/pdf");
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  // Document Readiness Score (e.g. 3 of 3 uploaded)
  const getDocumentReadiness = (app: VerificationApplication) => {
    const hasNid = Boolean(app.nidFrontUrl || app.nidDocUrl);
    const hasTrade = Boolean(app.tradeLicenseDocUrl || app.tradeLicenseFrontUrl);
    const hasDrug = Boolean(app.drugLicenseDocUrl || app.drugLicenseFrontUrl);

    const count = (hasNid ? 1 : 0) + (hasTrade ? 1 : 0) + (hasDrug ? 1 : 0);
    return {
      count,
      total: 3,
      isComplete: count === 3,
      hasNid,
      hasTrade,
      hasDrug,
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_APPROVAL":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Pending Review
          </span>
        );
      case "APPROVED_PENDING_PAYMENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30">
            <Clock className="h-3.5 w-3.5" />
            Approved (Awaiting Payment)
          </span>
        );
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Active & Paid
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <XCircle className="h-3.5 w-3.5" />
            Rejected
          </span>
        );
      case "PENDING_OTP":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30">
            <Clock className="h-3.5 w-3.5" />
            Pending Email OTP
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 max-w-full pb-12">
      {/* Clean, Minimal Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-brand-primary shrink-0" />
            <span>Pharmacy Verification</span>
            {metrics.pendingReview > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                {metrics.pendingReview} Pending
              </span>
            )}
          </h1>
        </div>

        <button
          type="button"
          onClick={loadApplications}
          disabled={loading}
          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2 cursor-pointer shadow-xs self-start sm:self-auto active:scale-95"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-brand-primary" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Clickable Status KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Pending Review */}
        <div
          onClick={() => setSelectedStatus("PENDING_APPROVAL")}
          className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            selectedStatus === "PENDING_APPROVAL"
              ? "bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30 shadow-md shadow-amber-500/10"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              Pending Review
              {selectedStatus === "PENDING_APPROVAL" && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
              )}
            </span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {metrics.pendingReview}
          </div>
        </div>

        {/* Card 2: Awaiting Payment */}
        <div
          onClick={() => setSelectedStatus("APPROVED_PENDING_PAYMENT")}
          className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            selectedStatus === "APPROVED_PENDING_PAYMENT"
              ? "bg-sky-500/10 border-sky-500 ring-2 ring-sky-500/30 shadow-md shadow-sky-500/10"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-sky-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              Awaiting Payment
            </span>
            <CreditCard className="h-4 w-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {metrics.approved}
          </div>
        </div>

        {/* Card 3: Active & Paid */}
        <div
          onClick={() => setSelectedStatus("ACTIVE")}
          className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            selectedStatus === "ACTIVE"
              ? "bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30 shadow-md shadow-emerald-500/10"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Active & Paid
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {metrics.active}
          </div>
        </div>

        {/* Card 4: Rejected */}
        <div
          onClick={() => setSelectedStatus("REJECTED")}
          className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            selectedStatus === "REJECTED"
              ? "bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/30 shadow-md shadow-rose-500/10"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Rejected
            </span>
            <XCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {metrics.rejected}
          </div>
        </div>

        {/* Card 5: Total Applications */}
        <div
          onClick={() => setSelectedStatus("ALL")}
          className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            selectedStatus === "ALL"
              ? "bg-brand-primary/10 border-brand-primary ring-2 ring-brand-primary/30 shadow-md shadow-brand-primary/10"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Total
            </span>
            <Layers className="h-4 w-4 text-brand-primary" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {metrics.total}
          </div>
        </div>
      </div>

      {/* Date Filter & Search Panel */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            {[
              { id: "ALL", label: "All Time" },
              { id: "TODAY", label: "Today" },
              { id: "YESTERDAY", label: "Yesterday" },
              { id: "THIS_MONTH", label: "This Month" },
              { id: "LAST_MONTH", label: "Last Month" },
              { id: "THIS_YEAR", label: "This Year" },
              { id: "CUSTOM", label: "Custom" },
            ].map((df) => (
              <button
                key={df.id}
                type="button"
                onClick={() => setDateFilter(df.id as any)}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  dateFilter === df.id
                    ? "bg-brand-primary text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {df.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72 shrink-0">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pharmacy, owner, email..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </form>
        </div>

        {/* Custom Date Pickers */}
        {dateFilter === "CUSTOM" && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="p-1 hover:opacity-70 cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Table Content */}
      {loading ? (
        <div className="py-20 text-center space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary mx-auto" />
          <p className="text-xs font-bold text-slate-500">Loading pharmacy applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500 p-6">
          <ShieldCheck className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700" />
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
            {selectedStatus === "PENDING_APPROVAL" ? "No Pending Verifications" : "No Applications Found"}
          </h3>
          <p className="text-xs max-w-sm mx-auto text-slate-400">
            {selectedStatus === "PENDING_APPROVAL"
              ? "All pharmacy compliance submissions have been reviewed."
              : "No records found matching this filter."}
          </p>
          {selectedStatus !== "ALL" && (
            <button
              type="button"
              onClick={() => setSelectedStatus("ALL")}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              View All Applications
            </button>
          )}
        </div>
      ) : (
        /* ========================================================= */
        /* CLEAN, MINIMAL & PROFESSIONAL DATA TABLE                  */
        /* ========================================================= */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-xs font-black uppercase tracking-wider text-slate-500 select-none">
                <tr>
                  <th className="py-4 px-6">Pharmacy</th>
                  <th className="py-4 px-6">Owner</th>
                  <th className="py-4 px-6">Plan</th>
                  <th className="py-4 px-6">Applied Date</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {applications
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((app) => {
                    const plan = app.subscription?.plan;
                    const price = plan?.price || 0;
                    const billing = app.pendingBillingCycle || "MONTHLY";
                    const payableAmount = billing === "YEARLY" ? Math.round(Number(price) * 12 * 0.85) : Number(price);

                    return (
                      <tr
                        key={app.id}
                        onClick={() => {
                          setDetailApp(app);
                          setActiveDetailDocTab(app.nidFrontUrl ? "nid_front" : app.tradeLicenseDocUrl ? "trade" : "drug");
                          setInspectorZoom(1);
                          setInspectorRotate(0);
                        }}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer group"
                      >
                        {/* 1. Pharmacy Name & Location */}
                        <td className="py-4 px-6">
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white text-base">
                              {app.name}
                            </div>
                            <div className="text-xs text-slate-400 font-medium truncate max-w-[260px] mt-0.5">
                              {app.address || "Address not specified"}
                            </div>
                          </div>
                        </td>

                        {/* 2. Owner & Contact */}
                        <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                              {app.owner?.name || "Dr. Owner"}
                            </div>
                            <div className="font-mono text-slate-500 text-xs flex items-center gap-1.5 mt-0.5">
                              <span>{app.phone}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(app.phone, `tbl-phone-${app.id}`)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                title="Copy Phone"
                              >
                                {copiedKey === `tbl-phone-${app.id}` ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 3. Selected Plan & Price */}
                        <td className="py-4 px-6">
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                              {plan?.name || app.tier} Plan
                            </div>
                            <div className="text-xs text-brand-primary font-mono font-bold mt-0.5">
                              ৳{payableAmount.toLocaleString()}/{billing === "YEARLY" ? "yr" : "mo"}
                            </div>
                          </div>
                        </td>

                        {/* 4. Applied Date */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="text-slate-800 dark:text-slate-200 font-semibold text-sm">
                            {new Date(app.createdAt).toLocaleDateString("en-US", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {formatTimeAgo(app.createdAt)}
                          </div>
                        </td>

                        {/* 5. Status Badge */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          {getStatusBadge(app.verificationStatus)}
                        </td>

                        {/* 6. Action Button */}
                        <td className="py-4 px-6 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setDetailApp(app);
                              setActiveDetailDocTab(app.nidFrontUrl ? "nid_front" : app.tradeLicenseDocUrl ? "trade" : "drug");
                              setInspectorZoom(1);
                              setInspectorRotate(0);
                            }}
                            className="group/btn px-4 py-2 rounded-xl bg-brand-primary/10 hover:bg-brand-primary border border-brand-primary/25 font-bold text-xs sm:text-sm transition-colors inline-flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
                            title="Inspect Documents, Verify & Take Action"
                          >
                            <Eye className="h-4 w-4 text-brand-primary group-hover/btn:!text-white transition-colors" />
                            <span className="text-brand-primary group-hover/btn:!text-white transition-colors">Review Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 font-medium">
              Showing{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {applications.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </strong>{" "}
              to{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {Math.min(currentPage * pageSize, applications.length)}
              </strong>{" "}
              of{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {applications.length}
              </strong>{" "}
              pharmacies
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 mr-2 text-slate-400">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>

              <span className="px-2 font-mono font-bold text-slate-600 dark:text-slate-400">
                {currentPage} / {Math.max(1, Math.ceil(applications.length / pageSize))}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(p + 1, Math.ceil(applications.length / pageSize))
                  )
                }
                disabled={currentPage >= Math.ceil(applications.length / pageSize)}
                className="px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* COMPREHENSIVE KYC & COMPLIANCE INSPECTION MODAL           */}
      {/* ========================================================= */}
      {detailApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-6xl w-full max-h-[94vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/70">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-primary to-sky-600 text-white font-black text-lg flex items-center justify-center shadow-md">
                  {detailApp.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {detailApp.name}
                    </h3>
                    {getStatusBadge(detailApp.verificationStatus)}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Regulatory Compliance Inspection &bull; Owner: <strong>{detailApp.owner?.name}</strong> &bull; Submitted: {new Date(detailApp.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailApp(null)}
                className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Business & Application Dossier */}
              <div className="lg:col-span-5 space-y-4 text-xs">
                {/* Profile Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <div className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] text-brand-primary flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    Business Profile & Credentials
                  </div>
                  <div className="space-y-2 text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Owner Name:</span>
                      <strong className="text-slate-900 dark:text-white">{detailApp.owner?.name || "Dr. Owner"}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Login Email:</span>
                      <span className="font-mono text-slate-900 dark:text-white">{detailApp.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Phone:</span>
                      <span className="font-mono text-slate-900 dark:text-white">{detailApp.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Address:</span>
                      <span className="text-right truncate max-w-[200px] text-slate-900 dark:text-white">{detailApp.address || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Email OTP:</span>
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        {detailApp.otpVerifiedAt ? "Verified" : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Regulatory Document Numbers */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <div className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] text-brand-primary flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Government License Numbers
                  </div>
                  <div className="space-y-2 text-slate-600 dark:text-slate-300">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">National ID</div>
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {detailApp.nidNumber || "Not Provided"}
                        </div>
                      </div>
                      {detailApp.nidNumber && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(detailApp.nidNumber!, "modal-nid")}
                          className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {copiedKey === "modal-nid" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Trade License</div>
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {detailApp.tradeLicenseNumber || "Not Provided"}
                        </div>
                      </div>
                      {detailApp.tradeLicenseNumber && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(detailApp.tradeLicenseNumber!, "modal-trade")}
                          className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {copiedKey === "modal-trade" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">DGDA Drug License</div>
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {detailApp.drugLicenseNumber || "Not Provided"}
                        </div>
                      </div>
                      {detailApp.drugLicenseNumber && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(detailApp.drugLicenseNumber!, "modal-drug")}
                          className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {copiedKey === "modal-drug" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Plan Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] text-brand-primary flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    Target Subscription
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {detailApp.subscription?.plan?.name || detailApp.tier} Plan
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Billing Cycle: {detailApp.pendingBillingCycle || "MONTHLY"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black font-mono text-brand-primary">
                        ৳{(detailApp.pendingBillingCycle === "YEARLY"
                          ? Math.round(Number(detailApp.subscription?.plan?.price || 1500) * 12 * 0.85)
                          : Number(detailApp.subscription?.plan?.price || 1500)).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: High-Res Document Inspector Workbench */}
              <div className="lg:col-span-7 flex flex-col space-y-3">
                {/* Document Selector Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDetailDocTab("nid_front");
                      setInspectorZoom(1);
                      setInspectorRotate(0);
                    }}
                    className={`flex-1 py-2 px-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 text-[11px] ${
                      activeDetailDocTab === "nid_front"
                        ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>NID Front</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveDetailDocTab("nid_back");
                      setInspectorZoom(1);
                      setInspectorRotate(0);
                    }}
                    className={`flex-1 py-2 px-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 text-[11px] ${
                      activeDetailDocTab === "nid_back"
                        ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>NID Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveDetailDocTab("trade");
                      setInspectorZoom(1);
                      setInspectorRotate(0);
                    }}
                    className={`flex-1 py-2 px-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 text-[11px] ${
                      activeDetailDocTab === "trade"
                        ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <FileCheck className="h-3.5 w-3.5" />
                    <span>Trade Lic</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveDetailDocTab("drug");
                      setInspectorZoom(1);
                      setInspectorRotate(0);
                    }}
                    className={`flex-1 py-2 px-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 text-[11px] ${
                      activeDetailDocTab === "drug"
                        ? "bg-white dark:bg-slate-900 text-purple-600 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Pill className="h-3.5 w-3.5" />
                    <span>DGDA Lic</span>
                  </button>
                </div>

                {/* Active Document Viewer Area */}
                {(() => {
                  let docUrl = "";
                  let docTitle = "";
                  let docNumber = "";

                  if (activeDetailDocTab === "nid_front") {
                    docUrl = detailApp.nidFrontUrl || detailApp.nidDocUrl || "";
                    docTitle = `National ID (Front Side) - ${detailApp.name}`;
                    docNumber = detailApp.nidNumber || "";
                  } else if (activeDetailDocTab === "nid_back") {
                    docUrl = detailApp.nidBackUrl || "";
                    docTitle = `National ID (Back Side) - ${detailApp.name}`;
                    docNumber = detailApp.nidNumber || "";
                  } else if (activeDetailDocTab === "trade") {
                    docUrl = detailApp.tradeLicenseDocUrl || detailApp.tradeLicenseFrontUrl || "";
                    docTitle = `Trade License Document - ${detailApp.name}`;
                    docNumber = detailApp.tradeLicenseNumber || "";
                  } else if (activeDetailDocTab === "drug") {
                    docUrl = detailApp.drugLicenseDocUrl || detailApp.drugLicenseFrontUrl || "";
                    docTitle = `DGDA Drug License - ${detailApp.name}`;
                    docNumber = detailApp.drugLicenseNumber || "";
                  }

                  if (!docUrl) {
                    return (
                      <div className="flex-1 min-h-[420px] rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-850/50">
                        <FileText className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
                        <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Document Not Uploaded</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs">
                          The applicant has not attached a file for this document category.
                        </p>
                      </div>
                    );
                  }

                  const pdf = isPdf(docUrl);

                  return (
                    <div className="flex-1 min-h-[420px] rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-950/5 dark:bg-slate-950 flex flex-col overflow-hidden relative shadow-inner">
                      {/* Top Inspector Bar */}
                      <div className="p-3 bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs gap-2">
                        <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {docTitle} {docNumber && <span className="font-mono text-slate-400 font-normal">({docNumber})</span>}
                        </div>

                        {/* Inspection Controls: Zoom, Rotate, New Tab */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!pdf && (
                            <>
                              <button
                                type="button"
                                onClick={() => setInspectorZoom((prev) => Math.min(prev + 0.25, 3))}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                                title="Zoom In"
                              >
                                <ZoomIn className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setInspectorZoom((prev) => Math.max(prev - 0.25, 0.5))}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                                title="Zoom Out"
                              >
                                <ZoomOut className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setInspectorRotate((prev) => (prev + 90) % 360)}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                                title="Rotate 90°"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}

                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>New Tab</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => setViewingDoc({ title: docTitle, url: docUrl, number: docNumber })}
                            className="px-2.5 py-1.5 rounded-lg bg-brand-primary text-white font-bold text-[11px] hover:opacity-90 transition flex items-center gap-1 cursor-pointer"
                          >
                            <Maximize2 className="h-3 w-3" />
                            <span>Full View</span>
                          </button>
                        </div>
                      </div>

                      {/* Display Area */}
                      <div className="flex-1 flex items-center justify-center p-4 overflow-auto min-h-[380px]">
                        {pdf ? (
                          <iframe
                            src={docUrl}
                            className="w-full h-[400px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white shadow-sm"
                            title={docTitle}
                          />
                        ) : (
                          <div className="overflow-auto max-h-[420px] max-w-full flex items-center justify-center">
                            <img
                              src={docUrl}
                              alt={docTitle}
                              style={{
                                transform: `scale(${inspectorZoom}) rotate(${inspectorRotate}deg)`,
                                transition: "transform 0.2s ease",
                              }}
                              className="max-h-[380px] max-w-full object-contain rounded-2xl shadow-md"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setDetailApp(null)}
                className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition cursor-pointer w-full sm:w-auto"
              >
                Close Dossier
              </button>

              {detailApp.verificationStatus === "PENDING_APPROVAL" && (
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => openRejectModal(detailApp)}
                    className="px-5 py-2.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer flex-1 sm:flex-none justify-center"
                  >
                    <X className="h-4 w-4" />
                    <span>Reject Application</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openApproveModal(detailApp)}
                    className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition flex items-center gap-2 cursor-pointer flex-1 sm:flex-none justify-center"
                  >
                    <Check className="h-4 w-4" />
                    <span>Approve Pharmacy</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STANDALONE DOCUMENT PREVIEW MODAL                         */}
      {/* ========================================================= */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  {viewingDoc.title}
                </h3>
                {viewingDoc.number && (
                  <p className="text-xs font-mono text-brand-primary">Document/License No: {viewingDoc.number}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewingDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setViewingDoc(null)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-auto flex items-center justify-center bg-slate-950/5 dark:bg-slate-950">
              {isPdf(viewingDoc.url) ? (
                <iframe
                  src={viewingDoc.url}
                  className="w-full h-[600px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white"
                  title={viewingDoc.title}
                />
              ) : (
                <img
                  src={viewingDoc.url}
                  alt={viewingDoc.title}
                  className="max-h-[600px] max-w-full object-contain rounded-2xl shadow-xl"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* APPROVE CONFIRMATION MODAL                                */}
      {/* ========================================================= */}
      {isApproveOpen && targetAppToApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Approve Pharmacy Onboarding
                  </h3>
                  <p className="text-xs text-slate-500">
                    Applicant: <strong>{targetAppToApprove.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApproveOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm Subscription Plan
                </label>
                <select
                  value={approvePlanId}
                  onChange={(e) => setApprovePlanId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.tier}) &bull; ৳{Number(p.price).toLocaleString()}/month
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Billing Cycle
                </label>
                <div className="grid grid-cols-2 gap-2 font-bold text-xs">
                  <button
                    type="button"
                    onClick={() => setApproveBillingCycle("MONTHLY")}
                    className={`py-2.5 rounded-xl border transition cursor-pointer ${
                      approveBillingCycle === "MONTHLY"
                        ? "bg-brand-primary text-white border-brand-primary shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setApproveBillingCycle("YEARLY")}
                    className={`py-2.5 rounded-xl border transition cursor-pointer ${
                      approveBillingCycle === "YEARLY"
                        ? "bg-brand-primary text-white border-brand-primary shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600"
                    }`}
                  >
                    Yearly (-15% Discount)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Compliance Reference / Approval Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  placeholder="e.g. NID, Trade License, and DGDA Drug License verified & approved."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed">
                <strong>Automated Flow:</strong> Upon approval, an official congratulatory email containing the secure SSLCOMMERZ checkout link will immediately be sent to <strong>{targetAppToApprove.email}</strong>. Once payment clears, their pharmacy dashboard unlocks automatically.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsApproveOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={approving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {approving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Dispatching Approval Email...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Confirm Approval & Send Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* REJECT CONFIRMATION MODAL                                 */}
      {/* ========================================================= */}
      {isRejectOpen && targetAppToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-rose-500/15 text-rose-600 flex items-center justify-center shadow-sm">
                  <XCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Reject Pharmacy Application
                  </h3>
                  <p className="text-xs text-slate-500">
                    Applicant: <strong>{targetAppToReject.name}</strong> ({targetAppToReject.email})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRejectOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Reason for Rejection (Required) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Clearly explain what document was invalid, expired, or missing so the applicant can correct it..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Quick Preset Reason Chips */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Quick Reason Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Illegible/blurry document photos",
                    "DGDA Drug License has expired",
                    "NID Number does not match applicant details",
                    "Missing back side of National ID",
                    "Incomplete Trade License document",
                    "Invalid pharmacy physical address",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectReason(preset)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] font-medium transition cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-[11px] leading-relaxed">
                A formal notice including your rejection reason will be dispatched to <strong>{targetAppToReject.email}</strong>. The applicant can re-submit after correcting the issue.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={rejecting || !rejectReason.trim()}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-500/25 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {rejecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sending Rejection Notice...</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4" />
                    <span>Confirm Rejection & Send Notice</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
