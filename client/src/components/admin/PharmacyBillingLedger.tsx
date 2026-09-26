"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  FileText,
  Printer,
  X,
} from "lucide-react";

export type LedgerFilterType =
  | "1_YEAR_LEDGER"
  | "THIS_YEAR"
  | "NEXT_1_YEAR"
  | "PAID_ONLY"
  | "OVERDUE_PENDING"
  | "CUSTOM";

export interface PharmacyBillingLedgerProps {
  tenant: any;
  ownerUser?: any;
  onRefresh?: () => void;
}

export interface BillingLedgerRow {
  id: string;
  cycleNumber: number;
  startDate: Date;
  endDate: Date;
  planName: string;
  tier: string;
  baseAmount: number;
  extraFeeType: "LICENSE_FEE" | "LATE_PENALTY" | "RE_REGISTRATION" | "NONE";
  extraFeeName: string;
  extraFeeAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentMethodSubtitle?: string;
  transactionId?: string;
  paidAt?: Date;
  status:
    | "PAID"
    | "ACTIVE"
    | "OVERDUE_GRACE"
    | "OVERDUE_PENALTY"
    | "TERMINATED"
    | "SCHEDULED";
  statusLabel: string;
  statusBadgeColor: string;
  daysOverdue?: number;
  isHistorical?: boolean;
}

// Helper to format SSLCOMMERZ / payment methods
function parsePaymentGateway(payment?: any) {
  if (!payment) {
    return {
      title: "Unpaid / Pending",
      subtitle: "-",
      badgeClass:
        "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
      dotClass: "bg-slate-400",
    };
  }

  const rawMethod = payment.paymentMethod || "";
  const cardType = payment.cardType || "";
  const cardBrand = payment.cardBrand || "";
  const combined = `${rawMethod} ${cardType} ${cardBrand}`.toLowerCase();

  if (combined.includes("bkash")) {
    return {
      title: "bKash",
      subtitle: "via SSLCOMMERZ",
      badgeClass:
        "bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800/60",
      dotClass: "bg-pink-500",
    };
  }
  if (combined.includes("nagad")) {
    return {
      title: "Nagad",
      subtitle: "via SSLCOMMERZ",
      badgeClass:
        "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60",
      dotClass: "bg-orange-500",
    };
  }
  if (combined.includes("rocket") || combined.includes("dbbl mobile")) {
    return {
      title: "Rocket",
      subtitle: "DBBL via SSLCOMMERZ",
      badgeClass:
        "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60",
      dotClass: "bg-purple-500",
    };
  }
  if (combined.includes("upay")) {
    return {
      title: "Upay",
      subtitle: "UCB via SSLCOMMERZ",
      badgeClass:
        "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60",
      dotClass: "bg-sky-500",
    };
  }
  if (combined.includes("visa")) {
    return {
      title: "Visa Card",
      subtitle: "via SSLCOMMERZ",
      badgeClass:
        "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60",
      dotClass: "bg-blue-600",
    };
  }
  if (combined.includes("master")) {
    return {
      title: "Mastercard",
      subtitle: "via SSLCOMMERZ",
      badgeClass:
        "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60",
      dotClass: "bg-amber-600",
    };
  }
  if (combined.includes("amex")) {
    return {
      title: "American Express",
      subtitle: "via SSLCOMMERZ",
      badgeClass:
        "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60",
      dotClass: "bg-teal-600",
    };
  }
  if (rawMethod.toLowerCase().includes("cash") || rawMethod.toLowerCase().includes("manual")) {
    return {
      title: "Cash / Direct Bank",
      subtitle: "Offline Settlement",
      badgeClass:
        "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60",
      dotClass: "bg-emerald-500",
    };
  }

  return {
    title: payment.cardType || payment.paymentMethod || "SSLCOMMERZ",
    subtitle: "Online Payment",
    badgeClass:
      "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
    dotClass: "bg-slate-500",
  };
}

