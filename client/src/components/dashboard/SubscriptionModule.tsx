"use client";

import React, { useEffect, useState } from "react";
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
  ArrowRight,
  RefreshCw,
  Store,
  Users,
  ShieldCheck,
  Zap,
  AlertCircle,
  X,
  Copy,
  Phone,
} from "lucide-react";
import { getClientPlanConfig, calculateRemainingTrialDays } from "@/lib/planLimits";
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

export function SubscriptionModule({ onNavigate }: SubscriptionModuleProps = {}) {
  const [currentSub, setCurrentSub] = useState<any>(() => cachedCurrentSub);
  const [subDetails, setSubDetails] = useState<any>(() => cachedSubDetails);
  const [plans, setPlans] = useState<any[]>(() => cachedPlans);
  const [branches, setBranches] = useState<any[]>(() => cachedBranches);
  const [staff, setStaff] = useState<any[]>(() => cachedStaff);
  const [loading, setLoading] = useState(false);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");

  // Gateway and Manual bKash Renewal Modal State
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [subRes, plansRes, bRes, uRes, gwRes] = await Promise.all([
        fetchApi("/subscriptions/current"),
        fetchApi("/subscriptions/plans"),
        fetchApi("/branches"),
        fetchApi("/users"),
        fetchApi("/settings/payment-gateways"),
      ]);

      if (subRes.success) {
        setSubDetails(subRes.data);
        setCurrentSub(subRes.data?.subscription || subRes.data);
        cachedSubDetails = subRes.data;
        cachedCurrentSub = subRes.data?.subscription || subRes.data;
      }
      if (plansRes.success) {
        setPlans(plansRes.data || []);
        cachedPlans = plansRes.data || [];
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

    // If manual bKash gateway is enabled, open the bKash payment modal
    if (gateways?.manualBkash?.enabled) {
      setSelectedRenewalPlan(targetPlan);
      setRenewalSenderNumber("");
      setRenewalTrxId("");
      setRenewalScreenshotUrl("");
      setRenewalScreenshotPublicId("");
      setRenewalSuccess(null);
      setShowRenewalModal(true);
      return;
    }

    // Otherwise, initiate automated SSLCommerz
    try {
      setUpgradingPlanId(targetPlanId);
      const planRes = await fetchApi<any>("/subscriptions/change-plan", {
        method: "POST",
        body: JSON.stringify({
          newPlanId: targetPlanId,
        }),
      });

      const subId = planRes.data?.id || currentSub?.id;

      const initRes = await fetchApi<any>("/payments/initiate", {
        method: "POST",
        body: JSON.stringify({
          subscriptionId: subId,
        }),
      });

      if (initRes.success && initRes.data?.gatewayUrl) {
        window.location.href = initRes.data.gatewayUrl;
      } else {
        alert(initRes.message || "Could not launch payment gateway checkout");
      }
    } catch (err: any) {
      alert(err.message || "Error initiating payment");
    } finally {
      setUpgradingPlanId(null);
    }
  };

  const handleSubmitManualRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewalSenderNumber.trim()) {
      alert("অনুগ্রহ করে যে বিকাশ নম্বর থেকে টাকা পাঠিয়েছেন তা লিখুন।");
      return;
    }
    if (!renewalTrxId.trim()) {
      alert("অনুগ্রহ করে বিকাশ Transaction ID (TrxID) লিখুন।");
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
        <span className="text-base font-semibold">Loading subscription plans...</span>
      </div>
    );
  }

  const tier = (subDetails?.tier || currentSub?.plan?.tier || "STARTER").toUpperCase();
  const planConfig = getClientPlanConfig(tier);

  const branchCount = branches.length;
  const maxBranches = Number(subDetails?.usage?.maxBranches ?? currentSub?.plan?.maxBranches ?? planConfig.maxBranches);

  const nonOwnerStaff = staff.filter((s) => s.role !== "COMPANY_OWNER");
  const staffCount = nonOwnerStaff.length;
  const maxStaff = Number(subDetails?.usage?.maxStaff ?? currentSub?.plan?.features?.maxTotalStaff ?? planConfig.maxTotalStaff ?? (maxBranches * (currentSub?.plan?.features?.maxStaffPerBranch ?? 1)));

  const currentMonthlyPrice = Number(currentSub?.plan?.price ?? planConfig.price ?? 500);
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
  const getPlanButtonState = (planTier: string, calculatedPrice: number, _planName: string) => {
    const currentRank = TIER_RANK[tier]?.rank || 1;
    const targetRank = TIER_RANK[planTier.toUpperCase()]?.rank || 1;
    const targetPlanNum = TIER_RANK[planTier.toUpperCase()]?.planNumber || 1;

    // Current Plan
    if (currentRank === targetRank) {
      if (isExpired) {
        if (isPastRetentionLimit) {
          return {
            text: `Expired >90 Days (Register New)`,
            disabled: false,
            className:
              "w-full py-3.5 sm:py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-sm sm:text-base font-bold shadow-lg transition active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer",
            Icon: AlertCircle,
          };
        }
        const totalRenewPrice = isWithinRetentionGrace ? calculatedPrice + 2000 : calculatedPrice;
        return {
          text: `Renew Plan ${targetPlanNum} (৳${totalRenewPrice.toLocaleString()})`,
          disabled: false,
          className:
            "w-full py-3.5 sm:py-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-sm sm:text-base font-bold shadow-lg transition active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer",
          Icon: RefreshCw,
        };
      }
      return {
        text: "Active Plan",
        disabled: true,
        className:
          "w-full py-3.5 sm:py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-sm sm:text-base font-bold border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2.5 cursor-not-allowed",
        Icon: Check,
      };
    }

    // Higher Plan -> Upgrade
    if (targetRank > currentRank) {
      const payableUpgrade = isWithinRetentionGrace ? calculatedPrice + 2000 : calculatedPrice;
      return {
        text: `Upgrade to Plan ${targetPlanNum} (৳${payableUpgrade.toLocaleString()})`,
        disabled: false,
        className:
          "w-full py-3.5 sm:py-4 rounded-2xl bg-brand-primary hover:opacity-90 text-white text-sm sm:text-base font-bold shadow-xl transition active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer",
        Icon: ArrowUpRight,
      };
    }

    // Lower Plan -> Switch
    const payableSwitch = isWithinRetentionGrace ? calculatedPrice + 2000 : calculatedPrice;
    return {
      text: `Switch to Plan ${targetPlanNum} (৳${payableSwitch.toLocaleString()})`,
      disabled: false,
      className:
        "w-full py-3.5 sm:py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm sm:text-base font-bold shadow-md transition active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer",
      Icon: ArrowDownRight,
    };
  };

  return (
    <div className="space-y-8 sm:space-y-10 max-w-7xl mx-auto px-2 sm:px-4 py-2">
      {/* Short Crisp Header with Quick History Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-brand-primary/10 text-brand-primary mb-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Pharmacy Subscriptions
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Subscription Plans
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Choose the plan tier that best powers your store branches and staff capacity
          </p>
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate("subscription_history")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold transition shadow-xs cursor-pointer shrink-0"
          >
            <History className="h-4 w-4 text-brand-primary" />
            <span>Payment History</span>
          </button>
        )}
      </div>

      {/* Active Plan Overview Card */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border-2 border-brand-primary shadow-xl space-y-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-brand-primary text-white mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              Active Pharmacy Plan
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {planConfig.name}
            </h2>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
              Tier: <span className="font-bold text-slate-800 dark:text-slate-200">{tier}</span>
            </p>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-3xl sm:text-4xl font-black text-brand-primary">
              ৳{Number(currentSub?.plan?.price || planConfig.price).toLocaleString()}
              <span className="text-sm text-slate-400 font-normal ml-1">/ month</span>
            </div>
            <div className="text-sm font-medium flex items-center sm:justify-end gap-1.5 mt-1.5">
              <Calendar className="h-4 w-4 text-brand-primary" />
              <span className={isExpired ? "text-amber-500 font-bold" : "text-slate-500 dark:text-slate-400"}>
                {isExpired
                  ? `Expired on: ${currentSub?.endDate ? new Date(currentSub.endDate).toLocaleDateString() : "Expired"}`
                  : `Valid Until: ${currentSub?.endDate ? new Date(currentSub.endDate).toLocaleDateString() : "Active"}`}
              </span>
            </div>
          </div>
        </div>

        {/* Capacity Usage Meters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Branch Store Usage */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center text-sm font-bold">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Store className="h-4 w-4 text-brand-primary" />
                Branch Store Capacity
              </span>
              <span className="text-brand-primary font-black">
                {branchCount} of {maxBranches >= 999 ? "Unlimited" : maxBranches} Stores
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-brand-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (branchCount / maxBranches) * 100)}%` }}
              />
            </div>
          </div>

          {/* Staff Usage */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center text-sm font-bold">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-500" />
                Staff Accounts Capacity
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-black">
                {staffCount} of {maxStaff >= 999 ? "Unlimited" : maxStaff} Users
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (staffCount / maxStaff) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>
              {isExpired
                ? "Subscription expired: Select a plan below to renew or upgrade via SSLCOMMERZ checkout."
                : "Instant renewal and upgrades powered by SSLCOMMERZ checkout."}
            </span>
          </div>

          {isExpired && (
            <span className="text-sm font-extrabold text-amber-500">
              Action Required: Renew or Upgrade Plan
            </span>
          )}
        </div>
      </div>

      {/* Available Plans Section with Annual Discount Toggle */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Select or Upgrade Plan
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Flexible subscription tiers tailored for standalone dispensaries to multi-branch chains
            </p>
          </div>

          {/* Monthly vs Annual Toggle */}
          <div className="flex items-center gap-3 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setBillingCycle("MONTHLY")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
                billingCycle === "MONTHLY"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("YEARLY")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${
                billingCycle === "YEARLY"
                  ? "bg-brand-primary text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-400 text-slate-950">
                Save %
              </span>
            </button>
          </div>
        </div>

        {/* 90-Day Data Retention Policy Notification Banner */}
        {isExpired && isPastRetentionLimit && (
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-400 dark:border-rose-800 text-rose-900 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm sm:text-base text-rose-950 dark:text-rose-100">
                  Subscription Expired Over 90 Days ({daysExpired} days)
                </h4>
                <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                  Under our data retention policy, store data is preserved for 90 days following expiration. Because more than 90 days have elapsed, previous data cannot be recovered. To use the software again, please register a new pharmacy account (one-time ৳5,000 Software License Fee + subscription plan).
                </p>
              </div>
            </div>
            <a
              href="/register"
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition active:scale-95 shrink-0 text-center"
            >
              Register New Pharmacy &rarr;
            </a>
          </div>
        )}

        {isExpired && isWithinRetentionGrace && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400 dark:border-amber-700/80 text-amber-950 dark:text-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm sm:text-base text-amber-950 dark:text-amber-100">
                    Data Retention Period Active (Expired {daysExpired} days ago)
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                    {Math.max(0, 90 - daysExpired)} days remaining
                  </span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Your store records (medicines, inventory, customers, and sales) are securely kept on our cloud servers. A ৳2,000 cloud maintenance and data retention fee applies to restore your records upon renewal.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] font-bold uppercase text-amber-700 dark:text-amber-300 block">Data Retention Fee</span>
              <span className="text-lg font-black font-mono text-amber-900 dark:text-amber-200">+৳2,000</span>
            </div>
          </div>
        )}

        {isExpired && isFreeGrace && (
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-400 dark:border-emerald-700/80 text-emerald-950 dark:text-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm sm:text-base text-emerald-950 dark:text-emerald-100">
                    Standard Renewal Grace Period (Expired {daysExpired} days ago)
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">
                    {Math.max(0, 30 - daysExpired)} days left for ৳0 extra fee
                  </span>
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  You are within the 30-day renewal grace period. Renew now at the standard plan price with ৳0 extra fee.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-300 block">Extra Fee</span>
              <span className="text-lg font-black font-mono text-emerald-900 dark:text-emerald-200">৳0</span>
            </div>
          </div>
        )}

        {/* 3 Plans Grid matching Super Admin Plan Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {(["STARTER", "GROWTH", "ENTERPRISE"] as const).map((tierKey, idx) => {
            const plan = plans.find((p) => p.tier === tierKey) || {
              id: `plan-${tierKey.toLowerCase()}`,
              name: tierKey === "STARTER" ? "Plan 1 - Starter" : tierKey === "GROWTH" ? "Plan 2 - Growth" : "Plan 3 - Enterprise",
              tier: tierKey,
              price: tierKey === "STARTER" ? 999 : tierKey === "GROWTH" ? 1999 : 2999,
              maxBranches: tierKey === "STARTER" ? 1 : tierKey === "GROWTH" ? 2 : 5,
              maxStaffPerBranch: tierKey === "STARTER" ? 3 : 5,
              yearlyDiscountPercent: 17,
            };

            const isPopular = plan.tier === "GROWTH" || plan.isPopular;
            const isCurrent = tier === plan.tier;
            const discountPercent = Number(plan.yearlyDiscountPercent ?? 17);
            const pricing = calculatePlanPricing(Number(plan.price || 0), discountPercent);
            const btn = getPlanButtonState(plan.tier, pricing.displayPrice, plan.name || plan.tier);
            const BtnIcon = btn.Icon;

            return (
              <div
                key={plan.id || idx}
                className={`relative rounded-3xl bg-white dark:bg-slate-900 border transition-all duration-300 flex flex-col p-6 sm:p-8 2xl:p-10 ${
                  isPopular
                    ? "border-emerald-500 shadow-xl ring-2 ring-emerald-500/30 md:-translate-y-2"
                    : isCurrent
                    ? "border-brand-primary ring-2 ring-brand-primary/20 shadow-xl"
                    : "border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider shadow-md">
                    Most Popular
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {plan.name || plan.tier}
                    </h3>
                    <div className="flex items-center gap-2">
                      {isCurrent && (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <Check className="h-4 w-4" /> Active
                        </span>
                      )}
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md brand-subtle-bg text-brand-primary uppercase">
                        {plan.tier}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 min-h-[40px]">
                    {plan.description ||
                      (plan.tier === "STARTER"
                        ? "Essential toolkit for retail pharmacies starting out."
                        : plan.tier === "GROWTH"
                        ? "Full multi-branch control and stock transfers."
                        : "Custom compliance, APIs, and unlimited scale.")}
                  </p>

                  {/* Price Block */}
                  <div className="pt-2 flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                      ৳ {pricing.displayPrice.toLocaleString()}
                    </span>
                    <span className="text-sm font-medium text-slate-500">
                      {pricing.suffix}
                    </span>
                  </div>

                  {pricing.originalPrice && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 line-through">
                        ৳{pricing.originalPrice.toLocaleString()}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        {pricing.savingsText}
                      </span>
                    </div>
                  )}
                  {billingCycle === "MONTHLY" && pricing.savingsText && (
                    <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {pricing.savingsText}
                    </div>
                  )}
                </div>

                {/* Plan Call to Action */}
                <div className="pt-6">
                  <button
                    type="button"
                    onClick={() => handleUpgradeOrRenew(plan.id)}
                    disabled={btn.disabled || upgradingPlanId === plan.id}
                    className={btn.className}
                  >
                    {upgradingPlanId === plan.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <BtnIcon className="h-5 w-5" />
                    )}
                    <span>{btn.text}</span>
                  </button>
                </div>

                {/* Features List */}
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3.5 flex-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Included Capabilities
                  </div>

                  <ul className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>
                        <strong>{plan.maxBranches >= 999 ? "Unlimited" : plan.maxBranches}</strong> Branches Included
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>
                        <strong>
                          {(plan.maxStaffPerBranch ?? plan.features?.maxStaffPerBranch ?? 1) >= 999
                            ? "Unlimited"
                            : (plan.maxStaffPerBranch ?? plan.features?.maxStaffPerBranch ?? 1)}
                        </strong>{" "}
                        Staff / Branch
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>100% Offline POS & Auto Cloud Sync</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>
                        {plan.tier === "STARTER"
                          ? "Real-time Inventory & Stock Tracking"
                          : plan.tier === "GROWTH"
                          ? "Multi-Branch Stock & Batch Tracking"
                          : "Centralized Multi-Store Inventory Control"}
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>
                        {plan.tier === "STARTER"
                          ? "Medicine Expiry & Low-Stock Alerts"
                          : plan.tier === "GROWTH"
                          ? "Medicine Expiry, Near-Expiry & Damage Tracking"
                          : "Full Expiry, Damage & Batch Audit Trails"}
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>
                        {plan.tier === "STARTER"
                          ? "Thermal Receipt & Barcode Support"
                          : plan.tier === "GROWTH"
                          ? "Customer Ledger & Credit/Due Tracking"
                          : "Customer Credit Ledger & Accounts Reports"}
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>
                        {plan.tier === "STARTER"
                          ? "Daily Sales & Revenue Reports"
                          : plan.tier === "GROWTH"
                          ? "Custom Staff Roles & Permission Assignment"
                          : "Unlimited Custom Roles & Granular RBAC"}
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>
                        {plan.tier === "STARTER"
                          ? "Standard Helpdesk & Email Support"
                          : plan.tier === "GROWTH"
                          ? "Comprehensive Profit/Loss & Tax Reports"
                          : "Advanced Business Analytics & VAT/Tax Export"}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Link Card to Payment History */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <History className="h-3.5 w-3.5" />
            Billing Records & Receipts
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Need payment history or invoice receipts?
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl">
            Filter all previous subscription payments by Today, Month, or Year. View and print official receipts.
          </p>
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate("subscription_history")}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-brand-primary hover:opacity-90 text-white font-bold text-sm shadow-md transition active:scale-95 cursor-pointer shrink-0"
          >
            <History className="h-4 w-4" />
            <span>View Payment History</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* MANUAL BKASH RENEWAL / UPGRADE MODAL                      */}
      {/* ========================================================= */}
      {showRenewalModal && selectedRenewalPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-pink-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                  ৳
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Subscription Renewal & Upgrade
                  </h3>
                  <p className="text-xs text-slate-500">
                    Target: <strong>{selectedRenewalPlan.name}</strong> ({billingCycle})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRenewalModal(false);
                  setRenewalSuccess(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {renewalSuccess ? (
              <div className="py-8 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">
                  রিনিউয়াল রিকোয়েস্ট সফলভাবে জমা হয়েছে!
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  {renewalSuccess}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowRenewalModal(false);
                    setRenewalSuccess(null);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold shadow-md hover:opacity-95 transition cursor-pointer"
                >
                  ঠিক আছে (Close)
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitManualRenewal} className="space-y-4 text-xs">
                {/* Fee Breakdown Box */}
                <div className="p-4 rounded-2xl bg-pink-50/40 dark:bg-pink-950/20 border border-pink-500/20 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Selected Plan:</span>
                    <strong className="text-slate-900 dark:text-white font-bold">{selectedRenewalPlan.name}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Billing Cycle:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {billingCycle === "YEARLY" ? "Yearly (15% Discount Applied)" : "Monthly"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-pink-500/20">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Total Payable Amount:</span>
                    <strong className="text-base font-black font-mono text-pink-600 dark:text-pink-400">
                      ৳{(() => {
                        const basePrice = Number(selectedRenewalPlan.price || 0);
                        return (billingCycle === "YEARLY" ? Math.round(basePrice * 12 * 0.85) : basePrice).toLocaleString();
                      })()}
                    </strong>
                  </div>
                </div>

                {/* bKash Send Money Instruction Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-pink-600" />
                      <span>bKash Send Money Account</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/30">
                      {gateways?.manualBkash?.type || "PERSONAL"}
                    </span>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Send Money To Number</div>
                      <div className="text-base font-black font-mono text-slate-900 dark:text-white">
                        {gateways?.manualBkash?.number || "01700-000000"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (gateways?.manualBkash?.number) {
                          navigator.clipboard.writeText(gateways.manualBkash.number);
                          setCopiedNumber(true);
                          setTimeout(() => setCopiedNumber(false), 2000);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                    >
                      {copiedNumber ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedNumber ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {gateways?.manualBkash?.instructions ||
                      "যেকোনো বিকাশ একাউন্ট থেকে নির্ধারিত টাকা Send Money করুন এবং সফল ট্রানজেকশনের TrxID নিচে লিখুন।"}
                  </p>
                </div>

                {/* Form Inputs */}
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      আপনার বিকাশ প্রেরক নম্বর (Sender Phone Number) *
                    </label>
                    <input
                      type="text"
                      required
                      value={renewalSenderNumber}
                      onChange={(e) => setRenewalSenderNumber(e.target.value)}
                      placeholder="e.g. 01712-345678"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pink-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      বিকাশ ট্রানজেকশন আইডি (Transaction ID / TrxID) *
                    </label>
                    <input
                      type="text"
                      required
                      value={renewalTrxId}
                      onChange={(e) => setRenewalTrxId(e.target.value.toUpperCase())}
                      placeholder="e.g. BK789XYZ"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pink-500 font-bold text-pink-600 dark:text-pink-400 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      পেমেন্ট স্লিপের স্ক্রিনশট (Payment Screenshot Slip - ঐচ্ছিক)
                    </label>
                    <ImageUploader
                      value={renewalScreenshotUrl}
                      publicId={renewalScreenshotPublicId}
                      onChange={(data) => {
                        setRenewalScreenshotUrl(data?.url || "");
                        setRenewalScreenshotPublicId(data?.publicId || "");
                      }}
                      label="টাকা পাঠানোর স্ক্রিনশট আপলোড করুন"
                      hint="PNG, JPG, WebP (Max 5MB)"
                      folder="pharmacy_saas/renewals"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowRenewalModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRenewal}
                    className="px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-lg shadow-pink-500/25 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submittingRenewal ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Submit Renewal Request</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
