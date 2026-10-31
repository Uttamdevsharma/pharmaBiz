"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import {
  CreditCard,
  Sparkles,
  Calendar,
  CheckCircle2,
  Loader2,
  Check,
  History,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  X,
  Copy,
  CheckCheck,
  Phone,
  Smartphone,
  MessageSquare,
  ShieldCheck,
  FileCheck,
} from "lucide-react";
import { getClientPlanConfig } from "@/lib/planLimits";
import { ImageUploader } from "@/components/common/ImageUploader";

interface SubscriptionModuleProps {
  onNavigate?: (module: OwnerModule) => void;
}

// Persistent module cache
let cachedCurrentSub: any = null;
let cachedSubDetails: any = null;
let cachedPlans: any[] = [];
let cachedBranches: any[] = [];
let cachedStaff: any[] = [];

// Standard fallback capability lists matching pricing page
const FALLBACK_CAPABILITIES: Record<string, string[]> = {
  STARTER: [
    "1 pharmacy outlet",
    "2 staff accounts",
    "Full offline POS counter billing",
    "Inventory & batch expiry tracking",
    "Sales and purchase reports",
    "Thermal receipt & barcode support",
  ],
  GROWTH: [
    "Up to 3 pharmacy outlets",
    "10 staff accounts",
    "Full offline POS & auto cloud sync",
    "Multi-branch stock synchronization",
    "Inventory & batch expiry tracking",
    "Inter-branch stock transfers",
    "Advanced business analytics",
    "Supplier & credit management",
    "Priority support",
  ],
  ENTERPRISE: [
    "Unlimited outlets & branches",
    "Unlimited staff accounts",
    "Full offline POS & auto cloud sync",
    "Centralized multi-store inventory control",
    "Consolidated reporting & audit trail",
    "Custom roles & granular RBAC permissions",
    "Dedicated account & support manager",
    "Advanced analytics & VAT/tax export",
  ],
};