// Helper to add 1 month reliably
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function PharmacyBillingLedger({
  tenant,
  ownerUser,
}: PharmacyBillingLedgerProps) {
  const [filter, setFilter] = useState<LedgerFilterType>("1_YEAR_LEDGER");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showPrintModal, setShowPrintModal] = useState(false);

  const licenseFee = 5000;

  // Fallback plan prices by tier if not configured on plan
  const defaultTierPrices: Record<string, number> = {
    TRIAL: 0,
    STARTER: 2000,
    GROWTH: 4000,
    ENTERPRISE: 8000,
  };

  // Generate the full 1-Year Billing Ledger (12 Cycles)
  const ledgerRows: BillingLedgerRow[] = useMemo(() => {
    if (!tenant) return [];

    const now = new Date();
    const rows: BillingLedgerRow[] = [];

    // Sort historical subscriptions chronologically (oldest first)
    const rawSubs: any[] = [...(tenant.subscriptions || [])].sort((a, b) => {
      const dateA = new Date(a.startDate || a.createdAt).getTime();
      const dateB = new Date(b.startDate || b.createdAt).getTime();
      return dateA - dateB;
    });

    // Default plan details
    const activePlan = rawSubs[rawSubs.length - 1]?.plan || null;
    const planName = activePlan?.name || `${tenant.tier || "Standard"} Plan`;
    const tier = tenant.tier || "STARTER";
    const defaultMonthlyPrice = Number(activePlan?.price) || defaultTierPrices[tier] || 2000;

    // Anchor start date: Earliest subscription startDate or tenant createdAt
    const anchorStart = rawSubs[0]?.startDate
      ? new Date(rawSubs[0].startDate)
      : tenant.createdAt
      ? new Date(tenant.createdAt)
      : new Date();

    let currentPointerStart = new Date(anchorStart);
    let cycleCounter = 1;

    // 1. Process actual historical subscriptions if present
    for (let i = 0; i < rawSubs.length; i++) {
      const sub = rawSubs[i];
      const subStart = sub.startDate ? new Date(sub.startDate) : new Date(currentPointerStart);
      const subEnd = sub.endDate ? new Date(sub.endDate) : addMonths(subStart, 1);
      const isFirst = cycleCounter === 1;

      // Extract payment
      const payment = sub.payments?.[0] || (tenant.payments || []).find((p: any) => p.subscriptionId === sub.id);
      const gw = parsePaymentGateway(payment);
      const isPaid = payment?.status === "VALIDATED" || sub.status === "ACTIVE" || Boolean(payment);

      const baseAmt = Number(payment?.amount || sub.plan?.price || defaultMonthlyPrice);
      const extraAmt = isFirst ? licenseFee : 0;
      const totalAmt = isFirst && !payment?.amount ? baseAmt + extraAmt : baseAmt;

      rows.push({
        id: sub.id || `hist-${cycleCounter}`,
        cycleNumber: cycleCounter,
        startDate: subStart,
        endDate: subEnd,
        planName: sub.plan?.name || planName,
        tier: sub.tier || tier,
        baseAmount: isFirst ? Math.max(0, totalAmt - extraAmt) : baseAmt,
        extraFeeType: isFirst ? "LICENSE_FEE" : "NONE",
        extraFeeName: isFirst ? "Software License Fee" : "",
        extraFeeAmount: extraAmt,
        totalAmount: isFirst ? totalAmt : baseAmt,
        paymentMethod: gw.title,
        paymentMethodSubtitle: gw.subtitle,
        transactionId: payment?.tranId || sub.id?.substring(0, 10).toUpperCase(),
        paidAt: payment?.createdAt ? new Date(payment.createdAt) : subStart,
        status: isPaid ? "PAID" : "ACTIVE",
        statusLabel: isPaid ? "Paid & Verified" : "Active Subscription",
        statusBadgeColor: isPaid
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        isHistorical: true,
      });

      // Update pointer for next cycle
      currentPointerStart = new Date(subEnd);
      currentPointerStart.setDate(currentPointerStart.getDate() + 1);
      cycleCounter++;
    }

    // 2. Project remaining cycles up to 12 cycles (1 Full Year Ledger)
    const targetCycles = 12;

    while (cycleCounter <= targetCycles) {
      const isFirst = cycleCounter === 1;
      const cycleStart = new Date(currentPointerStart);
      const cycleEnd = addMonths(cycleStart, 1);
      cycleEnd.setDate(cycleEnd.getDate() - 1); // 1 month span (e.g. 28 Oct to 27 Nov)

      const baseAmt = defaultMonthlyPrice;
      let extraType: "LICENSE_FEE" | "LATE_PENALTY" | "RE_REGISTRATION" | "NONE" = "NONE";
      let extraName = "";
      let extraAmt = 0;
      let status: BillingLedgerRow["status"] = "SCHEDULED";
      let statusLabel = "Upcoming Cycle";
      let statusBadgeColor =
        "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700";
      let daysOverdue = 0;

      if (isFirst) {
        extraType = "LICENSE_FEE";
        extraName = "Software License Fee";
        extraAmt = licenseFee;
      }

      // Check overdue/grace condition if this is the first un-renewed cycle
      if (cycleCounter === rawSubs.length + 1) {
        const lastEndDate = rows[rows.length - 1]?.endDate || anchorStart;
        if (now.getTime() > lastEndDate.getTime()) {
          const diffMs = now.getTime() - lastEndDate.getTime();
          daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 3600 * 24)));

          if (daysOverdue <= 30) {
            // Within 1 month (1 to 30 days): Grace Period (0 extra fee)
            status = "OVERDUE_GRACE";
            statusLabel = `Grace Period (${daysOverdue}d Overdue)`;
            statusBadgeColor =
              "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
          } else if (daysOverdue <= 90) {
            // Over 1 month up to 3 months (31 to 90 days): Late Punishment Fee of ৳3,000
            extraType = "LATE_PENALTY";
            extraName = "Late Renewal Punishment Fee";
            extraAmt = 3000;
            status = "OVERDUE_PENALTY";
            statusLabel = `Overdue (+৳3,000 Penalty)`;
            statusBadgeColor =
              "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
          } else {
            // Over 90 days (3+ months): Account Terminated / New Registration Required (৳5,000)
            extraType = "RE_REGISTRATION";
            extraName = "New Registration License Fee";
            extraAmt = 5000;
            status = "TERMINATED";
            statusLabel = `Terminated (New Reg Req.)`;
            statusBadgeColor =
              "bg-red-700/10 text-red-700 dark:text-red-400 border-red-700/30";
          }
        } else if (cycleStart.getTime() <= now.getTime() && now.getTime() <= cycleEnd.getTime()) {
          status = "ACTIVE";
          statusLabel = "Current Billing Cycle";
          statusBadgeColor =
            "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
        }
      }

      const totalAmt = baseAmt + extraAmt;

      rows.push({
        id: `projected-${cycleCounter}`,
        cycleNumber: cycleCounter,
        startDate: cycleStart,
        endDate: cycleEnd,
        planName,
        tier,
        baseAmount: baseAmt,
        extraFeeType: extraType,
        extraFeeName: extraName,
        extraFeeAmount: extraAmt,
        totalAmount: totalAmt,
        paymentMethod:
          status === "OVERDUE_PENALTY" || status === "OVERDUE_GRACE"
            ? "Unpaid / Due"
            : "Scheduled",
        paymentMethodSubtitle: "Pending Payment",
        status,
        statusLabel,
        statusBadgeColor,
        daysOverdue: daysOverdue > 0 ? daysOverdue : undefined,
        isHistorical: false,
      });

      // Prepare start of next projected cycle
      currentPointerStart = new Date(cycleEnd);
      currentPointerStart.setDate(currentPointerStart.getDate() + 1);
      cycleCounter++;
    }

    return rows;
  }, [tenant, licenseFee]);

  // Filtered rows based on selected filter
  const filteredRows = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    if (filter === "1_YEAR_LEDGER") {
      return ledgerRows;
    }

    if (filter === "THIS_YEAR") {
      return ledgerRows.filter((r) => {
        return (
          r.startDate.getFullYear() === currentYear ||
          r.endDate.getFullYear() === currentYear
        );
      });
    }

    if (filter === "NEXT_1_YEAR") {
      const oneYearAhead = new Date(now);
      oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);
      return ledgerRows.filter((r) => {
        return r.startDate >= now && r.startDate <= oneYearAhead;
      });
    }

    if (filter === "PAID_ONLY") {
      return ledgerRows.filter((r) => r.status === "PAID");
    }

    if (filter === "OVERDUE_PENDING") {
      return ledgerRows.filter(
        (r) =>
          r.status === "OVERDUE_GRACE" ||
          r.status === "OVERDUE_PENALTY" ||
          r.status === "TERMINATED" ||
          (r.status === "ACTIVE" && !r.paidAt)
      );
    }

    if (filter === "CUSTOM") {
      if (!customStart && !customEnd) return ledgerRows;
      const s = customStart ? new Date(customStart) : new Date("1970-01-01");
      const e = customEnd ? new Date(customEnd) : new Date("2099-12-31");
      e.setHours(23, 59, 59, 999);
      return ledgerRows.filter((r) => {
        return r.startDate >= s && r.endDate <= e;
      });
    }

    return ledgerRows;
  }, [ledgerRows, filter, customStart, customEnd]);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* BILLING LEDGER TABLE & FILTER TOOLBAR                                  */}
      {/* ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Subscription & Billing Ledger (1-Year Auto Schedule)
                </h2>
                <p className="text-xs text-slate-400">
                  Showing {filteredRows.length} of {ledgerRows.length} billing cycles
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
              >
                <Printer className="h-4 w-4" />
                <span>Print Billing Ledger</span>
              </button>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Filter by:
            </span>

            {[
              { key: "1_YEAR_LEDGER", label: "1-Year Full Ledger" },
              { key: "THIS_YEAR", label: "This Year" },
              { key: "NEXT_1_YEAR", label: "Next 1 Year (Upcoming)" },
              { key: "PAID_ONLY", label: "Paid Only" },
              { key: "OVERDUE_PENDING", label: "Overdue & Pending" },
              { key: "CUSTOM", label: "Custom Range" },
            ].map((preset) => {
              const isActive = filter === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setFilter(preset.key as LedgerFilterType)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-brand-primary text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Selector */}
          {filter === "CUSTOM" && (
            <div className="pt-2 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  From:
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  To:
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              {(customStart || customEnd) && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomStart("");
                    setCustomEnd("");
                  }}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 underline cursor-pointer"
                >
                  Reset Range
                </button>
              )}
            </div>
          )}
        </div>

        {/* ===================================================================== */}
        {/* TABLE: 1. Plan & Tier, 2. Period, 3. Base Fee, 4. Extra Fee, etc.     */}
        {/* ===================================================================== */}
        {filteredRows.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-slate-400 text-sm font-medium">
              No billing records match the current filter selection.
            </p>
            <button
              type="button"
              onClick={() => {
                setFilter("1_YEAR_LEDGER");
                setCustomStart("");
                setCustomEnd("");
              }}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              Reset to 1-Year Ledger
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500 select-none">
                <tr>
                  <th className="py-4 px-5">Plan & Tier</th>
                  <th className="py-4 px-5">Time Period (Duration)</th>
                  <th className="py-4 px-5 text-right">Plan Base Fee</th>
                  <th className="py-4 px-5 text-right">Extra Fee</th>
                  <th className="py-4 px-5 text-right">Total Amount</th>
                  <th className="py-4 px-5">Payment Method</th>
                  <th className="py-4 px-5">Status & Last Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-xs sm:text-sm">
                {filteredRows.map((row) => {
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                        row.status === "OVERDUE_PENALTY"
                          ? "bg-rose-50/30 dark:bg-rose-950/10"
                          : row.status === "OVERDUE_GRACE"
                          ? "bg-amber-50/30 dark:bg-amber-950/10"
                          : row.status === "ACTIVE"
                          ? "bg-blue-50/20 dark:bg-blue-950/10"
                          : ""
                      }`}
                    >
                      {/* 1. Plan & Tier (FIRST COLUMN) */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-white block text-sm">
                          {row.planName}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {row.tier}
                          </span>
                          <span className="text-[11px] text-slate-400">Monthly</span>
                        </div>
                      </td>

                      {/* 2. Time Period (Duration) (SECOND COLUMN) */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatDate(row.startDate)}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <span>to</span>
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            {formatDate(row.endDate)}
                          </span>
                        </div>
                      </td>

                      {/* 3. Plan Base Fee */}
                      <td className="py-4 px-5 whitespace-nowrap text-right font-mono text-slate-700 dark:text-slate-300 font-semibold">
                        ৳{row.baseAmount.toLocaleString()}
                      </td>

                      {/* 4. Extra Fee */}
                      <td className="py-4 px-5 whitespace-nowrap text-right">
                        {row.extraFeeAmount > 0 ? (
                          <div>
                            <span
                              className={`font-mono font-bold ${
                                row.extraFeeType === "LATE_PENALTY"
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-brand-primary"
                              }`}
                            >
                              +৳{row.extraFeeAmount.toLocaleString()}
                            </span>
                            <span className="text-[10px] block text-slate-400 truncate max-w-[130px] ml-auto">
                              {row.extraFeeName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">৳0</span>
                        )}
                      </td>

                      {/* 5. Total Amount */}
                      <td className="py-4 px-5 whitespace-nowrap text-right">
                        <span className="font-mono font-bold text-brand-primary text-sm sm:text-base">
                          ৳{row.totalAmount.toLocaleString()}
                        </span>
                      </td>

                      {/* 6. Payment Method */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {row.paymentMethod}
                        </div>
                        {row.transactionId ? (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Trx: {row.transactionId}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 block">
                            {row.paymentMethodSubtitle || "-"}
                          </span>
                        )}
                      </td>

                      {/* 7. Status & Last Paid */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${row.statusBadgeColor}`}
                          >
                            {row.statusLabel}
                          </span>
                          {row.paidAt && (
                            <span className="text-[10px] text-slate-400">
                              Paid on {formatDate(row.paidAt)}
                            </span>
                          )}
                          {row.daysOverdue && row.daysOverdue > 0 && (
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                              {row.daysOverdue} days past expiry
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* PRINTABLE BILLING LEDGER MODAL (CLEAN & USER FRIENDLY)                */}
      {/* ===================================================================== */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white text-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[95vh] my-auto">
            {/* Modal Controls Bar (Hidden during actual print) */}
            <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-brand-primary" />
                <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                  Print Billing Ledger Preview
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Print Content Document - Clean, User Friendly Layout */}
            <div className="p-8 sm:p-10 overflow-y-auto print-document printable-document space-y-6 text-slate-900 bg-white">
              {/* Document Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-800 pb-5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-brand-primary text-white flex items-center justify-center font-black text-xl">
                      P
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                        PharmaBiz Cloud
                      </h1>
                      <span className="text-xs uppercase tracking-wider text-slate-500 font-bold block">
                        Enterprise Pharmacy SaaS Management Platform
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-2 space-y-0.5">
                    <div>Web: www.pharmabiz.com • Support: support@pharmabiz.com</div>
                    <div>Hotline: +880 1800-PHARMA (742762) • Dhaka, Bangladesh</div>
                  </div>
                </div>

                <div className="text-left sm:text-right space-y-1">
                  <div className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-xs font-black uppercase tracking-wider text-slate-700 border border-slate-200">
                    Billing Ledger Statement
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-800">
                    Doc No: PB-LEDGER-{tenant.id.substring(0, 8).toUpperCase()}
                  </div>
                  <div className="text-xs text-slate-500">
                    Date: {formatDate(new Date())}
                  </div>
                </div>
              </div>

              {/* Pharmacy Details Box */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Pharmacy Client
                  </span>
                  <strong className="text-sm font-bold text-slate-900 block mt-0.5">
                    {tenant.name}
                  </strong>
                  <div className="text-slate-600 mt-0.5">{tenant.address || "Dhaka, Bangladesh"}</div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Owner / Contact
                  </span>
                  <strong className="text-xs font-bold text-slate-900 block mt-0.5">
                    {ownerUser?.name || "Proprietor"}
                  </strong>
                  <div className="text-slate-600 font-mono mt-0.5">
                    {ownerUser?.phone || tenant.phone || "N/A"}
                  </div>
                  <div className="text-slate-600 truncate">{ownerUser?.email || tenant.email}</div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Regulatory & Licenses
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    <div>
                      Trade Lic: <strong>{tenant.tradeLicenseNumber || "N/A"}</strong>
                    </div>
                    <div>
                      Drug Lic: <strong>{tenant.drugLicenseNumber || "N/A"}</strong>
                    </div>
                    <div>
                      Tier: <strong>{tenant.tier || "GROWTH"}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clean Printable Table (1. Plan & Tier, 2. Duration, etc.) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase text-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Plan & Tier</th>
                      <th className="py-2.5 px-3">Billing Duration</th>
                      <th className="py-2.5 px-3 text-right">Plan Fee</th>
                      <th className="py-2.5 px-3 text-right">Extra Fee</th>
                      <th className="py-2.5 px-3 text-right">Total Payable</th>
                      <th className="py-2.5 px-3">Payment Method</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {ledgerRows.map((row) => (
                      <tr key={row.id}>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {row.planName}
                          <span className="block text-[10px] font-normal text-slate-500 uppercase">
                            {row.tier}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono whitespace-nowrap">
                          {formatDate(row.startDate)} - {formatDate(row.endDate)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          ৳{row.baseAmount.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {row.extraFeeAmount > 0
                            ? `+৳${row.extraFeeAmount.toLocaleString()}`
                            : "৳0"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          ৳{row.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-slate-700">
                          {row.paymentMethod}
                          {row.transactionId && (
                            <span className="block text-[9px] text-slate-400 font-mono">
                              Trx: {row.transactionId}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.status === "PAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : row.status === "OVERDUE_PENALTY"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {row.statusLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
