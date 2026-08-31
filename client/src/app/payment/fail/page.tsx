"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { XCircle, ArrowRight, RotateCcw, AlertTriangle, Loader2 } from "lucide-react";

function PaymentFailContent() {
  const searchParams = useSearchParams();
  const tranId = searchParams.get("tran_id") || "N/A";
  const errorMsg = searchParams.get("error") || "Transaction failed or was rejected by card issuer.";

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-8 text-center space-y-6">
        <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
          <XCircle className="h-9 w-9" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Payment Failed</h1>
          <p className="text-xs text-slate-500">{errorMsg}</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-left space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Transaction ID</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">{tranId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Subscription Status</span>
            <span className="font-bold text-red-500">UNPAID (Pending)</span>
          </div>
        </div>

        <div className="space-y-3">
          <Link
            href="/#pricing"
            className="w-full py-3.5 rounded-xl bg-brand-primary text-white font-bold text-sm shadow hover:opacity-90 transition active:scale-95 flex items-center justify-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Retry Payment
          </Link>
          <Link
            href="/"
            className="block text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PaymentFailContent />
    </Suspense>
  );
}
