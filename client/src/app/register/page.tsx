"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
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
  EyeOff,
  Percent,
  X,
  ExternalLink,
  ShieldAlert,
  Database,
  Copy,
  Smartphone,
  CheckCheck,
  Info,
} from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";

interface DocumentUploadState {
  file: File | null;
  base64: string;
  name: string;
  size: number;
  type: string;
}

// ================= ZOD VALIDATION SCHEMAS =================
const step1Schema = z
  .object({
    companyName: z
      .string()
      .trim()
      .min(2, "Pharmacy legal name must be at least 2 characters."),
    ownerName: z
      .string()
      .trim()
      .min(2, "Owner name must be at least 2 characters."),
    phone: z
      .string()
      .trim()
      .regex(/^\d+$/, "Phone number must contain numbers only (no letters allowed).")
      .min(11, "Phone number must be at least 11 digits.")
      .max(12, "Phone number cannot exceed 12 digits."),
    email: z
      .string()
      .trim()
      .email("Please enter a valid email address."),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters."),
    confirmPassword: z
      .string()
      .min(1, "Please confirm your password."),
    address: z.string().trim().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Confirm password does not match password.",
    path: ["confirmPassword"],
  });

const step2Schema = z.object({
  nidNumber: z
    .string()
    .trim()
    .min(4, "NID number is required (at least 4 characters)."),
  hasNidFront: z.boolean().refine((val) => val === true, {
    message: "Please upload your NID Front side document.",
  }),
  hasNidBack: z.boolean().refine((val) => val === true, {
    message: "Please upload your NID Back side document.",
  }),
  tradeLicenseNumber: z
    .string()
    .trim()
    .min(3, "Trade license number is required."),
  hasTradeDoc: z.boolean().refine((val) => val === true, {
    message: "Please upload your Trade License document.",
  }),
  drugLicenseNumber: z
    .string()
    .trim()
    .min(3, "Drug license number is required."),
  hasDrugDoc: z.boolean().refine((val) => val === true, {
    message: "Please upload your Drug License document.",
  }),
});

