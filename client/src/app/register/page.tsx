"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSettings } from "@/context/SettingsContext";
import { fetchApi } from "@/lib/api";
import {
  Pill,
  Building,
  CreditCard,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Phone,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Clock,
  Sparkles,
  FileText,
  Upload,
  Eye,
  Check,
  KeyRound,
  RefreshCw,
  FileCheck,
  Image as ImageIcon,
} from "lucide-react";

interface DocumentUploadState {
  file: File | null;
  base64: string;
  name: string;
  size: number;
  type: string;
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useSettings();

  const planIdParam = searchParams.get("planId");
  const billingParam = searchParams.get("billing") || "MONTHLY";

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(planIdParam || "");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">(
    billingParam === "YEARLY" ? "YEARLY" : "MONTHLY"
  );

  // Form State
  const [formData, setFormData] = useState({
    companyName: "",
    ownerName: "",
    email: "",
    phone: "",
    password: "",
    address: "",
    nidNumber: "",
    tradeLicenseNumber: "",
    drugLicenseNumber: "",
  });

  // Document Uploads: NID (Front + Back), Trade License (Single doc), Drug License (Single doc)
  const [nidFrontDoc, setNidFrontDoc] = useState<DocumentUploadState | null>(null);
  const [nidBackDoc, setNidBackDoc] = useState<DocumentUploadState | null>(null);
  const [tradeDoc, setTradeDoc] = useState<DocumentUploadState | null>(null);
  const [drugDoc, setDrugDoc] = useState<DocumentUploadState | null>(null);

  // OTP State
  const [otpCode, setOtpCode] = useState<string>("");
  const [registeredTenantId, setRegisteredTenantId] = useState<string>("");
  const [otpCountdown, setOtpCountdown] = useState<number>(60);
  const [resendingOtp, setResendingOtp] = useState<boolean>(false);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetchApi<any[]>("/subscriptions/plans");
        if (res.success && res.data && res.data.length > 0) {
          setPlans(res.data);
          if (!selectedPlanId) {
            const starter = res.data.find((p: any) => p.tier === "STARTER") || res.data[0];
            setSelectedPlanId(starter.id);
          }
        }
      } catch (err) {
        console.warn("Could not fetch plans", err);
      }
    }
    loadPlans();
  }, []);

  // OTP Countdown timer
  useEffect(() => {
    let timer: any;
    if (currentStep === 4 && otpCountdown > 0) {
      timer = setInterval(() => setOtpCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [currentStep, otpCountdown]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || {
    id: "starter",
    name: "Starter Pharmacy",
    tier: "STARTER",
    price: 1500,
    maxBranches: 1,
  };

  const basePrice = Number(selectedPlan.price || 0);
  const totalPrice = billingCycle === "YEARLY" ? Math.round(basePrice * 12 * 0.85) : basePrice;

  // File Converter helper
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<DocumentUploadState | null>>,
    docName: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError(`${docName} file size must be less than 10MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setter({
        file,
        base64: reader.result as string,
        name: file.name,
        size: file.size,
        type: file.type,
      });
      setError(null);
    };
    reader.onerror = () => {
      setError(`Failed to read ${docName} file.`);
    };
    reader.readAsDataURL(file);
  };

  // Step 1 Validation
  const validateStep1 = () => {
    if (!formData.companyName.trim()) return "Pharmacy name is required.";
    if (!formData.ownerName.trim()) return "Owner full name is required.";
    if (!formData.email.trim() || !formData.email.includes("@")) return "A valid email is required.";
    if (!formData.phone.trim() || formData.phone.length < 5) return "A valid contact phone number is required.";
    if (!formData.password || formData.password.length < 6) return "Password must be at least 6 characters.";
    return null;
  };

  // Step 2 Validation: NID Front + Back required; Trade and Drug license single doc required
  const validateStep2 = () => {
    if (!formData.nidNumber.trim()) return "NID Number is required.";
    if (!nidFrontDoc) return "Please upload your NID Front Side (PDF, JPG, or PNG).";
    if (!nidBackDoc) return "Please upload your NID Back Side (PDF, JPG, or PNG).";
    if (!formData.tradeLicenseNumber.trim()) return "Trade License Number is required.";
    if (!tradeDoc) return "Please upload your Trade License document (PDF, JPG, or PNG).";
    if (!formData.drugLicenseNumber.trim()) return "DGDA Drug License Number is required.";
    if (!drugDoc) return "Please upload your DGDA Drug License document (PDF, JPG, or PNG).";
    return null;
  };

  const handleNextStep = () => {
    setError(null);
    if (currentStep === 1) {
      const err = validateStep1();
      if (err) {
        setError(err);
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const err = validateStep2();
      if (err) {
        setError(err);
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const step1Err = validateStep1();
    if (step1Err) {
      setCurrentStep(1);
      setError(step1Err);
      return;
    }

    const step2Err = validateStep2();
    if (step2Err) {
      setCurrentStep(2);
      setError(step2Err);
      return;
    }

    setLoading(true);

    try {
      const regRes = await fetchApi<any>("/auth/register-owner", {
        method: "POST",
        body: JSON.stringify({
          companyName: formData.companyName,
          ownerName: formData.ownerName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          address: formData.address || "HQ Location",
          
          // NID Front & Back
          nidNumber: formData.nidNumber,
          nidFrontDocument: nidFrontDoc!.base64,
          nidBackDocument: nidBackDoc!.base64,
          
          // Trade License (Single complete file)
          tradeLicenseNumber: formData.tradeLicenseNumber,
          tradeLicenseDocument: tradeDoc!.base64,

          // DGDA Drug License (Single complete file)
          drugLicenseNumber: formData.drugLicenseNumber,
          drugLicenseDocument: drugDoc!.base64,

          planId: selectedPlan.id,
          billingCycle,
        }),
      });

      if (!regRes.success || !regRes.data) {
        throw new Error(regRes.message || "Registration failed. Please verify your details.");
      }

      const { token, user, tenant } = regRes.data;
      if (token) localStorage.setItem("token", token);
      if (user) localStorage.setItem("user", JSON.stringify(user));

      setRegisteredTenantId(tenant?.id || regRes.data?.tenantId || "");
      setCurrentStep(4); // Move to OTP verification
      setOtpCountdown(60);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "An error occurred during pharmacy registration.");
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpCode.replace(/\D/g, "").trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setError("Please enter the complete 6-digit OTP code sent to your email.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const otpRes = await fetchApi<any>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          tenantId: registeredTenantId || undefined,
          otpCode: cleanCode,
        }),
      });

      if (!otpRes.success) {
        throw new Error(otpRes.message || "Invalid OTP code. Please check and try again.");
      }

      setLoading(false);
      setCurrentStep(5); // Transition directly to On-Page Success Screen
    } catch (err: any) {
      setError(err.message || "OTP verification failed.");
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setOtpSuccessMessage(null);
    setResendingOtp(true);

    try {
      const res = await fetchApi<any>("/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email: formData.email.trim().toLowerCase() }),
      });

      if (res.success) {
        setOtpSuccessMessage("A fresh 6-digit OTP has been sent to your email.");
        setOtpCountdown(60);
      } else {
        throw new Error(res.message || "Could not resend OTP.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP.");
    } finally {
      setResendingOtp(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full brand-glow -z-10 opacity-20 blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/#pricing"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-brand-primary transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Pricing
          </Link>

          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-primary flex items-center justify-center text-white shadow-sm">
              <Pill className="h-4 w-4 transform -rotate-45" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">
              {settings.siteName || "PharmaBiz"}
            </span>
          </Link>
        </div>

        {/* Heading & Wizard Steps */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            Official Pharmacy Verification & Compliance
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Register Your Pharmacy
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Complete the 3-step compliance onboarding. NID requires Front & Back sides; Trade License and Drug License require one complete document (PDF/JPG/PNG).
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 text-xs font-bold">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition ${
              currentStep === 1
                ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                : currentStep > 1
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800"
            }`}
          >
            <span className="h-5 w-5 rounded-full bg-black/10 flex items-center justify-center text-[10px]">
              {currentStep > 1 ? <Check className="h-3 w-3" /> : "1"}
            </span>
            <span>1. Owner Info</span>
          </div>

          <div className="w-6 h-0.5 bg-slate-200 dark:bg-slate-800" />

          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition ${
              currentStep === 2
                ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                : currentStep > 2
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800"
            }`}
          >
            <span className="h-5 w-5 rounded-full bg-black/10 flex items-center justify-center text-[10px]">
              {currentStep > 2 ? <Check className="h-3 w-3" /> : "2"}
            </span>
            <span>2. Legal Documents</span>
          </div>

          <div className="w-6 h-0.5 bg-slate-200 dark:bg-slate-800" />

          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition ${
              currentStep === 3
                ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                : currentStep > 3
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800"
            }`}
          >
            <span className="h-5 w-5 rounded-full bg-black/10 flex items-center justify-center text-[10px]">
              {currentStep > 3 ? <Check className="h-3 w-3" /> : "3"}
            </span>
            <span>3. Plan & Submit</span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {otpSuccessMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{otpSuccessMessage}</span>
          </div>
        )}

        {/* ================= STEP 1: OWNER & PHARMACY INFO ================= */}
        {currentStep === 1 && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl p-8 backdrop-blur-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Step 1: Pharmacy & Owner Details
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your pharmacy's registered business identity and master administrator account.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pharmacy / Company Legal Name *
                </label>
                <div className="relative">
                  <Building className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. CarePlus Pharmacy Network Ltd."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Owner Full Name *
                </label>
                <div className="relative">
                  <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder="e.g. Dr. Rafiqul Islam"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Phone *
                </label>
                <div className="relative">
                  <Phone className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="01700000000"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Login Email *
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="owner@pharmacy.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pharmacy Headquarter Address *
                </label>
                <div className="relative">
                  <MapPin className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. 12 Satmasjid Road, Dhanmondi, Dhaka"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-3 rounded-xl bg-brand-primary text-white font-bold text-xs shadow-md hover:opacity-90 transition flex items-center gap-2 cursor-pointer"
              >
                <span>Continue to Step 2: Legal Documents</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: REGULATORY DOCUMENTS ================= */}
        {currentStep === 2 && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl p-8 backdrop-blur-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Step 2: Regulatory & License Documents
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload both Front and Back sides for your National ID. For Trade License and Drug License, upload one complete multi-page document file (PDF, JPG, or PNG).
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* 1. NID Document (Front & Back Required) */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-brand-primary" />
                    <span>1. National ID (NID) — Front & Back Sides Required *</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    {nidFrontDoc && (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Front OK
                      </span>
                    )}
                    {nidBackDoc && (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Back OK
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Owner NID Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 19902692512345678"
                    value={formData.nidNumber}
                    onChange={(e) => setFormData({ ...formData, nidNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* NID Front */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                      <span>NID Front Side *</span>
                      {nidFrontDoc && <span className="text-[10px] text-emerald-600 font-normal truncate max-w-[120px]">{nidFrontDoc.name}</span>}
                    </div>
                    <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-brand-primary/40 hover:border-brand-primary bg-brand-primary/5 text-xs font-bold text-brand-primary cursor-pointer transition">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{nidFrontDoc ? "Change Front File" : "Choose NID Front"}</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => handleFileChange(e, setNidFrontDoc, "NID Front")}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  {/* NID Back */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                      <span>NID Back Side *</span>
                      {nidBackDoc && <span className="text-[10px] text-emerald-600 font-normal truncate max-w-[120px]">{nidBackDoc.name}</span>}
                    </div>
                    <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-brand-primary/40 hover:border-brand-primary bg-brand-primary/5 text-xs font-bold text-brand-primary cursor-pointer transition">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{nidBackDoc ? "Change Back File" : "Choose NID Back"}</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => handleFileChange(e, setNidBackDoc, "NID Back")}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* 2. Trade License (Single Complete Document) */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-emerald-600" />
                    <span>2. Trade License (One Complete Document) *</span>
                  </div>
                  {tradeDoc && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Attached: {tradeDoc.name}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Trade License Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TRAD/DNCC/019283/2026"
                      value={formData.tradeLicenseNumber}
                      onChange={(e) => setFormData({ ...formData, tradeLicenseNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Upload Trade License (PDF / JPG / PNG) *
                    </label>
                    <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs font-bold text-emerald-600 cursor-pointer transition">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{tradeDoc ? "Change Trade License File" : "Choose Trade License Document"}</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => handleFileChange(e, setTradeDoc, "Trade License")}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  Tip: Upload a single complete PDF or image file containing all pages/sides of your trade license.
                </p>
              </div>

              {/* 3. Drug License (Single Complete Document) */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <Pill className="h-4 w-4 text-purple-600" />
                    <span>3. DGDA Drug License (One Complete Document) *</span>
                  </div>
                  {drugDoc && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Attached: {drugDoc.name}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      DGDA Drug License Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. DL-DHAKA-2024-9988"
                      value={formData.drugLicenseNumber}
                      onChange={(e) => setFormData({ ...formData, drugLicenseNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Upload Drug License (PDF / JPG / PNG) *
                    </label>
                    <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-purple-500/40 hover:border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-xs font-bold text-purple-600 cursor-pointer transition">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{drugDoc ? "Change Drug License File" : "Choose DGDA Drug License"}</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => handleFileChange(e, setDrugDoc, "Drug License")}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  Tip: Upload your official DGDA drug license certificate / multi-page PDF document.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition"
              >
                &larr; Back to Owner Info
              </button>

              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-3 rounded-xl bg-brand-primary text-white font-bold text-xs shadow-md hover:opacity-90 transition flex items-center gap-2 cursor-pointer"
              >
                <span>Continue to Step 3: Plan & Review</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: PLAN SELECTION & SUBMISSION ================= */}
        {currentStep === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl p-8 backdrop-blur-xl space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Step 3: Review Application & Select Subscription
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm your application details and attached documents. Upon submitting, a 6-digit OTP will be sent to your email.
                </p>
              </div>

              {/* Application Summary Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] text-brand-primary">
                  Application Document Summary
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                  <div><strong>Pharmacy:</strong> {formData.companyName}</div>
                  <div><strong>Owner:</strong> {formData.ownerName}</div>
                  <div><strong>Email:</strong> {formData.email}</div>
                  <div><strong>Phone:</strong> {formData.phone}</div>
                  
                  <div className="col-span-2 border-t border-slate-200 dark:border-slate-700 pt-2 space-y-1">
                    <div>
                      <strong>NID No:</strong> {formData.nidNumber} &bull;{" "}
                      <span className="text-brand-primary font-semibold">Front: {nidFrontDoc?.name}</span> |{" "}
                      <span className="text-brand-primary font-semibold">Back: {nidBackDoc?.name}</span>
                    </div>
                    <div>
                      <strong>Trade License:</strong> {formData.tradeLicenseNumber} &bull;{" "}
                      <span className="text-emerald-600 font-semibold">Document: {tradeDoc?.name}</span>
                    </div>
                    <div>
                      <strong>Drug License:</strong> {formData.drugLicenseNumber} &bull;{" "}
                      <span className="text-purple-600 font-semibold">Document: {drugDoc?.name}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Plan Choice */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Desired Subscription Plan *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {plans.map((p) => {
                    const isSelected = selectedPlanId === p.id;
                    const price = Number(p.price);
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPlanId(p.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition relative flex flex-col justify-between ${
                          isSelected
                            ? "border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10 shadow-sm"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-brand-primary text-white flex items-center justify-center text-[10px]">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">{p.name}</div>
                          <div className="text-lg font-black text-brand-primary mt-1 font-mono">
                            ৳{price.toLocaleString()}
                            <span className="text-[10px] font-normal text-slate-400">/mo</span>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-2 font-medium">
                          Up to {p.maxBranches >= 999 ? "Unlimited" : p.maxBranches} Store(s)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Billing Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Billing Interval</span>
                <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("MONTHLY")}
                    className={`px-3 py-1 rounded ${billingCycle === "MONTHLY" ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs" : "text-slate-500"}`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle("YEARLY")}
                    className={`px-3 py-1 rounded ${billingCycle === "YEARLY" ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs" : "text-slate-500"}`}
                  >
                    Yearly (-15%)
                  </button>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition"
                >
                  &larr; Back to Documents
                </button>

                <button
                  type="button"
                  onClick={handleSubmitRegistration}
                  disabled={loading}
                  className="px-8 py-3.5 rounded-xl bg-brand-primary text-white font-bold text-xs shadow-lg hover:opacity-90 transition active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Encrypting & Uploading Compliance Files...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Application & Verify Email</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sidebar Notice */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 shadow-md text-xs">
              <div className="text-xs font-bold uppercase text-brand-primary tracking-wider">
                Verification Workflow
              </div>
              <div className="space-y-3 text-slate-600 dark:text-slate-400">
                <div className="flex gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-brand-primary/10 text-brand-primary font-bold flex items-center justify-center shrink-0 text-[10px]">
                    1
                  </div>
                  <div>
                    <strong>Email OTP Verification:</strong> Enter the 6-digit OTP code sent to your registered email.
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-brand-primary/10 text-brand-primary font-bold flex items-center justify-center shrink-0 text-[10px]">
                    2
                  </div>
                  <div>
                    <strong>Super Admin Inspection:</strong> Admin reviews your NID Front/Back and uploaded Trade License & Drug License files.
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-brand-primary/10 text-brand-primary font-bold flex items-center justify-center shrink-0 text-[10px]">
                    3
                  </div>
                  <div>
                    <strong>Approval & SSLCOMMERZ Payment:</strong> Receive approval email and complete payment (৳{totalPrice.toLocaleString()}) to activate your pharmacy dashboard.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 4: OTP VERIFICATION MODAL / SCREEN ================= */}
        {currentStep === 4 && (
          <div className="max-w-md mx-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-8 backdrop-blur-xl space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="h-14 w-14 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto">
              <KeyRound className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Verify Your Email Address
              </h2>
              <p className="text-xs text-slate-500">
                We have sent a 6-digit verification code to: <br />
                <strong className="text-slate-800 dark:text-slate-200 font-mono">{formData.email}</strong>
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Enter or Paste 6-Digit OTP Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    autoFocus
                    value={otpCode}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData("text") || "";
                      const digits = pasted.replace(/\D/g, "").slice(0, 6);
                      if (digits) {
                        setOtpCode(digits);
                        setError(null);
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setOtpCode(val);
                      if (error) setError(null);
                    }}
                    placeholder="123456"
                    className="w-full text-center tracking-[12px] font-mono text-3xl font-black py-3.5 px-4 rounded-2xl border-2 border-brand-primary/40 focus:border-brand-primary bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none transition"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  You can type or directly paste (Ctrl+V / Cmd+V) the 6-digit code.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.trim().length < 6}
                className="w-full py-3.5 rounded-xl bg-brand-primary text-white font-bold text-sm shadow-lg hover:opacity-90 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying OTP & Submitting...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Confirm & Submit Application</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-2 text-xs">
              <span className="text-slate-400">Didn't receive the code?</span>
              {otpCountdown > 0 ? (
                <span className="text-slate-500 font-medium font-mono text-[11px]">
                  Resend available in {otpCountdown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendingOtp}
                  className="font-bold text-brand-primary hover:underline flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {resendingOtp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  <span>Resend Verification OTP</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================= STEP 5: ON-PAGE SUBMISSION SUCCESS & AWAITING APPROVAL ================= */}
        {currentStep === 5 && (
          <div className="max-w-lg mx-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-8 backdrop-blur-xl space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="h-16 w-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                Email Verified Successfully 🎉
              </h2>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                Your application has been submitted and is now waiting for Admin Approval.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-left space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700">
                <span className="text-slate-400">Application Status</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Pending Admin Approval
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Pharmacy Name</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formData.companyName}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Owner Name</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formData.ownerName}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Registered Email</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{formData.email}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Selected Plan</span>
                <span className="font-bold text-brand-primary">
                  {selectedPlan?.name || "Professional"} ({billingCycle})
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-300 text-xs text-left leading-relaxed space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                <Clock className="h-4 w-4" />
                <span>What happens next?</span>
              </div>
              <p>
                Our compliance team is reviewing your National ID, Trade License, and DGDA Drug License documentation.
              </p>
              <p>
                Once approved, you will automatically receive an email notification. You can then log in with your email and password to complete subscription payment and activate your dashboard.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href={`/verification-status?email=${encodeURIComponent(formData.email.trim().toLowerCase())}&tenantId=${registeredTenantId}`}
                className="flex-1 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <span>Track Live Status</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={`/login?email=${encodeURIComponent(formData.email.trim().toLowerCase())}`}
                className="flex-1 py-3.5 rounded-xl bg-brand-primary text-white font-bold text-xs shadow-md hover:opacity-90 transition flex items-center justify-center gap-2"
              >
                <span>Go to Login Page</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 text-slate-500 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
          <span>Loading registration portal...</span>
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
