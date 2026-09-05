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
} from "lucide-react";

function VerificationStatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const emailParam = searchParams.get("email") || "";
  const tenantIdParam = searchParams.get("tenantId") || "";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
                  {plan && (
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                          Approved Plan
                        </div>
                        <div className="font-bold text-lg text-slate-900 dark:text-white">
                          {plan.name} ({plan.tier})
                        </div>
                        <div className="text-xs text-slate-500">
                          Billing: {data?.billingCycle || "MONTHLY"} &bull; Branches: Up to {plan.maxBranches} store(s)
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Payable Amount</div>
                        <div className="text-2xl font-black font-mono text-brand-primary">
                          ৳
                          {data?.billingCycle === "YEARLY"
                            ? Math.round(Number(plan.price) * 12 * 0.85).toLocaleString()
                            : Number(plan.price).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}

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

            {/* Application Submission Overview */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] text-slate-400">
                Submitted Application Details & Compliance Documents
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400">
                <div><strong>Owner:</strong> {data?.ownerName}</div>
                <div><strong>Phone:</strong> {data?.phone}</div>
                <div><strong>Address:</strong> {data?.address}</div>
                <div><strong>Submitted Date:</strong> {new Date(data?.submittedAt || Date.now()).toLocaleDateString()}</div>
                <div>
                  <strong>NID Number:</strong> {data?.nidNumber || "—"}{" "}
                  {data?.nidFrontUrl && <span className="text-emerald-600 font-bold">(Front & Back Attached)</span>}
                </div>
                <div>
                  <strong>Trade License:</strong> {data?.tradeLicenseNumber || "—"}{" "}
                  {data?.tradeLicenseFrontUrl && <span className="text-emerald-600 font-bold">(Front & Back Attached)</span>}
                </div>
                <div className="sm:col-span-2">
                  <strong>Drug License:</strong> {data?.drugLicenseNumber || "—"}{" "}
                  {data?.drugLicenseFrontUrl && <span className="text-emerald-600 font-bold">(Front & Back Attached)</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
