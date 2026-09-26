"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/api";
import {
  Pill,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Building,
  User,
  Phone,
  Mail,
  FileText,
  ExternalLink,
  Loader2,
  RefreshCw,
  ArrowRight,
  Sparkles,
  KeyRound,
  XCircle,
  HelpCircle,
  Maximize2,
  X,
  FileCheck,
} from "lucide-react";

function VerificationStatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const emailParam = searchParams.get("email") || "";
  const tenantIdParam = searchParams.get("tenantId") || "";
  const tokenParam = searchParams.get("token") || "";

  // 1-Click Magic Login handler when arriving from approval email
  useEffect(() => {
    if (tokenParam) {
      try {
        localStorage.setItem("token", tokenParam);
        const base64Url = tokenParam.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const payload = JSON.parse(jsonPayload);
        if (payload && payload.id) {
          localStorage.setItem("user", JSON.stringify(payload));
        }
      } catch (err) {
        console.error("Magic login token parsing error:", err);
      }
    }
  }, [tokenParam]);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ title: string; url: string; number?: string } | null>(null);

  const isPdf = (url?: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes(".pdf") || lower.includes("/raw/") || lower.includes("application/pdf");
  };

  // OTP inputs if still PENDING_OTP
  const [otpCode, setOtpCode] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);

  // Payment initiate
  const [paymentInitiating, setPaymentInitiating] = useState(false);

  const loadStatus = async () => {
    const identifier = tenantIdParam || emailParam;
    if (!identifier) {
      // Try to read logged-in user
      const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          if (u.tenantId || u.email) {
            return fetchStatus(u.tenantId || u.email);
          }
        } catch (e) {}
      }
      setLoading(false);
      setError("Please provide your registered pharmacy email address or application ID.");
      return;
    }

    await fetchStatus(identifier);
  };

  const fetchStatus = async (identifier: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi<any>(`/auth/verification-status?identifier=${encodeURIComponent(identifier)}`);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        throw new Error(res.message || "Application not found");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load application status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [emailParam, tenantIdParam]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 4) return;

    setOtpVerifying(true);
    setError(null);
    try {
      const res = await fetchApi<any>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          email: data?.email || emailParam,
          tenantId: data?.tenantId || tenantIdParam || undefined,
          otpCode: otpCode.trim(),
        }),
      });

      if (res.success) {
        setOtpMessage("Email verified! Your application is now in review.");
        await loadStatus();
      } else {
        throw new Error(res.message || "OTP verification failed");
      }
    } catch (err: any) {
      setError(err.message || "Failed to verify OTP.");
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleProceedPayment = async () => {
    if (!data?.subscriptionId) {
      setError("No subscription record found. Please contact support.");
      return;
    }

    setPaymentInitiating(true);
    setError(null);

    try {
      const payRes = await fetchApi<any>("/payments/initiate", {
        method: "POST",
        body: JSON.stringify({
          subscriptionId: data.subscriptionId,
          customerName: data.ownerName || data.companyName,
          customerEmail: data.email,
          customerPhone: data.phone,
          customerAddress: data.address,
        }),
      });

      if (payRes.success && payRes.data?.gatewayUrl) {
        window.location.href = payRes.data.gatewayUrl;
      } else {
        throw new Error(payRes.message || "Could not launch SSLCOMMERZ gateway session.");
      }
    } catch (err: any) {
      setError(err.message || "Payment initiation failed.");
      setPaymentInitiating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 text-slate-500 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <span className="font-bold text-sm">Checking Application & Verification Status...</span>
      </div>
    );
  }

  const status = data?.verificationStatus || "PENDING_APPROVAL";
  const plan = data?.plan || null;
  const isApproved = status === "APPROVED_PENDING_PAYMENT";
  const isActive = status === "ACTIVE";
  const isPendingApproval = status === "PENDING_APPROVAL";
  const isPendingOtp = status === "PENDING_OTP";
  const isRejected = status === "REJECTED";

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full brand-glow -z-10 opacity-20 blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-primary flex items-center justify-center text-white shadow-sm">
              <Pill className="h-4 w-4 transform -rotate-45" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">PharmaBiz</span>
          </Link>

          <button
            onClick={loadStatus}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Status</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {otpMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{otpMessage}</span>
          </div>
        )}

        {/* ================= STATUS BANNER CARD ================= */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden backdrop-blur-xl">
          {/* Header Colored Ribbon */}
          <div
            className={`p-6 text-white ${
              isActive
                ? "bg-emerald-600"
                : isApproved
                ? "bg-brand-primary"
                : isRejected
                ? "bg-rose-600"
                : "bg-slate-900"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold text-[10px] uppercase tracking-wider mb-2">
                  Application Status
                </span>
                <h1 className="text-2xl font-black">
                  {isActive
                    ? "Verified & Workspace Active 🎉"
                    : isApproved
                    ? "Application Approved! Payment Required 💳"
                    : isRejected
                    ? "Application Not Approved"
                    : isPendingApproval
                    ? "Email Verified — Waiting for Admin Approval ⏳"
                    : isPendingOtp
                    ? "Email Verification Required"
                    : "Application Under Review ⏳"}
                </h1>
                <p className="text-xs text-white/80 mt-1">
                  Pharmacy: <strong>{data?.companyName}</strong> &bull; Registered Email:{" "}
                  <strong>{data?.email}</strong>
                </p>
              </div>

              {isActive && (
                <Link
                  href="/dashboard"
                  className="px-5 py-3 rounded-2xl bg-white text-emerald-800 font-bold text-xs shadow-lg hover:bg-slate-50 transition flex items-center gap-2 shrink-0"
                >
                  <span>Enter Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          {/* Body Content depending on state */}
          <div className="p-8 space-y-6">
            {/* 1. PENDING OTP STATE */}
            {isPendingOtp && (
              <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-4 text-center">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center">
                  <KeyRound className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Please Verify Your Email
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Your registration has been initiated. Enter the 6-digit OTP code sent to{" "}
                    <strong>{data?.email}</strong> to submit your documents to the compliance team.
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="max-w-xs mx-auto space-y-3">
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="Enter 6-Digit OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full text-center tracking-widest font-mono text-xl font-black py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                  <button
                    type="submit"
                    disabled={otpVerifying || otpCode.length < 4}
                    className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {otpVerifying ? "Verifying..." : "Confirm OTP Code"}
                  </button>
                </form>
              </div>
            )}

            {/* 2. PENDING APPROVAL (UNDER REVIEW) STATE */}
            {isPendingApproval && (
              <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        Email Verified Successfully — Waiting for Admin Approval
                      </div>
                      <div className="text-xs text-slate-500">
                        Your application has been submitted and is now waiting for Super Admin review and approval.
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <div>
                      &bull; <strong>Compliance Status:</strong> National ID, Trade License, and Drug License are queued for verification.
                    </div>
                    <div>
                      &bull; <strong>Next Step:</strong> As soon as the Super Admin approves your application, you will receive an approval email to log in and complete payment.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. APPROVED PENDING PAYMENT STATE */}
            {isApproved && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        Compliance Verification Passed!
                      </h3>
                      <p className="text-xs text-slate-500">
                        Your pharmacy regulatory documents have been approved. Complete your payment to activate your workspace.
                      </p>
                    </div>
                  </div>

                  {data?.approvalNotes && (
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 italic">
                      Admin Notes: "{data.approvalNotes}"
                    </div>
                  )}

                  {/* Plan Price Card */}
                  {plan && (() => {
                    const basePlanPrice = data?.billingCycle === "YEARLY"
                      ? Math.round(Number(plan.price) * 12 * 0.85)
                      : Number(plan.price);
                    const licenseFee = 5000;
                    const totalPayable = basePlanPrice + licenseFee;

                    return (
                      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700/60 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                              Approved Plan & License
                            </div>
                            <div className="font-bold text-lg text-slate-900 dark:text-white">
                              {plan.name} ({plan.tier})
                            </div>
                            <div className="text-xs text-slate-500">
                              Billing: {data?.billingCycle || "MONTHLY"} &bull; Branches: Up to {plan.maxBranches} store(s)
                            </div>
                          </div>

                          <div className="sm:text-right">
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Total Payable</div>
                            <div className="text-2xl font-black font-mono text-brand-primary">
                              ৳{totalPayable.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Fee Breakdown */}
                        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <div className="flex justify-between">
                            <span>One-Time Software License Fee:</span>
                            <span className="font-bold font-mono text-slate-900 dark:text-white">৳5,000</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{plan.name} ({data?.billingCycle || "MONTHLY"}):</span>
                            <span className="font-bold font-mono text-slate-900 dark:text-white">৳{basePlanPrice.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <button
                    onClick={handleProceedPayment}
                    disabled={paymentInitiating}
                    className="w-full py-4 rounded-2xl bg-brand-primary hover:opacity-95 text-white font-bold text-sm shadow-xl transition flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
                  >
                    {paymentInitiating ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Launching SSLCOMMERZ Secure Gateway...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5" />
                        <span>Proceed to SSLCOMMERZ Payment &rarr;</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-slate-400">
                    Supports bKash, Nagad, Rocket, Visa, Mastercard, and all Bangladeshi Bank Portals.
                  </p>
                  <div className="text-center pt-1">
                    <span className="text-xs text-slate-500">Already have your account credentials? </span>
                    <Link href={`/login?email=${encodeURIComponent(data?.email || "")}&approved=true`} className="text-xs font-bold text-brand-primary hover:underline">
                      Log In &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* 4. REJECTED STATE */}
            {isRejected && (
              <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                    <XCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Application Could Not Be Approved
                    </h3>
                    <p className="text-xs text-slate-500">
                      The compliance team reviewed your submission and noted the following reason:
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 font-medium">
                  <strong>Rejection Reason:</strong> {data?.rejectionReason || "Documents were incomplete or illegible."}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Link
                    href="/register"
                    className="flex-1 py-3 text-center rounded-xl bg-brand-primary text-white font-bold text-xs shadow-md hover:opacity-90 transition"
                  >
                    Submit New Application
                  </Link>
                  <a
                    href="mailto:support@pharmabiz.com"
                    className="flex-1 py-3 text-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 transition"
                  >
                    Contact Compliance Support
                  </a>
                </div>
              </div>
            )}

            {/* Application Submission Overview & Uploaded Documents */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] text-slate-400">
                  Submitted Application Details & Compliance Documents
                </h4>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Archived on Cloudinary CDN
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                <div><strong>Owner:</strong> {data?.ownerName}</div>
                <div><strong>Phone:</strong> {data?.phone}</div>
                <div><strong>Address:</strong> {data?.address}</div>
                <div><strong>Submitted Date:</strong> {new Date(data?.submittedAt || Date.now()).toLocaleDateString()}</div>
                <div>
                  <strong>NID Number:</strong> {data?.nidNumber || "—"}
                </div>
                <div>
                  <strong>Trade License:</strong> {data?.tradeLicenseNumber || "—"}
                </div>
                <div className="sm:col-span-2">
                  <strong>Drug License:</strong> {data?.drugLicenseNumber || "—"}
                </div>
              </div>

              {/* Uploaded Documents Gallery */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Uploaded Regulatory Documents
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: "nid_front",
                      title: "Owner National ID (Front)",
                      number: data?.nidNumber,
                      url: data?.nidFrontUrl || data?.nidDocUrl,
                      icon: FileText,
                      color: "text-brand-primary",
                      bg: "bg-brand-primary/10",
                    },
                    {
                      id: "nid_back",
                      title: "Owner National ID (Back)",
                      number: data?.nidNumber,
                      url: data?.nidBackUrl,
                      icon: FileText,
                      color: "text-brand-primary",
                      bg: "bg-brand-primary/10",
                    },
                    {
                      id: "trade",
                      title: "Trade License Document",
                      number: data?.tradeLicenseNumber,
                      url: data?.tradeLicenseDocUrl || data?.tradeLicenseFrontUrl,
                      icon: FileCheck,
                      color: "text-emerald-500",
                      bg: "bg-emerald-500/10",
                    },
                    {
                      id: "drug",
                      title: "DGDA Drug License",
                      number: data?.drugLicenseNumber,
                      url: data?.drugLicenseDocUrl || data?.drugLicenseFrontUrl,
                      icon: Pill,
                      color: "text-purple-500",
                      bg: "bg-purple-500/10",
                    },
                  ].map((doc) => {
                    const hasDoc = Boolean(doc.url);
                    const docIsPdf = isPdf(doc.url);

                    return (
                      <div
                        key={doc.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-9 w-9 rounded-xl ${doc.bg} ${doc.color} flex items-center justify-center shrink-0`}>
                            <doc.icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
                              {doc.title}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {hasDoc ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                  {docIsPdf ? "PDF Document" : "Image File"} &bull; Uploaded
                                </span>
                              ) : (
                                <span>Not provided</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {hasDoc && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setViewingDoc({ title: doc.title, url: doc.url!, number: doc.number })}
                              className="px-2.5 py-1.5 rounded-xl bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                            >
                              <Maximize2 className="h-3 w-3" />
                              <span>View</span>
                            </button>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition"
                              title="Open in new tab"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Standalone Document Preview Modal */}
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

            <div className="flex-1 p-3 sm:p-6 overflow-auto flex items-center justify-center bg-slate-950/5 dark:bg-slate-950 min-h-[300px] sm:min-h-[450px]">
              {isPdf(viewingDoc.url) ? (
                <iframe
                  src={viewingDoc.url}
                  className="w-full h-[360px] sm:h-[580px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white"
                  title={viewingDoc.title}
                />
              ) : (
                <img
                  src={viewingDoc.url}
                  alt={viewingDoc.title}
                  className="max-h-[360px] sm:max-h-[580px] max-w-full object-contain rounded-2xl shadow-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerificationStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 text-slate-500 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
          <span>Loading verification status...</span>
        </div>
      }
    >
      <VerificationStatusContent />
    </Suspense>
  );
}
