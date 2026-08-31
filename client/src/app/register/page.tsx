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
  Loader2,
  AlertCircle,
  ShieldCheck,
  Clock,
  Sparkles,
} from "lucide-react";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useSettings();

  const planIdParam = searchParams.get("planId");
  const billingParam = searchParams.get("billing") || "MONTHLY";

  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(planIdParam || "");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">(
    billingParam === "YEARLY" ? "YEARLY" : "MONTHLY"
  );

  const [formData, setFormData] = useState({
    companyName: "",
    ownerName: "",
    email: "",
    phone: "",
    password: "",
    address: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetchApi("/subscriptions/plans");
        if (res.success && res.data && res.data.length > 0) {
          setPlans(res.data);
          if (!selectedPlanId) {
            // Find trial plan or first plan
            const trialPlan = res.data.find((p: any) => p.tier === "TRIAL");
            if (trialPlan) {
              setSelectedPlanId(trialPlan.id);
            } else {
              setSelectedPlanId(res.data[0].id);
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch plans", err);
      }
    }
    loadPlans();
  }, []);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || {
    id: "trial",
    name: "Plan 0 - Free Trial",
    tier: "TRIAL",
    price: 0,
    maxBranches: 1,
  };

  const isTrial = selectedPlan.tier === "TRIAL";
  const basePrice = Number(selectedPlan.price || 0);
  const totalPrice = isTrial ? 0 : billingCycle === "YEARLY" ? Math.round(basePrice * 12 * 0.85) : basePrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Register Owner & Tenant
      const regRes = await fetchApi<any>("/auth/register-owner", {
        method: "POST",
        body: JSON.stringify({
          companyName: formData.companyName,
          ownerName: formData.ownerName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          address: formData.address,
          planId: isTrial ? undefined : selectedPlan.id,
          billingCycle,
        }),
      });

      if (!regRes.success || !regRes.data) {
        throw new Error(regRes.message || "Registration failed. Please check the form.");
      }

      const { token, user, subscription } = regRes.data;

      // Save token in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // 2. If Free Trial, immediately enter Dashboard!
      if (isTrial || (subscription && subscription.status === "ACTIVE")) {
        router.push("/dashboard");
        return;
      }

      // 3. If paid plan selected upfront, initiate SSLCOMMERZ Sandbox Gateway session
      const payRes = await fetchApi<any>("/payments/initiate", {
        method: "POST",
        body: JSON.stringify({
          subscriptionId: subscription.id,
          customerName: formData.ownerName,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          customerAddress: formData.address,
        }),
      });

      if (payRes.success && payRes.data?.gatewayUrl) {
        window.location.href = payRes.data.gatewayUrl;
      } else {
        // Redirect to dashboard as trial if gateway initiation fails
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during registration.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full brand-glow -z-10 opacity-25 blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Back Link & Header */}
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
              {settings.siteName || "PharmaFlow"}
            </span>
          </Link>
        </div>

        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Clock className="h-3.5 w-3.5" />
            7-Day Free Trial Available
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Register Your Pharmacy
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Start testing instantly with our 7-Day Free Trial — no payment required upfront.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-semibold flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Registration Form */}
          <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl p-8 backdrop-blur-xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                1. Pharmacy & Owner Details
              </h2>

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
                      placeholder="e.g. HealthCare Pharma Ltd."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
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
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
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
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
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
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
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
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Headquarters Address
                  </label>
                  <div className="relative">
                    <MapPin className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Street, City, Area"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-brand-primary text-white font-bold text-base shadow-lg hover:opacity-90 transition active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating Your Pharmacy Workspace...
                    </>
                  ) : isTrial ? (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Start 7-Day Free Trial (Instant Access)
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      Proceed to SSLCOMMERZ Payment (৳{totalPrice.toLocaleString()})
                    </>
                  )}
                </button>
                <div className="text-[11px] text-center text-slate-400 mt-2 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>
                    {isTrial
                      ? "No credit card required. Full sandbox testing enabled for 7 days."
                      : "Encrypted 256-bit Sandbox Payment Gateway Session"}
                  </span>
                </div>
              </div>
            </form>
          </div>

          {/* Plan Summary Card */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-6 shadow-md">
            <div>
              <div className="text-xs font-bold uppercase text-brand-primary tracking-wider mb-1">
                Selected Plan
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedPlan.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Tier: {selectedPlan.tier}</p>
            </div>

            {/* Plan Selector Dropdown */}
            {plans.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Change Plan
                </label>
                <select
                  value={selectedPlan.id}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-none"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {Number(p.price) === 0 ? "(Free - 7 Days)" : `(৳${Number(p.price).toLocaleString()}/mo)`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Pricing Summary */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Billing Cycle</span>
                {isTrial ? (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">7-Day Free Trial</span>
                ) : (
                  <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setBillingCycle("MONTHLY")}
                      className={`px-2 py-0.5 rounded ${billingCycle === "MONTHLY" ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs" : "text-slate-500"}`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle("YEARLY")}
                      className={`px-2 py-0.5 rounded ${billingCycle === "YEARLY" ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs" : "text-slate-500"}`}
                    >
                      Yearly (-15%)
                    </button>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Branch Limit</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedPlan.maxBranches >= 999 ? "Unlimited" : `${selectedPlan.maxBranches} Store(s)`}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Total Due</span>
                <span className="text-2xl font-extrabold text-brand-primary">
                  {isTrial ? "৳0 (Free)" : `৳${totalPrice.toLocaleString()}`}
                </span>
              </div>
            </div>

            {/* Included Highlights */}
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="font-semibold text-slate-700 dark:text-slate-300">Plan Highlights:</div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Offline-First Counter POS</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Centralized Master Catalog</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>{isTrial ? "1 Branch & 1 Staff member" : "Upgrade or add branches anytime"}</span>
              </div>
            </div>
          </div>
        </div>
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
