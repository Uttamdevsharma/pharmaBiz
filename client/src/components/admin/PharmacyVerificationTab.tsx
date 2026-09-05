"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import {
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  ExternalLink,
  Loader2,
  Eye,
  Check,
  X,
  CreditCard,
  Building2,
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
  ChevronRight,
  Maximize2,
  Download,
  AlertCircle,
  HelpCircle,
  Info,
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

  // Feedback Banner
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedStatus && selectedStatus !== "ALL") queryParams.set("status", selectedStatus);
      if (searchQuery.trim()) queryParams.set("search", searchQuery.trim());

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
  };

  useEffect(() => {
    loadApplications();
  }, [selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadApplications();
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
          message: res.message || `Application for "${targetAppToApprove.name}" approved successfully! Approval email dispatched.`,
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_APPROVAL":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
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

  const isPdf = (url?: string) => {
    if (!url) return false;
    return url.toLowerCase().includes(".pdf") || url.toLowerCase().startsWith("data:application/pdf");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-brand-primary/10 via-brand-primary/5 to-transparent p-6 rounded-3xl border border-brand-primary/15 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-primary/15 text-brand-primary mb-2">
            <ShieldCheck className="h-4 w-4" />
            Compliance Inspection & Approvals
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Pharmacy Verification Portal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Review pharmacy registration compliance, inspect National ID (Front & Back), Trade License, and DGDA Drug License documents, and approve or reject onboarding applications.
          </p>
        </div>

        <button
          type="button"
          onClick={loadApplications}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2 shadow-xs cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-brand-primary" : ""}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div
          onClick={() => setSelectedStatus("PENDING_APPROVAL")}
          className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            selectedStatus === "PENDING_APPROVAL"
              ? "bg-amber-500/10 border-amber-500/40 shadow-sm"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Pending Review
            </span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {metrics.pendingReview}
          </div>
        </div>

        <div
          onClick={() => setSelectedStatus("APPROVED_PENDING_PAYMENT")}
          className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            selectedStatus === "APPROVED_PENDING_PAYMENT"
              ? "bg-sky-500/10 border-sky-500/40 shadow-sm"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
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

        <div
          onClick={() => setSelectedStatus("ACTIVE")}
          className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            selectedStatus === "ACTIVE"
              ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
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

        <div
          onClick={() => setSelectedStatus("REJECTED")}
          className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            selectedStatus === "REJECTED"
              ? "bg-rose-500/10 border-rose-500/40 shadow-sm"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
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

        <div
          onClick={() => setSelectedStatus("ALL")}
          className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
            selectedStatus === "ALL"
              ? "bg-brand-primary/10 border-brand-primary/40 shadow-sm"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Total Applications
            </span>
            <Layers className="h-4 w-4 text-brand-primary" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {metrics.total}
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="p-1 hover:opacity-70">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs font-bold">
          {[
            { key: "PENDING_APPROVAL", label: "Pending Review", count: metrics.pendingReview },
            { key: "APPROVED_PENDING_PAYMENT", label: "Awaiting Payment", count: metrics.approved },
            { key: "ACTIVE", label: "Active & Paid", count: metrics.active },
            { key: "REJECTED", label: "Rejected", count: metrics.rejected },
            { key: "ALL", label: "All", count: metrics.total },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedStatus(tab.key)}
              className={`px-3.5 py-2 rounded-xl transition whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                selectedStatus === tab.key
                  ? "bg-brand-primary text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                  selectedStatus === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pharmacy, owner, email..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </form>
      </div>

      {/* Main Content: Card Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary mx-auto" />
          <p className="text-xs font-bold text-slate-500">Loading pharmacy verification applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500">
          <ShieldCheck className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700" />
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
            No applications found for this filter
          </h3>
          <p className="text-xs max-w-sm mx-auto text-slate-400">
            New pharmacy registrations or compliance submissions will appear here for regulatory review.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {applications.map((app) => {
            const plan = app.subscription?.plan;
            const price = plan?.price || 0;
            const billing = app.pendingBillingCycle || "MONTHLY";
            const payableAmount = billing === "YEARLY" ? Math.round(Number(price) * 12 * 0.85) : Number(price);

            return (
              <div
                key={app.id}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-primary to-sky-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-sm">
                        {app.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                          {app.name}
                        </h2>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            {app.owner?.name || "Dr. Owner"}
                          </span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1 text-[11px]">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {new Date(app.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>{getStatusBadge(app.verificationStatus)}</div>
                  </div>

                  {/* Contact Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{app.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{app.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate sm:col-span-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{app.address || "HQ Location"}</span>
                    </div>
                  </div>
                </div>

                {/* Document Preview Cards Section */}
                <div className="p-5 space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Regulatory Compliance Documents</span>
                    <span className="text-[10px] text-brand-primary">Click to inspect</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    {/* 1. NID Card */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary">National ID</span>
                          <FileText className="h-3.5 w-3.5 text-brand-primary" />
                        </div>
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs mt-1 truncate">
                          {app.nidNumber || "—"}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {(app.nidFrontUrl || app.nidDocUrl) ? (
                          <button
                            type="button"
                            onClick={() =>
                              setViewingDoc({
                                title: `NID Front Side - ${app.name}`,
                                url: (app.nidFrontUrl || app.nidDocUrl)!,
                                number: app.nidNumber,
                                docType: "National ID (Front)",
                              })
                            }
                            className="py-1.5 px-2 rounded-xl bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary font-bold text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Front</span>
                          </button>
                        ) : (
                          <span className="py-1.5 text-center text-[10px] text-slate-400 bg-slate-200/50 rounded-xl">No Front</span>
                        )}

                        {app.nidBackUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setViewingDoc({
                                title: `NID Back Side - ${app.name}`,
                                url: app.nidBackUrl!,
                                number: app.nidNumber,
                                docType: "National ID (Back)",
                              })
                            }
                            className="py-1.5 px-2 rounded-xl bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary font-bold text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Back</span>
                          </button>
                        ) : (
                          <span className="py-1.5 text-center text-[10px] text-slate-400 bg-slate-200/50 rounded-xl">No Back</span>
                        )}
                      </div>
                    </div>

                    {/* 2. Trade License Card */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Trade License</span>
                          <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                        </div>
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs mt-1 truncate">
                          {app.tradeLicenseNumber || "—"}
                        </div>
                      </div>

                      <div className="pt-1">
                        {(app.tradeLicenseDocUrl || app.tradeLicenseFrontUrl) ? (
                          <button
                            type="button"
                            onClick={() =>
                              setViewingDoc({
                                title: `Trade License Document - ${app.name}`,
                                url: (app.tradeLicenseDocUrl || app.tradeLicenseFrontUrl)!,
                                number: app.tradeLicenseNumber,
                                docType: "Trade License Document",
                              })
                            }
                            className="w-full py-1.5 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 font-bold text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                            <span>View Trade License</span>
                          </button>
                        ) : (
                          <span className="block py-1.5 text-center text-[10px] text-slate-400 bg-slate-200/50 rounded-xl">No Document</span>
                        )}
                      </div>
                    </div>

                    {/* 3. Drug License Card */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">DGDA License</span>
                          <Pill className="h-3.5 w-3.5 text-purple-600" />
                        </div>
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs mt-1 truncate">
                          {app.drugLicenseNumber || "—"}
                        </div>
                      </div>

                      <div className="pt-1">
                        {(app.drugLicenseDocUrl || app.drugLicenseFrontUrl) ? (
                          <button
                            type="button"
                            onClick={() =>
                              setViewingDoc({
                                title: `DGDA Drug License Document - ${app.name}`,
                                url: (app.drugLicenseDocUrl || app.drugLicenseFrontUrl)!,
                                number: app.drugLicenseNumber,
                                docType: "DGDA Drug License Document",
                              })
                            }
                            className="w-full py-1.5 px-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 font-bold text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                            <span>View DGDA License</span>
                          </button>
                        ) : (
                          <span className="block py-1.5 text-center text-[10px] text-slate-400 bg-slate-200/50 rounded-xl">No Document</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rejection / Approval History Note if present */}
                  {app.verificationStatus === "REJECTED" && app.rejectionReason && (
                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300">
                      <strong>Rejection Reason:</strong> "{app.rejectionReason}"
                    </div>
                  )}

                  {app.verificationStatus === "APPROVED_PENDING_PAYMENT" && app.approvalNotes && (
                    <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-700 dark:text-sky-300">
                      <strong>Approval Notes:</strong> "{app.approvalNotes}"
                    </div>
                  )}
                </div>

                {/* Card Footer: Plan & Primary Actions */}
                <div className="p-5 bg-slate-50/80 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {plan?.name || app.tier} Plan
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {billing} &bull; <strong className="font-mono text-brand-primary">৳{payableAmount.toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setDetailApp(app);
                        setActiveDetailDocTab(app.nidFrontUrl ? "nid_front" : app.tradeLicenseDocUrl ? "trade" : "drug");
                      }}
                      className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-primary text-slate-700 dark:text-slate-200 font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 text-brand-primary" />
                      <span>Review Details</span>
                    </button>

                    {app.verificationStatus === "PENDING_APPROVAL" && (
                      <>
                        <button
                          type="button"
                          onClick={() => openRejectModal(app)}
                          className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openApproveModal(app)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Approve</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* COMPREHENSIVE DETAIL INSPECTION MODAL                      */}
      {/* ========================================================= */}
      {detailApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-5xl w-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-brand-primary text-white font-black flex items-center justify-center">
                  {detailApp.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {detailApp.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Compliance Verification & Review &bull; Owner: <strong>{detailApp.owner?.name}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {getStatusBadge(detailApp.verificationStatus)}
                <button
                  type="button"
                  onClick={() => setDetailApp(null)}
                  className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Business & Application Info */}
              <div className="lg:col-span-5 space-y-4 text-xs">
                {/* Profile Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] text-brand-primary">
                    Business Profile & Contacts
                  </div>
                  <div className="space-y-2 text-slate-600 dark:text-slate-300">
                    <div><strong>Owner Name:</strong> {detailApp.owner?.name || "Dr. Owner"}</div>
                    <div><strong>Login Email:</strong> <span className="font-mono">{detailApp.email}</span></div>
                    <div><strong>Contact Phone:</strong> <span className="font-mono">{detailApp.phone}</span></div>
                    <div><strong>HQ Location:</strong> {detailApp.address || "—"}</div>
                    <div><strong>Submitted Date:</strong> {new Date(detailApp.createdAt).toLocaleString()}</div>
                    {detailApp.otpVerifiedAt && (
                      <div><strong>OTP Confirmed:</strong> {new Date(detailApp.otpVerifiedAt).toLocaleString()}</div>
                    )}
                  </div>
                </div>

                {/* Plan Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] text-brand-primary">
                    Selected Subscription
                  </div>
                  <div className="space-y-1 text-slate-600 dark:text-slate-300">
                    <div><strong>Plan Tier:</strong> {detailApp.subscription?.plan?.name || detailApp.tier}</div>
                    <div><strong>Billing Cycle:</strong> {detailApp.pendingBillingCycle || "MONTHLY"}</div>
                    <div className="text-sm font-black font-mono text-brand-primary pt-1">
                      Payable: ৳{(detailApp.pendingBillingCycle === "YEARLY"
                        ? Math.round(Number(detailApp.subscription?.plan?.price || 1500) * 12 * 0.85)
                        : Number(detailApp.subscription?.plan?.price || 1500)).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Regulatory Document Numbers */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] text-brand-primary">
                    License Numbers
                  </div>
                  <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                    <div>
                      <strong>National ID:</strong>{" "}
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{detailApp.nidNumber || "—"}</span>
                    </div>
                    <div>
                      <strong>Trade License:</strong>{" "}
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{detailApp.tradeLicenseNumber || "—"}</span>
                    </div>
                    <div>
                      <strong>DGDA Drug License:</strong>{" "}
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{detailApp.drugLicenseNumber || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: High-Res Document Preview Tabs & Viewer */}
              <div className="lg:col-span-7 flex flex-col space-y-3">
                {/* Document Selector Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveDetailDocTab("nid_front")}
                    className={`flex-1 py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
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
                    onClick={() => setActiveDetailDocTab("nid_back")}
                    className={`flex-1 py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
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
                    onClick={() => setActiveDetailDocTab("trade")}
                    className={`flex-1 py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
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
                    onClick={() => setActiveDetailDocTab("drug")}
                    className={`flex-1 py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeDetailDocTab === "drug"
                        ? "bg-white dark:bg-slate-900 text-purple-600 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Pill className="h-3.5 w-3.5" />
                    <span>DGDA Lic</span>
                  </button>
                </div>

                {/* Active Document View Area */}
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
                      <div className="flex-1 min-h-[380px] rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                        <FileText className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                        <p className="font-bold text-xs">No document attached for this tab.</p>
                      </div>
                    );
                  }

                  const pdf = isPdf(docUrl);

                  return (
                    <div className="flex-1 min-h-[420px] rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-950/5 dark:bg-slate-950 flex flex-col overflow-hidden relative">
                      {/* Top Action Bar for current doc */}
                      <div className="p-3 bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {docTitle} {docNumber && <span className="font-mono text-slate-400">({docNumber})</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>New Tab</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => setViewingDoc({ title: docTitle, url: docUrl, number: docNumber })}
                            className="px-2.5 py-1 rounded-lg bg-brand-primary text-white font-bold text-[11px] hover:opacity-90 transition flex items-center gap-1 cursor-pointer"
                          >
                            <Maximize2 className="h-3 w-3" />
                            <span>Full Preview</span>
                          </button>
                        </div>
                      </div>

                      {/* Display Area */}
                      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                        {pdf ? (
                          <iframe
                            src={docUrl}
                            className="w-full h-[400px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white"
                            title={docTitle}
                          />
                        ) : (
                          <img
                            src={docUrl}
                            alt={docTitle}
                            className="max-h-[380px] max-w-full object-contain rounded-2xl shadow-md"
                          />
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setDetailApp(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition"
              >
                Close Inspection
              </button>

              {detailApp.verificationStatus === "PENDING_APPROVAL" && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      openRejectModal(detailApp);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                    <span>Reject Application</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      openApproveModal(detailApp);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg transition flex items-center gap-2 cursor-pointer"
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
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setViewingDoc(null)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-auto flex items-center justify-center bg-slate-950/5 dark:bg-slate-950">
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

      {/* ========================================================= */}
      {/* APPROVE CONFIRMATION MODAL                                */}
      {/* ========================================================= */}
      {isApproveOpen && targetAppToApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Approve Pharmacy Application
                  </h3>
                  <p className="text-xs text-slate-500">
                    Confirm approval for <strong>{targetAppToApprove.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApproveOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assign Subscription Plan
                </label>
                <select
                  value={approvePlanId}
                  onChange={(e) => setApprovePlanId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.tier}) &bull; ৳{Number(p.price).toLocaleString()}/mo
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Billing Cycle
                </label>
                <div className="grid grid-cols-2 gap-2 font-bold text-xs">
                  <button
                    type="button"
                    onClick={() => setApproveBillingCycle("MONTHLY")}
                    className={`py-2 rounded-xl border transition ${
                      approveBillingCycle === "MONTHLY"
                        ? "bg-brand-primary text-white border-brand-primary"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setApproveBillingCycle("YEARLY")}
                    className={`py-2 rounded-xl border transition ${
                      approveBillingCycle === "YEARLY"
                        ? "bg-brand-primary text-white border-brand-primary"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600"
                    }`}
                  >
                    Yearly (-15%)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Approval Notes / Compliance Reference (Optional)
                </label>
                <textarea
                  rows={2}
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  placeholder="e.g. All regulatory documents (NID, Trade License, DGDA) verified & approved."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed">
                <strong>What happens next:</strong> An approval email with plan pricing and a secure SSLCOMMERZ checkout link will automatically be sent to <strong>{targetAppToApprove.email}</strong>. Once payment is completed, their dashboard will activate.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsApproveOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={approving}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {approving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing & Sending Email...</span>
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
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                  <XCircle className="h-5 w-5" />
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
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Rejection (Required) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain clearly what document was invalid or missing so the applicant can resubmit..."
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
                    "NID Number does not match owner details",
                    "Incomplete Trade License pages",
                    "Invalid pharmacy address documentation",
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
                An email notice including this rejection reason will be dispatched to <strong>{targetAppToReject.email}</strong>.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={rejecting || !rejectReason.trim()}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {rejecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing & Sending Email...</span>
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