const otpVerifySchema = z.object({
  otpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Please enter the complete 6-digit numeric OTP code."),
});

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
    confirmPassword: "",
    address: "",
    nidNumber: "",
    tradeLicenseNumber: "",
    drugLicenseNumber: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  const handleInputChange = (field: string, value: string) => {
    let cleanVal = value;
    if (field === "phone") {
      cleanVal = value.replace(/\D/g, "").slice(0, 12);
    }
    setFormData((prev) => ({ ...prev, [field]: cleanVal }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (error) setError(null);
  };

  // Payment Gateways & Manual bKash State
  const [gateways, setGateways] = useState<any>({
    manualBkash: {
      enabled: true,
      accountNumber: "01750000000",
      accountType: "Personal",
      instructions: "অনুগ্রহ করে এই পার্সোনাল বিকাশ নাম্বারে Send Money করুন। রেফারেন্স হিসেবে আপনার ফার্মেসির নাম ব্যবহার করুন।",
    },
    sslcommerz: { enabled: false },
  });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"MANUAL_BKASH" | "SSLCOMMERZ">("MANUAL_BKASH");
  const [manualSenderNumber, setManualSenderNumber] = useState<string>("");
  const [manualTrxId, setManualTrxId] = useState<string>("");
  const [manualPaymentDoc, setManualPaymentDoc] = useState<DocumentUploadState | null>(null);
  const [copiedNumber, setCopiedNumber] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [plansRes, gwRes] = await Promise.all([
          fetchApi<any[]>("/subscriptions/plans"),
          fetchApi<any>("/settings/payment-gateways"),
        ]);

        if (plansRes.success && plansRes.data && plansRes.data.length > 0) {
          setPlans(plansRes.data);
          if (!selectedPlanId) {
            const starter = plansRes.data.find((p: any) => p.tier === "STARTER") || plansRes.data[0];
            setSelectedPlanId(starter.id);
          }
        }

        if (gwRes.success && gwRes.data) {
          setGateways(gwRes.data);
          if (!gwRes.data.manualBkash?.enabled && gwRes.data.sslcommerz?.enabled) {
            setSelectedPaymentMethod("SSLCOMMERZ");
          } else {
            setSelectedPaymentMethod("MANUAL_BKASH");
          }
        }
      } catch (err) {
        console.warn("Could not fetch plans or gateway settings", err);
      }
    }
    loadData();
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

  const isTrialPlan = Boolean(
    selectedPlan.tier === "TRIAL" ||
    selectedPlan.isTrial ||
    selectedPlan.features?.isTrial ||
    Number(selectedPlan.price) === 0
  );
  const trialDays = Number(selectedPlan.trialDays || selectedPlan.features?.trialDays || 14);

  const INITIAL_LICENSE_FEE = isTrialPlan ? 0 : 5000;
  const DATA_RETENTION_FEE = 3000;
  const DATA_RETENTION_DAYS = 90;

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const basePrice = Number(selectedPlan.price || 0);
  const planPrice = isTrialPlan ? 0 : (billingCycle === "YEARLY" ? Math.round(basePrice * 12 * 0.85) : basePrice);
  const totalPrice = isTrialPlan ? 0 : (INITIAL_LICENSE_FEE + planPrice);

  // File Converter helper
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<DocumentUploadState | null>>,
    docName: string,
    errorKey?: string
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
      if (errorKey && fieldErrors[errorKey]) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next[errorKey];
          return next;
        });
      }
    };
    reader.onerror = () => {
      setError(`Failed to read ${docName} file.`);
    };
    reader.readAsDataURL(file);
  };

  // Step 1 Validation with Zod
  const validateStep1 = () => {
    const result = step1Schema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field && !errors[field]) {
          errors[field] = issue.message;
        }
      });
      setFieldErrors(errors);
      return result.error.issues[0]?.message || "Please complete all required fields.";
    }
    setFieldErrors({});
    return null;
  };

  // Step 2 Validation with Zod
  const validateStep2 = () => {
    const result = step2Schema.safeParse({
      nidNumber: formData.nidNumber,
      hasNidFront: !!nidFrontDoc,
      hasNidBack: !!nidBackDoc,
      tradeLicenseNumber: formData.tradeLicenseNumber,
      hasTradeDoc: !!tradeDoc,
      drugLicenseNumber: formData.drugLicenseNumber,
      hasDrugDoc: !!drugDoc,
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field && !errors[field]) {
          errors[field] = issue.message;
        }
      });
      setFieldErrors(errors);
      return result.error.issues[0]?.message || "Please complete all required document uploads.";
    }
    setFieldErrors({});
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

    if (!isTrialPlan && selectedPaymentMethod === "MANUAL_BKASH") {
      const pErrors: Record<string, string> = {};
      if (!manualSenderNumber.trim() || manualSenderNumber.trim().length < 11) {
        pErrors.manualSenderNumber = "Please enter a valid 11-digit bKash sender phone number.";
      }
      if (!manualTrxId.trim() || manualTrxId.trim().length < 4) {
        pErrors.manualTrxId = "Please enter the Transaction ID (TrxID) from your bKash app.";
      }
      if (!manualPaymentDoc) {
        pErrors.manualPaymentDoc = "Please upload the payment confirmation screenshot.";
      }
      if (Object.keys(pErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...pErrors }));
        setError("Please complete all required bKash payment verification details.");
        return;
      }
    }

    if (!agreedToTerms) {
      setFieldErrors((prev) => ({
        ...prev,
        terms: "You must agree to the Terms & Conditions and Data Retention Policy before submitting.",
      }));
      setError("Please read and accept the Terms & Conditions and Data Retention Policy.");
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

          // Payment Details
          paymentMethod: isTrialPlan ? "FREE_TRIAL" : selectedPaymentMethod,
          manualPaymentNumber: isTrialPlan ? undefined : manualSenderNumber,
          manualPaymentTrxId: isTrialPlan ? undefined : manualTrxId.trim().toUpperCase(),
          manualPaymentDocument: isTrialPlan ? undefined : manualPaymentDoc?.base64,
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
    const result = otpVerifySchema.safeParse({ otpCode: cleanCode });
    if (!result.success) {
      setError(result.error.issues[0]?.message || "Please enter the complete 6-digit OTP code sent to your email.");
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
            href="/pricing"
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-brand-primary/50 hover:text-brand-primary dark:hover:text-brand-primary hover:-translate-x-0.5 active:scale-95 transition-all duration-200 group"
          >
            <ArrowLeft className="h-5 w-5 text-slate-500 group-hover:text-brand-primary group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Pricing</span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <ThemeToggle />

            <Link
              href="/"
              className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-brand-primary/50 transition-all group"
            >
              {settings.logoUrl ? (
                <div className="h-9 w-9 rounded-lg overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 shadow-xs transition-transform group-hover:scale-105 shrink-0">
                  <img
                    src={settings.logoUrl}
                    alt={settings.siteName || "Logo"}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-9 w-9 rounded-lg bg-brand-primary flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105 shrink-0">
                  <Pill className="h-5 w-5 transform -rotate-45" />
                </div>
              )}
              <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-brand-primary transition-colors">
                {settings.siteName?.replace(/\s+SaaS$/i, "") || "PharmaBiz"}
              </span>
            </Link>
          </div>
        </div>

        {/* Heading & Wizard Steps */}
        <div className="text-center max-w-xl mx-auto space-y-2.5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
            <ShieldCheck className="h-4 w-4" />
            Pharmacy Registration
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Register Your Pharmacy
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Complete the 3 quick steps to set up your pharmacy account.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-sm font-bold">
          <div
            className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-xl border transition ${
              currentStep === 1
                ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                : currentStep > 1
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800"
            }`}
          >
            <span className="h-6 w-6 rounded-full bg-black/10 flex items-center justify-center text-xs">
              {currentStep > 1 ? <Check className="h-3.5 w-3.5" /> : "1"}
            </span>
            <span><span className="hidden sm:inline">1. </span>Owner Info</span>
          </div>

          <div className="hidden sm:block w-8 h-0.5 bg-slate-200 dark:bg-slate-800" />

          <div
            className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-xl border transition ${
              currentStep === 2
                ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                : currentStep > 2
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800"
            }`}
          >
            <span className="h-6 w-6 rounded-full bg-black/10 flex items-center justify-center text-xs">
              {currentStep > 2 ? <Check className="h-3.5 w-3.5" /> : "2"}
            </span>
            <span><span className="hidden sm:inline">2. </span>Documents</span>
          </div>

          <div className="hidden sm:block w-8 h-0.5 bg-slate-200 dark:bg-slate-800" />

          <div
            className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-xl border transition ${
              currentStep === 3
                ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                : currentStep > 3
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800"
            }`}
          >
            <span className="h-6 w-6 rounded-full bg-black/10 flex items-center justify-center text-xs">
              {currentStep > 3 ? <Check className="h-3.5 w-3.5" /> : "3"}
            </span>
            <span><span className="hidden sm:inline">3. </span>Plan & Submit</span>
          </div>
        </div>

        {error && (
          <div className="p-4 sm:p-5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-semibold flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {otpSuccessMessage && (
          <div className="p-4 sm:p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{otpSuccessMessage}</span>
          </div>
        )}

        {/* ================= STEP 1: OWNER & PHARMACY INFO ================= */}
        {currentStep === 1 && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  Step 1: Owner & Pharmacy Info
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Enter your pharmacy and account credentials.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Pharmacy Legal Name *
                </label>
                <div className="relative">
                  <Building className="h-5 w-5 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => handleInputChange("companyName", e.target.value)}
                    placeholder="e.g. Popular Pharmacy Ltd."
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 ${
                      fieldErrors.companyName
                        ? "border-rose-500 focus:ring-rose-500 bg-rose-50/10"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-brand-primary"
                    }`}
                  />
                </div>
                {fieldErrors.companyName && (
                  <p className="text-xs text-rose-500 font-semibold mt-1">{fieldErrors.companyName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Owner Name *
                </label>
                <div className="relative">
                  <User className="h-5 w-5 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={formData.ownerName}
                    onChange={(e) => handleInputChange("ownerName", e.target.value)}
                    placeholder="e.g. Dr. Rafiqul Islam"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 ${
                      fieldErrors.ownerName
                        ? "border-rose-500 focus:ring-rose-500 bg-rose-50/10"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-brand-primary"
                    }`}
                  />
                </div>
                {fieldErrors.ownerName && (
                  <p className="text-xs text-rose-500 font-semibold mt-1">{fieldErrors.ownerName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="h-5 w-5 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    required
                    maxLength={12}
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="017XXXXXXXX (11-12 digits)"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 ${
                      fieldErrors.phone
                        ? "border-rose-500 focus:ring-rose-500 bg-rose-50/10"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-brand-primary"
                    }`}
                  />
                </div>
                {fieldErrors.phone ? (
                  <p className="text-xs text-rose-500 font-semibold mt-1">{fieldErrors.phone}</p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">Numbers only, 11 to 12 digits (no letters allowed)</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="h-5 w-5 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="owner@example.com"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 ${
                      fieldErrors.email
                        ? "border-rose-500 focus:ring-rose-500 bg-rose-50/10"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-brand-primary"
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-xs text-rose-500 font-semibold mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Pharmacy Address *
                </label>
                <div className="relative">
                  <MapPin className="h-5 w-5 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="e.g. Dhanmondi, Dhaka"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 ${
                      fieldErrors.address
                        ? "border-rose-500 focus:ring-rose-500 bg-rose-50/10"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-brand-primary"
                    }`}
                  />
                </div>
                {fieldErrors.address && (
                  <p className="text-xs text-rose-500 font-semibold mt-1">{fieldErrors.address}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="h-5 w-5 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    placeholder="Minimum 6 characters"
                    className={`w-full pl-11 pr-11 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 ${
                      fieldErrors.password
                        ? "border-rose-500 focus:ring-rose-500 bg-rose-50/10"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-brand-primary"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-rose-500 font-semibold mt-1">{fieldErrors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="h-5 w-5 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    placeholder="Re-enter password"
                    className={`w-full pl-11 pr-11 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 ${
                      fieldErrors.confirmPassword
                        ? "border-rose-500 focus:ring-rose-500 bg-rose-50/10"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-brand-primary"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-rose-500 font-semibold mt-1">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-3.5 rounded-xl bg-brand-primary text-white font-bold text-sm shadow-md hover:opacity-90 transition flex items-center gap-2 cursor-pointer"
              >
                <span>Continue to Step 2</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: REGULATORY DOCUMENTS ================= */}
        {currentStep === 2 && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  Step 2: License Documents
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Upload your NID, Trade License, and Drug License.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* 1. NID Document */}
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-brand-primary" />
                    <span>1. National ID (NID) *</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                    {nidFrontDoc && (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> Front OK
                      </span>
                    )}
                    {nidBackDoc && (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> Back OK
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    NID Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 19902692512345678"
                    value={formData.nidNumber}
                    onChange={(e) => handleInputChange("nidNumber", e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm font-mono font-bold focus:outline-none focus:ring-2 ${
                      fieldErrors.nidNumber
                        ? "border-rose-500 focus:ring-rose-500 bg-rose-50/10"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-brand-primary"
                    }`}
                  />
                  {fieldErrors.nidNumber && (
                    <p className="text-xs text-rose-500 font-semibold mt-1">{fieldErrors.nidNumber}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* NID Front */}
                  <div className={`p-4 rounded-xl bg-white dark:bg-slate-800 border space-y-3 ${
                    fieldErrors.hasNidFront ? "border-rose-400 bg-rose-50/10" : "border-slate-200 dark:border-slate-700"
                  }`}>
                    <div className="flex items-center justify-between text-sm font-bold text-slate-800 dark:text-slate-200">
                      <span>Front Side *</span>
                      {nidFrontDoc && <span className="text-xs text-emerald-600 font-semibold truncate max-w-[140px]">{nidFrontDoc.name}</span>}
                    </div>
                    <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed text-sm font-bold cursor-pointer transition ${
                      fieldErrors.hasNidFront
                        ? "border-rose-400 bg-rose-50/50 text-rose-600"
                        : "border-brand-primary/40 hover:border-brand-primary bg-brand-primary/5 text-brand-primary"
                    }`}>
                      <Upload className="h-4 w-4" />
                      <span>{nidFrontDoc ? "Change Front File" : "Upload Front Side"}</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => handleFileChange(e, setNidFrontDoc, "NID Front", "hasNidFront")}
                        className="sr-only"
                      />
                    </label>
                    {fieldErrors.hasNidFront && (
                      <p className="text-xs text-rose-500 font-semibold">{fieldErrors.hasNidFront}</p>
                    )}
                  </div>

                  {/* NID Back */}
                  <div className={`p-4 rounded-xl bg-white dark:bg-slate-800 border space-y-3 ${
                    fieldErrors.hasNidBack ? "border-rose-400 bg-rose-50/10" : "border-slate-200 dark:border-slate-700"
                  }`}>
                    <div className="flex items-center justify-between text-sm font-bold text-slate-800 dark:text-slate-200">
                      <span>Back Side *</span>
                      {nidBackDoc && <span className="text-xs text-emerald-600 font-semibold truncate max-w-[140px]">{nidBackDoc.name}</span>}
                    </div>
                    <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed text-sm font-bold cursor-pointer transition ${
                      fieldErrors.hasNidBack
                        ? "border-rose-400 bg-rose-50/50 text-rose-600"
                        : "border-brand-primary/40 hover:border-brand-primary bg-brand-primary/5 text-brand-primary"
                    }`}>
                      <Upload className="h-4 w-4" />
                      <span>{nidBackDoc ? "Change Back File" : "Upload Back Side"}</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => handleFileChange(e, setNidBackDoc, "NID Back", "hasNidBack")}
                        className="sr-only"
                      />
                    </label>
                    {fieldErrors.hasNidBack && (
                      <p className="text-xs text-rose-500 font-semibold">{fieldErrors.hasNidBack}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Trade License */}
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-emerald-600" />
                    <span>2. Trade License *</span>
                  </div>
                  {tradeDoc && (
                    <span className="text-xs sm:text-sm font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Attached: {tradeDoc.name}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Trade License Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TRAD/DNCC/019283/2026"
                      value={formData.tradeLicenseNumber}
                      onChange={(e) => handleInputChange("tradeLicenseNumber", e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-mono font-bold focus:outline-none focus:ring-2 ${
                        fieldErrors.tradeLicenseNumber
                          ? "border-rose-500 focus:ring-rose-500 bg-rose-50/10"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-brand-primary"
                      }`}
                    />
                    {fieldErrors.tradeLicenseNumber && (
                      <p className="text-xs text-rose-500 font-semibold mt-1">{fieldErrors.tradeLicenseNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Upload Document *
                    </label>
                    <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed text-sm font-bold cursor-pointer transition ${
                      fieldErrors.hasTradeDoc
                        ? "border-rose-400 bg-rose-50/50 text-rose-600"
                        : "border-emerald-500/40 hover:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600"
                    }`}>
                      <Upload className="h-4 w-4" />
                      <span>{tradeDoc ? "Change Document" : "Upload Trade License"}</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => handleFileChange(e, setTradeDoc, "Trade License", "hasTradeDoc")}
                        className="sr-only"
                      />
                    </label>
                    {fieldErrors.hasTradeDoc && (
                      <p className="text-xs text-rose-500 font-semibold mt-1">{fieldErrors.hasTradeDoc}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Drug License */}
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Pill className="h-5 w-5 text-purple-600" />
                    <span>3. Drug License *</span>
                  </div>
                  {drugDoc && (
                    <span className="text-xs sm:text-sm font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Attached: {drugDoc.name}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Drug License Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. DL-DHAKA-2024-9988"
                      value={formData.drugLicenseNumber}
                      onChange={(e) => handleInputChange("drugLicenseNumber", e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-mono font-bold focus:outline-none focus:ring-2 ${
                        fieldErrors.drugLicenseNumber
                          ? "border-rose-500 focus:ring-rose-500 bg-rose-50/10"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-brand-primary"
                      }`}
                    />
                    {fieldErrors.drugLicenseNumber && (
                      <p className="text-xs text-rose-500 font-semibold mt-1">{fieldErrors.drugLicenseNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Upload Document *
                    </label>
                    <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed text-sm font-bold cursor-pointer transition ${
                      fieldErrors.hasDrugDoc
                        ? "border-rose-400 bg-rose-50/50 text-rose-600"
                        : "border-purple-500/40 hover:border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-purple-600"
                    }`}>
                      <Upload className="h-4 w-4" />
                      <span>{drugDoc ? "Change Document" : "Upload Drug License"}</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => handleFileChange(e, setDrugDoc, "Drug License", "hasDrugDoc")}
                        className="sr-only"
                      />
                    </label>
                    {fieldErrors.hasDrugDoc && (
                      <p className="text-xs text-rose-500 font-semibold mt-1">{fieldErrors.hasDrugDoc}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition"
              >
                &larr; Back
              </button>

              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-3.5 rounded-xl bg-brand-primary text-white font-bold text-sm shadow-md hover:opacity-90 transition flex items-center gap-2 cursor-pointer"
              >
                <span>Continue to Step 3</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: PLAN SELECTION & SUBMISSION ================= */}
        {currentStep === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  Step 3: Select Plan & Submit
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Review your summary and choose a subscription plan.
                </p>
              </div>

              {/* Application Summary Box */}
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3 text-sm">
                <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs text-brand-primary">
                  Application Summary
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
                  <div><strong>Pharmacy:</strong> {formData.companyName}</div>
                  <div><strong>Owner:</strong> {formData.ownerName}</div>
                  <div><strong>Email:</strong> {formData.email}</div>
                  <div><strong>Phone:</strong> {formData.phone}</div>
                  
                  <div className="sm:col-span-2 border-t border-slate-200 dark:border-slate-700 pt-3 space-y-1.5">
                    <div>
                      <strong>NID No:</strong> {formData.nidNumber} &bull;{" "}
                      <span className="text-brand-primary font-semibold">Front: {nidFrontDoc?.name}</span> |{" "}
                      <span className="text-brand-primary font-semibold">Back: {nidBackDoc?.name}</span>
                    </div>
                    <div>
                      <strong>Trade License:</strong> {formData.tradeLicenseNumber} &bull;{" "}
                      <span className="text-emerald-600 font-semibold">{tradeDoc?.name}</span>
                    </div>
                    <div>
                      <strong>Drug License:</strong> {formData.drugLicenseNumber} &bull;{" "}
                      <span className="text-purple-600 font-semibold">{drugDoc?.name}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Plan Choice */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                  Choose Subscription Plan *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {plans
                    .filter((p: any) => !p.isCustom && !p.features?.isCustom && !p.name?.toLowerCase().includes("custom"))
                    .sort((a: any, b: any) => {
                      const isTrialA = Boolean(a.tier === "TRIAL" || a.isTrial || a.features?.isTrial || Number(a.price) === 0);
                      const isTrialB = Boolean(b.tier === "TRIAL" || b.isTrial || b.features?.isTrial || Number(b.price) === 0);
                      if (isTrialA && !isTrialB) return -1;
                      if (!isTrialA && isTrialB) return 1;
                      return Number(a.price || 0) - Number(b.price || 0);
                    })
                    .map((p) => {
                    const isSelected = selectedPlanId === p.id;
                    const isTrial = Boolean(p.tier === "TRIAL" || p.isTrial || p.features?.isTrial || Number(p.price) === 0);
                    const pTrialDays = Number(p.trialDays || p.features?.trialDays || 14);
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
                          <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{p.name}</span>
                            {isTrial && (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                Free Trial
                              </span>
                            )}
                          </div>
                          <div className="text-xl font-black text-brand-primary mt-1 font-mono">
                            {isTrial ? (
                              <>
                                ৳0
                                <span className="text-xs font-normal text-slate-400"> ({pTrialDays} Days)</span>
                              </>
                            ) : (
                              <>
                                ৳{price.toLocaleString()}
                                <span className="text-xs font-normal text-slate-400">/mo</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 mt-2 font-medium">
                          Up to {p.maxBranches >= 999 ? "Unlimited" : p.maxBranches} Store(s)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Billing Toggle (hidden for free trial) */}
              {!isTrialPlan && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-sm">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Billing Interval</span>
                  <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 p-1 rounded-lg text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setBillingCycle("MONTHLY")}
                      className={`px-3.5 py-1.5 rounded-md ${billingCycle === "MONTHLY" ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs" : "text-slate-500"}`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle("YEARLY")}
                      className={`px-3.5 py-1.5 rounded-md ${billingCycle === "YEARLY" ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs" : "text-slate-500"}`}
                    >
                      Yearly (-15%)
                    </button>
                  </div>
                </div>
              )}

              {/* Initial Investment & License Fee Breakdown Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-brand-primary/5 dark:from-slate-800/60 dark:to-brand-primary/10 border border-brand-primary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-brand-primary" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      {isTrialPlan ? "Free Trial Registration Summary" : "Initial Registration Investment"}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-brand-primary bg-brand-primary/10 px-2.5 py-0.5 rounded-full">
                    {isTrialPlan ? `${trialDays} Days Free Trial` : "Transparent Pricing"}
                  </span>
                </div>

                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <FileCheck className="h-3.5 w-3.5 text-brand-primary shrink-0" />
                      <span>One-Time Software License Fee:</span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {isTrialPlan ? <span className="text-emerald-600 font-bold">Waived (৳0)</span> : "৳5,000"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>
                        {selectedPlan.name} ({isTrialPlan ? `${trialDays} Days Full Access` : billingCycle === "YEARLY" ? "Yearly - 15% Off" : "Monthly"}):
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {isTrialPlan ? <span className="text-emerald-600 font-bold">৳0</span> : `৳${planPrice.toLocaleString()}`}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-700/80 pt-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                        {isTrialPlan ? "Total Payable Now:" : "Total Payable Upon Approval:"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {isTrialPlan
                          ? "No payment or credit card required during trial period"
                          : `License fee (৳5,000) + Selected Plan (৳${planPrice.toLocaleString()})`}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        {isTrialPlan ? "৳0" : `৳${totalPrice.toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ================= PAYMENT METHOD SELECTION & DETAILS ================= */}
              {isTrialPlan ? (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-teal-50/50 to-emerald-50/80 dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-emerald-950/20 border-2 border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-emerald-500/20 shrink-0">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>🎉 Free Trial Registration (পেমেন্ট লাগবে না)</span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                          {trialDays} Days Free
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        No credit card or bKash remittance required
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-xl border border-emerald-500/20 flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      আপনার এই ফ্রি ট্রায়াল রেজিস্ট্রেশনের জন্য কোনো টাকা পাঠানো লাগবে না। ড্রাগ লাইসেন্স ও প্রয়োজনীয় কাগজপত্র যাচাই সাপেক্ষে সুপার অ্যাডমিন অনুমোদন করলেই আপনি <strong>{trialDays} দিন</strong> সম্পূর্ণ ফ্রিতে সফটওয়্যার ব্যবহার করতে পারবেন। নিচের বক্সে সম্মতি দিয়ে OTP ভেরিফিকেশনের জন্য সাবমিট করুন।
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-brand-primary" />
                      <span>Payment & Verification (পেমেন্ট ও ভেরিফিকেশন)</span>
                    </h3>
                    <span className="text-[11px] font-semibold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">
                      Step 3 of 3
                    </span>
                  </div>

                {/* Gateway Switcher if both are active */}
                {gateways.manualBkash?.enabled && gateways.sslcommerz?.enabled && (
                  <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod("MANUAL_BKASH")}
                      className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                        selectedPaymentMethod === "MANUAL_BKASH"
                          ? "bg-[#D12053] text-white shadow-md shadow-[#D12053]/20"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    >
                      <Smartphone className="h-4 w-4" />
                      <span>bKash Send Money</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod("SSLCOMMERZ")}
                      className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                        selectedPaymentMethod === "SSLCOMMERZ"
                          ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Online Payment (SSLCommerz)</span>
                    </button>
                  </div>
                )}

                {/* MANUAL BKASH PAYMENT BOX */}
                {selectedPaymentMethod === "MANUAL_BKASH" && (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-pink-50/60 to-rose-50/40 dark:from-pink-950/20 dark:to-slate-900 border-2 border-pink-200 dark:border-pink-900/60 space-y-4">
                    {/* bKash Header Badge & Number Card */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-pink-200/80 dark:border-pink-900/50 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-[#D12053] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm shadow-[#D12053]/30">
                          bKash
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              bKash Send Money Number:
                            </span>
                            <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">
                              {gateways.manualBkash?.accountType || "Personal"}
                            </span>
                          </div>
                          <div className="text-base sm:text-lg font-black text-[#D12053] font-mono tracking-wider">
                            {gateways.manualBkash?.accountNumber || "01750000000"}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const num = gateways.manualBkash?.accountNumber || "01750000000";
                          navigator.clipboard.writeText(num);
                          setCopiedNumber(true);
                          setTimeout(() => setCopiedNumber(false), 2000);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-pink-50 text-[#D12053] hover:bg-pink-100 dark:bg-pink-950/40 dark:hover:bg-pink-900/60 border border-pink-200 dark:border-pink-900 transition active:scale-95 cursor-pointer"
                      >
                        {copiedNumber ? (
                          <>
                            <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-600">কপি হয়েছে!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>নম্বর কপি করুন</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Instruction Alert */}
                    <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-pink-50/50 dark:bg-pink-950/10 p-3.5 rounded-xl border border-pink-100 dark:border-pink-900/30 flex items-start gap-2">
                      <Info className="h-4 w-4 text-[#D12053] shrink-0 mt-0.5" />
                      <div>
                        {gateways.manualBkash?.instructions ||
                          "অনুগ্রহ করে উপরের নম্বরে Send Money করুন। মোট প্রদেয়: ৳" + totalPrice.toLocaleString() + "। টাকা পাঠানোর পর প্রেরকের নম্বর, TrxID এবং স্ক্রিনশট আপলোড করুন।"}
                      </div>
                    </div>

                    {/* 3 Form Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {/* Sender Phone Number */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          বিকাশ প্রেরকের নম্বর (Sender Phone) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={manualSenderNumber}
                            onChange={(e) => {
                              const clean = e.target.value.replace(/\D/g, "").slice(0, 12);
                              setManualSenderNumber(clean);
                              if (fieldErrors.manualSenderNumber) {
                                setFieldErrors((prev) => {
                                  const n = { ...prev };
                                  delete n.manualSenderNumber;
                                  return n;
                                });
                              }
                            }}
                            placeholder="01XXXXXXXXX"
                            className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-sm font-mono focus:outline-none transition ${
                              fieldErrors.manualSenderNumber
                                ? "border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                                : "border-slate-300 dark:border-slate-700 focus:border-[#D12053]"
                            } bg-white dark:bg-slate-900 text-slate-900 dark:text-white`}
                          />
                        </div>
                        {fieldErrors.manualSenderNumber && (
                          <p className="text-[11px] text-rose-500 font-medium mt-1">
                            {fieldErrors.manualSenderNumber}
                          </p>
                        )}
                      </div>

                      {/* Transaction ID */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          ট্রানজেকশন আইডি (Transaction ID / TrxID) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <KeyRound className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={manualTrxId}
                            onChange={(e) => {
                              setManualTrxId(e.target.value.toUpperCase());
                              if (fieldErrors.manualTrxId) {
                                setFieldErrors((prev) => {
                                  const n = { ...prev };
                                  delete n.manualTrxId;
                                  return n;
                                });
                              }
                            }}
                            placeholder="e.g. BL6A59X..."
                            className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-sm font-mono uppercase focus:outline-none transition ${
                              fieldErrors.manualTrxId
                                ? "border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                                : "border-slate-300 dark:border-slate-700 focus:border-[#D12053]"
                            } bg-white dark:bg-slate-900 text-slate-900 dark:text-white`}
                          />
                        </div>
                        {fieldErrors.manualTrxId && (
                          <p className="text-[11px] text-rose-500 font-medium mt-1">
                            {fieldErrors.manualTrxId}
                          </p>
                        )}
                      </div>

                      {/* Screenshot Upload */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          টাকা পাঠানোর স্ক্রিনশট (Payment Screenshot) <span className="text-rose-500">*</span>
                        </label>
                        <div
                          className={`p-4 rounded-xl border-2 border-dashed transition flex flex-col sm:flex-row items-center justify-between gap-3 ${
                            fieldErrors.manualPaymentDoc
                              ? "border-rose-400 bg-rose-50/40 dark:bg-rose-950/20"
                              : manualPaymentDoc
                              ? "border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20"
                              : "border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {manualPaymentDoc ? (
                              <div className="h-12 w-12 rounded-lg overflow-hidden border border-emerald-300 shrink-0 bg-slate-100 flex items-center justify-center">
                                <img
                                  src={manualPaymentDoc.base64}
                                  alt="Preview"
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="h-10 w-10 rounded-xl bg-pink-100 text-[#D12053] flex items-center justify-center shrink-0">
                                <Upload className="h-5 w-5" />
                              </div>
                            )}
                            <div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {manualPaymentDoc
                                  ? manualPaymentDoc.name
                                  : "বিকাশ সাকসেস মেসেজ বা স্ক্রিনশট আপলোড করুন"}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {manualPaymentDoc
                                  ? `${(manualPaymentDoc.size / 1024).toFixed(1)} KB &bull; Uploaded`
                                  : "PNG, JPG বা PDF (Max 10MB)"}
                              </div>
                            </div>
                          </div>

                          <label className="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold bg-[#D12053] text-white hover:opacity-90 transition shrink-0 active:scale-95 shadow-sm">
                            <span>{manualPaymentDoc ? "ছবি পরিবর্তন করুন" : "ফাইল নির্বাচন করুন"}</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e) =>
                                handleFileChange(
                                  e,
                                  setManualPaymentDoc,
                                  "Payment Screenshot",
                                  "manualPaymentDoc"
                                )
                              }
                            />
                          </label>
                        </div>
                        {fieldErrors.manualPaymentDoc && (
                          <p className="text-[11px] text-rose-500 font-medium mt-1">
                            {fieldErrors.manualPaymentDoc}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* SSLCommerz Option Info */}
                {selectedPaymentMethod === "SSLCOMMERZ" && (
                  <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-300 text-xs space-y-1.5 leading-relaxed">
                    <div className="font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                      <CreditCard className="h-4 w-4" />
                      <span>Online Payment Gateway</span>
                    </div>
                    <p>
                      You will be able to pay ৳{totalPrice.toLocaleString()} via Debit/Credit Cards, Mobile Banking, or Internet Banking. After payment, your application will be verified.
                    </p>
                  </div>
                )}
              </div>
              )}

              {/* Mandatory Terms & Policy Checkbox */}
              <div
                className={`p-4 rounded-2xl border-2 transition ${
                  fieldErrors.terms
                    ? "border-rose-500 bg-rose-50/60 dark:bg-rose-950/20"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40"
                }`}
              >
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked);
                      if (e.target.checked && fieldErrors.terms) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.terms;
                          return next;
                        });
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer shrink-0"
                  />
                  <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 select-none">
                    I have read and agree to the{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowTermsModal(true);
                      }}
                      className="text-brand-primary font-bold underline hover:opacity-80 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Terms & Conditions and Data Retention Policy</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-rose-500 font-bold ml-1">*</span>
                  </span>
                </label>
                {fieldErrors.terms && (
                  <p className="text-xs text-rose-500 font-semibold mt-2 pl-7 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{fieldErrors.terms}</span>
                  </p>
                )}
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition"
                >
                  &larr; Back
                </button>

                <button
                  type="button"
                  onClick={handleSubmitRegistration}
                  disabled={loading}
                  className="px-8 py-3.5 rounded-xl bg-brand-primary text-white font-bold text-sm shadow-lg hover:opacity-90 transition active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting Application...</span>
                    </>
                  ) : (
                    <>
                      <span>{isTrialPlan ? "Submit & Verify with OTP (Free Trial)" : "Submit Application"}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sidebar Notice */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 shadow-md text-sm">
              <div className="text-sm font-bold uppercase text-brand-primary tracking-wider">
                Registration Process
              </div>
              <div className="space-y-4 text-slate-600 dark:text-slate-400">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-brand-primary/10 text-brand-primary font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div className="text-sm">
                    <strong className="text-slate-900 dark:text-white">Email Verification:</strong> Enter the 6-digit OTP code sent to your registered email.
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-brand-primary/10 text-brand-primary font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div className="text-sm">
                    <strong className="text-slate-900 dark:text-white">Admin Inspection:</strong> Admin reviews your uploaded NID, Trade License, and Drug License.
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-brand-primary/10 text-brand-primary font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <div className="text-sm">
                    <strong className="text-slate-900 dark:text-white">{isTrialPlan ? "Approval & Activation:" : "Approval & Payment:"}</strong>{" "}
                    {isTrialPlan
                      ? `Admin verifies documents and activates your ${trialDays}-day free trial with zero payment required.`
                      : `Receive approval email and complete payment (৳${totalPrice.toLocaleString()} — includes ৳5,000 license fee + ৳${planPrice.toLocaleString()} plan) to activate your pharmacy.`}
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

            <div className="space-y-1.5">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                Verify Your Email
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Enter the 6-digit verification code sent to: <br />
                <strong className="text-slate-900 dark:text-white font-mono">{formData.email}</strong>
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  6-Digit Verification Code
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
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.trim().length < 6}
                className="w-full py-3.5 rounded-xl bg-brand-primary text-white font-bold text-sm shadow-lg hover:opacity-90 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying OTP...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Confirm & Verify</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-2 text-sm">
              <span className="text-slate-500">Didn't receive the code?</span>
              {otpCountdown > 0 ? (
                <span className="text-slate-500 font-medium font-mono text-xs">
                  Resend available in {otpCountdown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendingOtp}
                  className="font-bold text-brand-primary hover:underline flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {resendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
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
                Application Submitted 🎉
              </h2>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                Your application has been submitted and is pending admin approval.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-left space-y-3 text-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700">
                <span className="text-slate-500">Application Status</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Pending Approval
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Pharmacy Name</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formData.companyName}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Owner Name</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formData.ownerName}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Registered Email</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{formData.email}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Selected Plan</span>
                <span className="font-bold text-brand-primary">
                  {selectedPlan?.name || "Professional"} {isTrialPlan ? `(🎉 Free Trial - ${trialDays} Days)` : `(${billingCycle})`}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Total Investment</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {isTrialPlan ? "৳0 (Free Trial)" : `৳${totalPrice.toLocaleString()}`}
                </span>
              </div>

              {isTrialPlan ? (
                <div className="flex justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                  <span className="text-slate-500">Payment Status</span>
                  <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                    🎉 Free Trial (No Payment Required)
                  </span>
                </div>
              ) : selectedPaymentMethod === "MANUAL_BKASH" && (
                <>
                  <div className="flex justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                    <span className="text-slate-500">Payment Method</span>
                    <span className="font-bold text-[#D12053]">bKash Send Money</span>
                  </div>
                  {manualSenderNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sender Number</span>
                      <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                        {manualSenderNumber}
                      </span>
                    </div>
                  )}
                  {manualTrxId && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Transaction ID (TrxID)</span>
                      <span className="font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                        {manualTrxId}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-950 dark:text-emerald-300 text-xs sm:text-sm text-left leading-relaxed space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <Clock className="h-4 w-4" />
                <span>পরবর্তী পদক্ষেপ (Next Steps)</span>
              </div>
              <p>
                {isTrialPlan
                  ? "আমাদের কমপ্লায়েন্স টিম আপনার আপলোডকৃত NID, ট্রেড লাইসেন্স এবং ড্রাগ লাইসেন্স যাচাই করে ফ্রি ট্রায়াল অনুমোদন করবে।"
                  : "আমাদের কমপ্লায়েন্স টিম আপনার আপলোডকৃত NID, ট্রেড লাইসেন্স, ড্রাগ লাইসেন্স এবং বিকাশ ট্রানজেকশন যাচাই করে অনুমোদন করবে।"}
              </p>
              <p className="font-medium text-emerald-800 dark:text-emerald-200">
                {isTrialPlan
                  ? `সুপার অ্যাডমিন অনুমোদন সম্পন্ন করলেই সাথে সাথে আপনার ইমেইলে নোটিফিকেশন যাবে এবং ${trialDays} দিনের ফ্রি ট্রায়াল এক্টিভ হয়ে যাবে।`
                  : "অ্যাডমিন অনুমোদন সম্পন্ন হলে আপনার ইমেইলে একটি অনুমোদন নোটিফিকেশন যাবে এবং সাথে সাথে আপনার ড্যাশবোর্ড অ্যাক্টিভ হয়ে যাবে।"}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href={`/verification-status?email=${encodeURIComponent(formData.email.trim().toLowerCase())}&tenantId=${registeredTenantId}`}
                className="flex-1 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-bold text-sm transition flex items-center justify-center gap-2"
              >
                <span>Track Status</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={`/login?email=${encodeURIComponent(formData.email.trim().toLowerCase())}`}
                className="flex-1 py-3.5 rounded-xl bg-brand-primary text-white font-bold text-sm shadow-md hover:opacity-90 transition flex items-center justify-center gap-2"
              >
                <span>Go to Login</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ================= TERMS & CONDITIONS AND DATA RETENTION POLICY MODAL ================= */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                    Terms & Conditions & Data Retention Policy
                  </h3>
                  <p className="text-xs text-slate-500">
                    PharmaBiz Software Licensing, Cloud Hosting & Expiration Terms
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {/* Section 1 */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <span className="h-6 w-6 rounded-full bg-brand-primary text-white text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span>One-Time Software License Fee (৳5,000)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 pl-8">
                  Upon initial registration, a mandatory one-time software license and cloud server provisioning fee of <strong>৳5,000</strong> is required in addition to your chosen subscription plan.
                </p>
              </div>

              {/* Section 2 */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                  <span className="h-6 w-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>30-Day Free Renewal Grace Period (Days 1–30)</span>
                </div>
                <p className="text-xs text-emerald-900/90 dark:text-emerald-200/90 pl-8">
                  If your subscription expires, you have up to <strong>30 days</strong> to renew or select a new plan with <strong>zero extra fee</strong> (regular plan renewal price only). All data remains active.
                </p>
              </div>

              {/* Section 3 */}
              <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/30 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200 text-sm">
                  <span className="h-6 w-6 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span>Data Retention & Reactivation Fee (Days 31–90)</span>
                </div>
                <p className="text-xs text-amber-900/90 dark:text-amber-200/90 pl-8">
                  Between day 31 and day 90 after expiration, your complete store data is securely preserved on our cloud servers. Renewing during this window requires a <strong>৳2,000 Data Retention Fee</strong> + your selected subscription plan.
                </p>
              </div>

              {/* Section 4 */}
              <div className="p-4 rounded-2xl bg-rose-500/10 dark:bg-rose-950/20 border border-rose-500/30 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-rose-900 dark:text-rose-200 text-sm">
                  <span className="h-6 w-6 rounded-full bg-rose-600 text-white text-xs flex items-center justify-center shrink-0">
                    4
                  </span>
                  <span>Permanent Data Purge & New Registration (After 90 Days)</span>
                </div>
                <p className="text-xs text-rose-900/90 dark:text-rose-200/90 pl-8">
                  After <strong>90 continuous days (3 months)</strong> of expiration, historical pharmacy data cannot be restored and is permanently deleted. To use the software again, a new pharmacy registration with the initial ৳5,000 license fee + plan price is required.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Please accept the terms to complete your application.</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAgreedToTerms(true);
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.terms;
                      return next;
                    });
                    setShowTermsModal(false);
                  }}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold shadow-md hover:opacity-90 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>I Agree & Accept Terms</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
