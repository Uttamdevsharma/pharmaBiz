"use client";

import React, { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import { PharmacyBillingLedger } from "@/components/admin/PharmacyBillingLedger";
import {
  RefreshCw,
  Loader2,
  Receipt,
  Sparkles,
  AlertCircle,
} from "lucide-react";

export interface SubscriptionHistoryViewProps {
  onNavigate?: (module: OwnerModule) => void;
}

export const formatPaymentGateway = (rawMethod?: string | null) => {
  if (!rawMethod) {
    return {
      title: "SSLCOMMERZ",
      subtitle: "Online Gateway",
      badgeClass:
        "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
      dotClass: "bg-slate-400",
      fullName: "SSLCOMMERZ Payment Gateway",
    };
  }

  const raw = rawMethod.trim();
  const lower = raw.toLowerCase();

  if (lower.includes("bkash")) {
    return {
      title: "bKash",
      subtitle: "via SSLCOMMERZ",
      badgeClass:
        "bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800/60",
      dotClass: "bg-pink-500",
      fullName: "bKash (SSLCOMMERZ Gateway)",
    };
  }

  if (lower.includes("nagad")) {
    return {
      title: "Nagad",
      subtitle: "via SSLCOMMERZ",
      badgeClass:
        "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60",
      dotClass: "bg-orange-500",
      fullName: "Nagad (SSLCOMMERZ Gateway)",
    };
  }

  return {
    title: rawMethod,
    subtitle: "Online Payment",
    badgeClass:
      "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
    dotClass: "bg-slate-400",
    fullName: `${raw} (SSLCOMMERZ Gateway)`,
  };
};

export function SubscriptionHistoryView({ onNavigate }: SubscriptionHistoryViewProps) {
  const [tenant, setTenant] = useState<any>(null);
  const [ownerUser, setOwnerUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLedgerData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetchApi<any>("/tenant/billing-ledger");
      if (res.success && res.data) {
        setTenant(res.data.tenant);
        setOwnerUser(res.data.ownerUser);
      } else {
        throw new Error(res.message || "Failed to load subscription & billing ledger");
      }
    } catch (err: any) {
      console.error("Failed to load billing ledger:", err);
      setError(err.message || "Could not retrieve subscription billing ledger");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLedgerData();
  }, []);

  if (loading && !tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-brand-primary" />
        <span className="text-base font-bold text-slate-700 dark:text-slate-300">
          Loading subscription &amp; billing ledger...
        </span>
      </div>
    );
  }

  if (error && !tenant) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 text-center bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-3xl space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-rose-800 dark:text-rose-200">
          Unable to Load Billing Ledger
        </h3>
        <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>
        <button
          type="button"
          onClick={() => loadLedgerData()}
          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-2 animate-in fade-in duration-150">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-brand-primary/10 text-brand-primary mb-1.5">
            <Receipt className="h-3.5 w-3.5" />
            <span>Pharmacy Subscriptions &amp; Billing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Subscription &amp; Billing Ledger
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            1-Year scheduled billing cycles, transaction history and official printable receipts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadLedgerData(true)}
            disabled={refreshing}
            className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition shadow-xs disabled:opacity-50 cursor-pointer"
            title="Refresh records"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("subscription_plans")}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-primary text-white text-sm font-bold shadow-md hover:opacity-90 transition active:scale-95 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Subscription Plans</span>
            </button>
          )}
        </div>
      </div>

      {/* The EXACT SAME Billing Ledger Component as in Super Admin */}
      {tenant && (
        <PharmacyBillingLedger
          tenant={tenant}
          ownerUser={ownerUser}
          onRefresh={() => loadLedgerData(true)}
        />
      )}
    </div>
  );
}
