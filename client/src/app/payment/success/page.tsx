"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { CheckCircle2, ArrowRight, ShieldCheck, Pill, Loader2, Store } from "lucide-react";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tranId = searchParams.get("tran_id") || "N/A";

  const [loading, setLoading] = useState(true);
  const [subData, setSubData] = useState<any>(null);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    async function checkSubscriptionStatus() {
      try {
        const res = await fetchApi("/subscriptions/current");
        if (res.success && res.data) {
          setSubData(res.data);
        }
      } catch (err) {
        console.warn("Could not fetch current subscription immediately", err);
      } finally {
        setLoading(false);
      }
    }
    if (typeof window !== "undefined" && localStorage.getItem("token")) {
      setHasToken(true);
    }
    checkSubscriptionStatus();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-emerald-500/10 -z-10 blur-3xl" />

      <div className="max-w-md w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-8 text-center space-y-6">
        <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
          <CheckCircle2 className="h-9 w-9" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Payment & Subscription Activated!
          </h1>
          <p className="text-xs text-slate-500">
            Your transaction has been validated by SSLCOMMERZ and your pharmacy workspace is now live.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-left space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Transaction ID</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{tranId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Plan Tier</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {subData?.subscription?.plan?.name || subData?.plan?.name || "Active Plan"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Gateway</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">SSLCOMMERZ Sandbox</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Subscription Status</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              ACTIVE
            </span>
          </div>
        </div>

        <Link
          href={hasToken ? "/dashboard" : "/login?payment=success"}
          className="w-full py-3.5 rounded-xl bg-brand-primary text-white font-bold text-sm shadow-md hover:opacity-90 transition active:scale-95 flex items-center justify-center gap-2"
        >
          <Store className="h-4 w-4" />
          <span>{hasToken ? "Enter Pharmacy Owner Dashboard" : "Login to Enter Dashboard"}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>

        <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-brand-primary" />
          <span>Multi-tenant data isolation active</span>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 text-slate-500 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
          <span>Verifying payment...</span>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