export function SubscriptionModule({ onNavigate }: SubscriptionModuleProps = {}) {
  const [currentSub, setCurrentSub] = useState<any>(() => cachedCurrentSub);
  const [subDetails, setSubDetails] = useState<any>(() => cachedSubDetails);
  const [plans, setPlans] = useState<any[]>(() => cachedPlans);
  const [branches, setBranches] = useState<any[]>(() => cachedBranches);
  const [staff, setStaff] = useState<any[]>(() => cachedStaff);
  const [loading, setLoading] = useState(false);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");

  // Dynamic Gateway and Renewal Modal State
  const [platformSettings, setPlatformSettings] = useState<any>({
    bkash_merchant_active: false,
    nagad_merchant_active: false,
    eps_merchant_active: false,
    manual_payment_active: true,
    bkash_number: "01750000000",
    nagad_number: "01850000000",
    support_phone: "01973590937",
  });
  const [selectedGateway, setSelectedGateway] = useState<"BKASH_DIRECT" | "NAGAD_DIRECT" | "EPS" | "MANUAL" | "SSLCOMMERZ">("BKASH_DIRECT");
  const [initiatingGateway, setInitiatingGateway] = useState(false);
  const [gateways, setGateways] = useState<any>({
    manualBkash: { enabled: true, number: "", type: "PERSONAL", instructions: "" },
    sslcommerz: { enabled: false },
  });
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [selectedRenewalPlan, setSelectedRenewalPlan] = useState<any | null>(null);
  const [renewalSenderNumber, setRenewalSenderNumber] = useState("");
  const [renewalTrxId, setRenewalTrxId] = useState("");
  const [renewalScreenshotUrl, setRenewalScreenshotUrl] = useState("");
  const [renewalScreenshotPublicId, setRenewalScreenshotPublicId] = useState("");
  const [submittingRenewal, setSubmittingRenewal] = useState(false);
  const [renewalSuccess, setRenewalSuccess] = useState<string | null>(null);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedNagad, setCopiedNagad] = useState(false);

  // Check URL params for gateway callback
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const isSuccess = urlParams.get("success") === "true" || urlParams.get("payment") === "success";
      const trx = urlParams.get("trxId") || urlParams.get("tran_id");
      const err = urlParams.get("error");
      if (isSuccess && trx) {
        setRenewalSuccess(`Payment verified successfully! TrxID: ${trx}. Your subscription has been updated.`);
        setShowRenewalModal(true);
        cachedCurrentSub = null;
        cachedSubDetails = null;
        loadData();
      }
      if (err) {
        alert("Payment Error: " + decodeURIComponent(err));
      }
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subRes, plansRes, bRes, uRes, gwRes, platRes] = await Promise.all([
        fetchApi("/subscriptions/current"),
        fetchApi("/subscriptions/plans"),
        fetchApi("/branches"),
        fetchApi("/users"),
        fetchApi("/settings/payment-gateways"),
        fetchApi("/public/platform-settings"),
      ]);

      if (subRes.success) {
        setSubDetails(subRes.data);
        setCurrentSub(subRes.data?.subscription || subRes.data);
        cachedSubDetails = subRes.data;
        cachedCurrentSub = subRes.data?.subscription || subRes.data;
      }
      if (plansRes.success && Array.isArray(plansRes.data)) {
        setPlans(plansRes.data);
        cachedPlans = plansRes.data;
      }
      if (bRes.success) {
        setBranches(bRes.data || []);
        cachedBranches = bRes.data || [];
      }
      if (uRes.success) {
        setStaff(uRes.data || []);
        cachedStaff = uRes.data || [];
      }
      if (gwRes.success && gwRes.data) {
        setGateways(gwRes.data);
      }
      if (platRes.success && platRes.data) {
        setPlatformSettings(platRes.data);
        if (platRes.data.bkash_merchant_active) setSelectedGateway("BKASH_DIRECT");
        else if (platRes.data.nagad_merchant_active) setSelectedGateway("NAGAD_DIRECT");
        else if (platRes.data.eps_merchant_active) setSelectedGateway("EPS");
        else if (platRes.data.manual_payment_active) setSelectedGateway("MANUAL");
      }
    } catch (err) {
      console.error("Failed to load subscription info", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpgradeOrRenew = async (targetPlanId: string) => {
    if (isPastRetentionLimit) {
      if (
        confirm(
          "Your subscription has expired more than 90 days ago. Under our data retention policy, previous store data is not recoverable. To continue using the software, please register as a new pharmacy. Would you like to proceed to registration?"
        )
      ) {
        window.location.href = "/register";
      }
      return;
    }

    const targetPlan = plans.find((p) => p.id === targetPlanId) || currentSub?.plan;
    setSelectedRenewalPlan(targetPlan);
    setRenewalSenderNumber("");
    setRenewalTrxId("");
    setRenewalScreenshotUrl("");
    setRenewalScreenshotPublicId("");
    setRenewalSuccess(null);
    setShowRenewalModal(true);
  };

  const handleOfficialGatewayCheckout = async () => {
    if (!selectedRenewalPlan) return;
    setInitiatingGateway(true);
    try {
      const pharmacyId = currentSub?.tenantId || currentSub?.pharmacyId || subDetails?.tenant?.id;
      let endpoint = "/payments/bkash/initiate";
      if (selectedGateway === "NAGAD_DIRECT") endpoint = "/payments/nagad/initiate";
      else if (selectedGateway === "EPS") endpoint = "/payments/eps/initiate";
      else if (selectedGateway === "SSLCOMMERZ") {
        const planRes = await fetchApi<any>("/subscriptions/change-plan", {
          method: "POST",
          body: JSON.stringify({ newPlanId: selectedRenewalPlan.id }),
        });
        const subId = planRes.data?.id || currentSub?.id;
        const initRes = await fetchApi<any>("/payments/initiate", {
          method: "POST",
          body: JSON.stringify({ subscriptionId: subId }),
        });
        if (initRes.success && initRes.data?.gatewayUrl) {
          window.location.href = initRes.data.gatewayUrl;
          return;
        } else {
          throw new Error(initRes.message || "Failed to launch SSLCommerz");
        }
      }

      const res = await fetchApi<any>(endpoint, {
        method: "POST",
        body: JSON.stringify({
          pharmacyId: pharmacyId,
          planId: selectedRenewalPlan.id,
          billingCycle: billingCycle,
          isUpgrade: true,
        }),
      });

      const resAny = res as any;
      const targetUrl = resAny.data?.bkashURL || resAny.data?.nagadURL || resAny.data?.epsURL || resAny.bkashURL || resAny.nagadURL || resAny.epsURL;
      if (res.success && targetUrl) {
        window.location.href = targetUrl;
      } else {
        alert(res.message || resAny.error || "Could not launch official gateway portal.");
      }
    } catch (err: any) {
      alert(err.message || "Payment initiation failed.");
    } finally {
      setInitiatingGateway(false);
    }
  };

  const handleSubmitManualRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewalSenderNumber.trim()) {
      alert("অনুগ্রহ করে যে নম্বর থেকে টাকা পাঠিয়েছেন তা লিখুন।");
      return;
    }
    if (!renewalTrxId.trim()) {
      alert("অনুগ্রহ করে Transaction ID (TrxID) লিখুন।");
      return;
    }

    setSubmittingRenewal(true);
    try {
      const res = await fetchApi<any>("/subscriptions/manual-renewal", {
        method: "POST",
        body: JSON.stringify({
          planId: selectedRenewalPlan?.id,
          billingCycle,
          senderNumber: renewalSenderNumber.trim(),
          trxId: renewalTrxId.trim(),
          screenshotUrl: renewalScreenshotUrl || undefined,
          screenshotPublicId: renewalScreenshotPublicId || undefined,
        }),
      });

      if (res.success) {
        setRenewalSuccess(
          res.message || "আপনার রিনিউয়াল অনুরোধ সফলভাবে জমা হয়েছে! সুপার অ্যাডমিন ভেরিফাই করে অনুমোদন করলেই প্ল্যান চালু হবে।"
        );
        cachedCurrentSub = null;
        cachedSubDetails = null;
        await loadData();
      } else {
        alert(res.message || "রিনিউয়াল সাবমিট করতে সমস্যা হয়েছে");
      }
    } catch (err: any) {
      alert(err.message || "Error submitting manual renewal");
    } finally {
      setSubmittingRenewal(false);
    }
  };

  if (loading && plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <span className="text-sm font-semibold">Loading subscription plans...</span>
      </div>
    );
  }

  const tier = (subDetails?.tier || currentSub?.plan?.tier || "STARTER").toUpperCase();
  const planConfig = getClientPlanConfig(tier);

  const isExpired = Boolean(subDetails?.isExpired);
  const subEndDate = currentSub?.endDate ? new Date(currentSub.endDate) : null;
  const daysExpired = subEndDate && isExpired ? Math.max(0, Math.floor((Date.now() - subEndDate.getTime()) / (1000 * 3600 * 24))) : 0;
  const isFreeGrace = isExpired && daysExpired <= 30;
  const isWithinRetentionGrace = isExpired && daysExpired > 30 && daysExpired <= 90;
  const isPastRetentionLimit = isExpired && daysExpired > 90;

  // Helper to calculate pricing based on billingCycle and dynamic discount percentage
  const calculatePlanPricing = (baseMonthlyPrice: number, discountPercent: number = 0) => {
    if (billingCycle === "MONTHLY") {
      return {
        displayPrice: baseMonthlyPrice,
        originalPrice: null,
        monthlyRate: baseMonthlyPrice,
        suffix: "/ month",
        discountPercent,
        savingsText: discountPercent > 0 ? `Save ${discountPercent}% with Annual` : null,
      };
    } else {
      const fullAnnual = baseMonthlyPrice * 12;
      const discountedAnnual = Math.round(fullAnnual * (1 - discountPercent / 100));
      const savings = fullAnnual - discountedAnnual;
      return {
        displayPrice: discountedAnnual,
        originalPrice: discountPercent > 0 ? fullAnnual : null,
        monthlyRate: Math.round(discountedAnnual / 12),
        suffix: "/ year",
        discountPercent,
        savingsText: discountPercent > 0 ? `${discountPercent}% Off (Save ৳${savings.toLocaleString()})` : null,
      };
    }
  };

  const TIER_RANK: Record<string, { rank: number; planNumber: number; name: string }> = {
    STARTER: { rank: 1, planNumber: 1, name: "Starter" },
    GROWTH: { rank: 2, planNumber: 2, name: "Growth" },
    ENTERPRISE: { rank: 3, planNumber: 3, name: "Enterprise" },
  };

  // Smart action button state resolver based on tier hierarchy
  const getPlanButtonState = (planTier: string, calculatedPrice: number, planName: string, isCustomPlan: boolean) => {
    const currentRank = TIER_RANK[tier]?.rank || 1;
    const targetRank = TIER_RANK[planTier.toUpperCase()]?.rank || 1;

    // Current Plan
    if (currentRank === targetRank) {
      if (isExpired) {
        if (isPastRetentionLimit) {
          return {
            text: `Expired >90 Days (Register New)`,
            disabled: false,
            className:
              "w-full py-3 rounded-none bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer",
            Icon: AlertCircle,
          };
        }
        if (isCustomPlan) {
          return {
            text: "Contact Support to Renew",
            disabled: false,
            className:
              "w-full py-3 rounded-none bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer",
            Icon: RefreshCw,
          };
        }
        const totalRenewPrice = isWithinRetentionGrace ? calculatedPrice + 2000 : calculatedPrice;
        return {
          text: `Renew Plan (৳${totalRenewPrice.toLocaleString()})`,
          disabled: false,
          className:
            "w-full py-3 rounded-none bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer",
          Icon: RefreshCw,
        };
      }
      return {
        text: "Active Plan",
        disabled: true,
        className:
          "w-full py-3 rounded-none bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 cursor-not-allowed",
        Icon: Check,
      };
    }

    // Custom Plan -> Handled separately via Contact Sales WhatsApp
    if (isCustomPlan) {
      return {
        text: "Contact Sales",
        disabled: false,
        className:
          "w-full py-3 rounded-none bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer",
        Icon: MessageSquare,
      };
    }

    // Higher Plan -> Upgrade
    if (targetRank > currentRank) {
      const payableUpgrade = isWithinRetentionGrace ? calculatedPrice + 2000 : calculatedPrice;
      return {
        text: `Upgrade Plan (৳${payableUpgrade.toLocaleString()})`,
        disabled: false,
        className:
          "w-full py-3 rounded-none bg-brand-primary hover:opacity-90 text-white text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer",
        Icon: ArrowUpRight,
      };
    }

    // Lower Plan -> Switch
    const payableSwitch = isWithinRetentionGrace ? calculatedPrice + 2000 : calculatedPrice;
    return {
      text: `Switch Plan (৳${payableSwitch.toLocaleString()})`,
      disabled: false,
      className:
        "w-full py-3 rounded-none bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer",
      Icon: ArrowDownRight,
    };
  };

  // Build resolved plans list from DB or fallback
  const resolvedPlans = (["STARTER", "GROWTH", "ENTERPRISE"] as const).map((tierKey) => {
    const found = plans.find((p) => p.tier === tierKey);
    const fallbackPrice = tierKey === "STARTER" ? 999 : tierKey === "GROWTH" ? 1999 : 0;
    const isEnterpriseTier = tierKey === "ENTERPRISE";

    const isCustom = found
      ? Boolean(
          found.isCustom ||
          found.features?.isCustom ||
          isEnterpriseTier ||
          Number(found.price) === 0 ||
          found.name?.toLowerCase().includes("custom")
        )
      : isEnterpriseTier;

    const rawList: string[] =
      Array.isArray(found?.featureList) && found.featureList.length > 0
        ? found.featureList
        : Array.isArray(found?.features?.featureList) && found.features.featureList.length > 0
        ? found.features.featureList
        : FALLBACK_CAPABILITIES[tierKey] || [];

    return {
      id: found?.id || `plan-${tierKey.toLowerCase()}`,
      name: found?.name || (tierKey === "STARTER" ? "Starter" : tierKey === "GROWTH" ? "Growth" : "Enterprise"),
      tier: tierKey,
      price: isCustom ? 0 : Number(found?.price ?? fallbackPrice),
      maxBranches: Number(found?.maxBranches ?? (tierKey === "STARTER" ? 1 : tierKey === "GROWTH" ? 2 : 999)),
      maxStaffPerBranch: Number(
        found?.maxStaffPerBranch ??
        found?.features?.maxStaffPerBranch ??
        (tierKey === "STARTER" ? 1 : tierKey === "GROWTH" ? 3 : 999)
      ),
      yearlyDiscountPercent: Number(found?.yearlyDiscountPercent ?? found?.features?.yearlyDiscountPercent ?? 17),
      isPopular: found?.isPopular ?? found?.features?.isPopular ?? tierKey === "GROWTH",
      isCustom,
      featureList: rawList,
      whatsappNumber: found?.whatsappNumber || found?.features?.whatsappNumber || platformSettings.support_phone || "01973590937",
      customMessage:
        found?.customMessage ||
        found?.features?.customMessage ||
        "Hello BizPharma, I am interested in the Enterprise custom plan for my pharmacy.",
    };
  });

  // Calculate renewal payable amount
  const getPayableAmount = () => {
    if (!selectedRenewalPlan) return 0;
    const basePrice = Number(selectedRenewalPlan.price || 0);
    const discount = Number(selectedRenewalPlan.yearlyDiscountPercent || 17);
    const calculated =
      billingCycle === "YEARLY"
        ? Math.round(basePrice * 12 * (1 - discount / 100))
        : basePrice;
    return isWithinRetentionGrace ? calculated + 2000 : calculated;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-2 animate-in fade-in duration-150">
      {/* Crisp Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none text-xs font-bold bg-brand-primary/10 text-brand-primary mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Pharmacy Subscriptions</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Subscription Plans
          </h1>
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate("subscription_history")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-none border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold transition shadow-2xs cursor-pointer shrink-0"
          >
            <History className="h-4 w-4 text-brand-primary" />
            <span>Payment History</span>
          </button>
        )}
      </div>

      {/* Active Plan Overview Card (Clean Rectangular) */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border-2 border-brand-primary shadow-xs space-y-4 rounded-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none text-[11px] font-bold bg-brand-primary text-white mb-1.5">
              <Sparkles className="h-3 w-3" />
              <span>Active Pharmacy Plan</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {currentSub?.plan?.name || planConfig.name}
            </h2>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              Tier: <span className="font-bold text-slate-800 dark:text-slate-200">{tier}</span>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-2xl sm:text-3xl font-black text-brand-primary">
              ৳{Number(currentSub?.plan?.price || planConfig.price).toLocaleString()}
              <span className="text-xs text-slate-400 font-normal ml-1">/ month</span>
            </div>
            <div className="text-xs font-medium flex items-center sm:justify-end gap-1.5 mt-1">
              <Calendar className="h-3.5 w-3.5 text-brand-primary" />
              <span className={isExpired ? "text-amber-500 font-bold" : "text-slate-500 dark:text-slate-400"}>
                {isExpired
                  ? `Expired on: ${currentSub?.endDate ? new Date(currentSub.endDate).toLocaleDateString() : "Expired"}`
                  : `Valid Until: ${currentSub?.endDate ? new Date(currentSub.endDate).toLocaleDateString() : "Active"}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Section Header & Monthly/Annual Billing Switcher */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Select or Upgrade Plan
            </h2>
          </div>

          {/* Billing Cycle Switcher (Rounded-none) */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none gap-1 self-start sm:self-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => setBillingCycle("MONTHLY")}
              className={`px-3.5 py-1.5 rounded-none transition cursor-pointer ${
                billingCycle === "MONTHLY"
                  ? "bg-white dark:bg-slate-900 text-brand-primary shadow-2xs font-extrabold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("YEARLY")}
              className={`px-3.5 py-1.5 rounded-none transition flex items-center gap-1.5 cursor-pointer ${
                billingCycle === "YEARLY"
                  ? "bg-white dark:bg-slate-900 text-brand-primary shadow-2xs font-extrabold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.2 rounded-none text-[10px] font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* 3 Plans Grid (Sharp Rectangular Design) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 items-stretch">
          {resolvedPlans.map((plan) => {
            const isPopular = plan.isPopular;
            const isCurrent = tier === plan.tier;
            const discountPercent = Number(plan.yearlyDiscountPercent ?? 17);
            const pricing = calculatePlanPricing(Number(plan.price || 0), discountPercent);
            const btn = getPlanButtonState(plan.tier, pricing.displayPrice, plan.name, plan.isCustom);
            const BtnIcon = btn.Icon;

            const cleanPhone = (plan.whatsappNumber || "01973590937").replace(/[^0-9]/g, "");
            const whatsappUrl = `https://wa.me/${cleanPhone.startsWith("88") ? cleanPhone : "88" + cleanPhone}?text=${encodeURIComponent(plan.customMessage)}`;

            return (
              <div
                key={plan.id}
                className={`relative bg-white dark:bg-slate-900 border transition-all duration-200 flex flex-col p-5 sm:p-6 rounded-none ${
                  isPopular
                    ? "border-emerald-500 ring-2 ring-emerald-500/30 shadow-md md:-translate-y-1"
                    : isCurrent
                    ? "border-brand-primary ring-2 ring-brand-primary/20 shadow-md"
                    : "border-slate-200 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-none bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-2xs">
                    Most Popular
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      {plan.name}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      {isCurrent && (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Active
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                        {plan.tier}
                      </span>
                    </div>
                  </div>

                  {/* Price Block */}
                  {plan.isCustom ? (
                    <div className="pt-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                          Custom
                        </span>
                        <span className="text-xs font-semibold text-slate-400 ml-1">
                          / tailored
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                        Enterprise multi-branch setup
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                          ৳ {pricing.displayPrice.toLocaleString()}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {pricing.suffix}
                        </span>
                      </div>

                      {pricing.originalPrice && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-400 line-through">
                            ৳{pricing.originalPrice.toLocaleString()}
                          </span>
                          <span className="px-1.5 py-0.2 rounded-none text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            {pricing.savingsText}
                          </span>
                        </div>
                      )}
                      {billingCycle === "MONTHLY" && pricing.savingsText && (
                        <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {pricing.savingsText}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Plan Call to Action */}
                <div className="pt-5">
                  {plan.isCustom && !isCurrent ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 rounded-none bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-2xs transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Contact Sales (WhatsApp)</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUpgradeOrRenew(plan.id)}
                      disabled={btn.disabled || upgradingPlanId === plan.id}
                      className={btn.className}
                    >
                      {upgradingPlanId === plan.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <BtnIcon className="h-4 w-4" />
                      )}
                      <span>{btn.text}</span>
                    </button>
                  )}
                </div>

                {/* Dynamic Features List from Super Admin */}
                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3 flex-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Included Capabilities
                  </div>

                  <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>
                        <strong>{plan.maxBranches >= 999 ? "Unlimited" : plan.maxBranches}</strong> Branches Included
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>
                        <strong>{plan.maxStaffPerBranch >= 999 ? "Unlimited" : plan.maxStaffPerBranch}</strong> Staff / Branch
                      </span>
                    </li>

                    {plan.featureList.map((item, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* SHARP STEP-3 PAYMENT GATEWAY CHECKOUT MODAL               */}
      {/* ========================================================= */}
      {showRenewalModal && selectedRenewalPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-none bg-brand-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {tier === selectedRenewalPlan.tier ? "Renew Subscription" : "Upgrade Subscription"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Target Plan: <strong className="text-slate-800 dark:text-slate-200">{selectedRenewalPlan.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRenewalModal(false);
                  setRenewalSuccess(null);
                }}
                className="p-1 rounded-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {renewalSuccess ? (
              <div className="py-6 text-center space-y-4">
                <div className="h-14 w-14 rounded-none bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">
                  Payment Submitted Successfully!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
                  {renewalSuccess}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowRenewalModal(false);
                    setRenewalSuccess(null);
                  }}
                  className="px-6 py-2.5 rounded-none bg-brand-primary text-white text-xs font-bold shadow-2xs hover:opacity-95 transition cursor-pointer"
                >
                  OK (Close)
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Investment & Fee Summary Box (Matching Register Step 3) */}
                <div className="p-4 rounded-none bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>Plan:</span>
                    <strong className="text-slate-900 dark:text-white font-bold">{selectedRenewalPlan.name}</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>Billing Interval:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {billingCycle === "YEARLY" ? "Yearly (-17% Discount)" : "Monthly"}
                    </span>
                  </div>
                  {isWithinRetentionGrace && (
                    <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                      <span>Data Retention Recovery Fee:</span>
                      <strong className="font-mono font-bold">+৳2,000</strong>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">Total Payable:</span>
                    <strong className="text-lg font-black font-mono text-brand-primary">
                      ৳{getPayableAmount().toLocaleString()}
                    </strong>
                  </div>
                </div>

                {/* Gateway Switcher Cards (Matching Register Step 3) */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Select Payment Gateway:
                  </label>

                  {/* 1. bKash Official Tokenized Gateway */}
                  {platformSettings.bkash_merchant_active && (
                    <div
                      onClick={() => setSelectedGateway("BKASH_DIRECT")}
                      className={`p-3.5 rounded-none border flex items-center justify-between cursor-pointer transition ${
                        selectedGateway === "BKASH_DIRECT"
                          ? "border-[#E2136E] bg-pink-50/40 dark:bg-pink-950/20 ring-2 ring-[#E2136E]/40"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-none bg-[#E2136E] text-white flex items-center justify-center font-bold text-base shadow-2xs shrink-0">
                          ৳
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">bKash Official Checkout</p>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-none bg-pink-100 text-[#E2136E] dark:bg-pink-900/40">
                              Instant
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">Official PIN &amp; OTP verification</p>
                        </div>
                      </div>
                      <span className="font-bold text-[#E2136E] text-xs sm:text-sm font-mono">
                        ৳{getPayableAmount().toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* 2. Nagad Official Merchant Gateway */}
                  {platformSettings.nagad_merchant_active && (
                    <div
                      onClick={() => setSelectedGateway("NAGAD_DIRECT")}
                      className={`p-3.5 rounded-none border flex items-center justify-between cursor-pointer transition ${
                        selectedGateway === "NAGAD_DIRECT"
                          ? "border-[#F7941D] bg-orange-50/40 dark:bg-orange-950/20 ring-2 ring-[#F7941D]/40"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-none bg-[#F7941D] text-white flex items-center justify-center font-bold text-base shadow-2xs shrink-0">
                          ন
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Nagad Official Checkout</p>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-none bg-orange-100 text-[#F7941D] dark:bg-orange-900/40">
                              Official
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">Instant Nagad Merchant Checkout</p>
                        </div>
                      </div>
                      <span className="font-bold text-[#F7941D] text-xs sm:text-sm font-mono">
                        ৳{getPayableAmount().toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* 3. EPS Multi-Banking Gateway */}
                  {platformSettings.eps_merchant_active && (
                    <div
                      onClick={() => setSelectedGateway("EPS")}
                      className={`p-3.5 rounded-none border flex items-center justify-between cursor-pointer transition ${
                        selectedGateway === "EPS"
                          ? "border-[#0D6EFD] bg-blue-50/40 dark:bg-blue-950/20 ring-2 ring-[#0D6EFD]/40"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-none bg-[#0D6EFD] text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                          EPS
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">EPS Multi-Banking Gateway</p>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-none bg-blue-100 text-[#0D6EFD] dark:bg-blue-900/40">
                              Cards / Bank
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">Visa, Mastercard, Net Banking &amp; MFS</p>
                        </div>
                      </div>
                      <span className="font-bold text-[#0D6EFD] text-xs sm:text-sm font-mono">
                        ৳{getPayableAmount().toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* 4. Manual Send Money MFS */}
                  {platformSettings.manual_payment_active && (
                    <div
                      onClick={() => setSelectedGateway("MANUAL")}
                      className={`p-3.5 rounded-none border flex items-center justify-between cursor-pointer transition ${
                        selectedGateway === "MANUAL"
                          ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 ring-2 ring-emerald-500/40"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-none bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                          MFS
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Manual Send Money</p>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-none bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40">
                              bKash / Nagad
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">Send money directly and submit TrxID</p>
                        </div>
                      </div>
                      <span className="font-bold text-emerald-600 text-xs sm:text-sm font-mono">
                        ৳{getPayableAmount().toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* 5. SSLCommerz Gateway */}
                  {gateways?.sslcommerz?.enabled && (
                    <div
                      onClick={() => setSelectedGateway("SSLCOMMERZ")}
                      className={`p-3.5 rounded-none border flex items-center justify-between cursor-pointer transition ${
                        selectedGateway === "SSLCOMMERZ"
                          ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 ring-2 ring-indigo-500/40"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-none bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                          SSL
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">SSLCOMMERZ Online Payment</p>
                          <p className="text-[11px] text-slate-500">Cards, Internet Banking &amp; Wallets</p>
                        </div>
                      </div>
                      <span className="font-bold text-indigo-600 text-xs sm:text-sm font-mono">
                        ৳{getPayableAmount().toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* OFFICIAL GATEWAY REDIRECT PROMPT */}
                {(selectedGateway === "BKASH_DIRECT" || selectedGateway === "NAGAD_DIRECT" || selectedGateway === "EPS" || selectedGateway === "SSLCOMMERZ") && (
                  <div className="p-4 rounded-none bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                      You will be securely redirected to the official {selectedGateway === "BKASH_DIRECT" ? "bKash" : selectedGateway === "NAGAD_DIRECT" ? "Nagad" : selectedGateway === "EPS" ? "EPS" : "SSLCOMMERZ"} portal. After verifying your payment with OTP and PIN, your subscription will be immediately updated.
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowRenewalModal(false)}
                        className="px-4 py-2.5 rounded-none border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleOfficialGatewayCheckout}
                        disabled={initiatingGateway}
                        className={`px-5 py-2.5 rounded-none text-white font-bold text-xs shadow-2xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                          selectedGateway === "BKASH_DIRECT"
                            ? "bg-[#E2136E] hover:opacity-95"
                            : selectedGateway === "NAGAD_DIRECT"
                            ? "bg-[#F7941D] hover:opacity-95"
                            : selectedGateway === "EPS"
                            ? "bg-[#0D6EFD] hover:opacity-95"
                            : "bg-indigo-600 hover:opacity-95"
                        }`}
                      >
                        {initiatingGateway ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Redirecting...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4" />
                            <span>
                              Pay ৳{getPayableAmount().toLocaleString()} &rarr;
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* MANUAL MFS FORM (Matching Register Step 3) */}
                {selectedGateway === "MANUAL" && (
                  <form onSubmit={handleSubmitManualRenewal} className="space-y-4">
                    {/* Recipient Numbers Card */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-3 bg-white dark:bg-slate-900 border border-pink-200 dark:border-pink-900/50 rounded-none flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-bold text-pink-600 uppercase">bKash Send Money</div>
                          <div className="text-sm font-black font-mono text-slate-900 dark:text-white">
                            {platformSettings.bkash_number || "01750000000"}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(platformSettings.bkash_number || "01750000000");
                            setCopiedNumber(true);
                            setTimeout(() => setCopiedNumber(false), 2000);
                          }}
                          className="p-1.5 rounded-none bg-pink-50 text-pink-600 font-bold text-xs transition cursor-pointer"
                        >
                          {copiedNumber ? <CheckCheck className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-900/50 rounded-none flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-bold text-orange-600 uppercase">Nagad Send Money</div>
                          <div className="text-sm font-black font-mono text-slate-900 dark:text-white">
                            {platformSettings.nagad_number || "01850000000"}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(platformSettings.nagad_number || "01850000000");
                            setCopiedNagad(true);
                            setTimeout(() => setCopiedNagad(false), 2000);
                          }}
                          className="p-1.5 rounded-none bg-orange-50 text-orange-600 font-bold text-xs transition cursor-pointer"
                        >
                          {copiedNagad ? <CheckCheck className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                          Sender Phone Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={renewalSenderNumber}
                          onChange={(e) => setRenewalSenderNumber(e.target.value)}
                          placeholder="e.g. 017XXXXXXXX"
                          className="w-full px-3 py-2 rounded-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                          Transaction ID (TrxID) *
                        </label>
                        <input
                          type="text"
                          required
                          value={renewalTrxId}
                          onChange={(e) => setRenewalTrxId(e.target.value.toUpperCase())}
                          placeholder="e.g. BL9A8XXXXX"
                          className="w-full px-3 py-2 rounded-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                          Payment Screenshot / Receipt (Optional)
                        </label>
                        <ImageUploader
                          label="Upload payment screenshot"
                          value={renewalScreenshotUrl}
                          publicId={renewalScreenshotPublicId}
                          onChange={(data) => {
                            setRenewalScreenshotUrl(data?.url || "");
                            setRenewalScreenshotPublicId(data?.publicId || "");
                          }}
                          folder="pharmabiz/subscription_renewals"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowRenewalModal(false)}
                        className="px-4 py-2.5 rounded-none border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingRenewal}
                        className="px-5 py-2.5 rounded-none bg-brand-primary hover:opacity-95 text-white font-bold text-xs shadow-2xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {submittingRenewal ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <span>Submit Verification Request</span>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
