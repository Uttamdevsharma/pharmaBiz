"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

function PaymentCancelContent() {
  const searchParams = useSearchParams();
  const tranId = searchParams.get("tran_id") || "N/A";

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-8 text-center space-y-6">
        <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
          <AlertCircle className="h-9 w-9" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Payment Cancelled</h1>
          <p className="text-xs text-slate-500">
            You cancelled the SSLCOMMERZ checkout session. No charges were made.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/#pricing"
            className="w-full py-3.5 rounded-xl bg-brand-primary text-white font-bold text-sm shadow hover:opacity-90 transition active:scale-95 flex items-center justify-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Select Subscription Plan
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

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PaymentCancelContent />
    </Suspense>
  );
}
