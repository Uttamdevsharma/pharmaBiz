"use client";

import React, { useState, useEffect, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useSettings } from "@/context/SettingsContext";
import { OwnerModule } from "./DashboardSidebar";
import {
  CreditCard,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Receipt,
  Printer,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

interface SubscriptionHistoryViewProps {
  onNavigate?: (module: OwnerModule) => void;
}

type DateFilterType = "all" | "today" | "month" | "year";

// Helper function to extract specific payment method and brand
export const formatPaymentGateway = (rawMethod?: string | null) => {
  if (!rawMethod) {
    return {
      title: "SSLCOMMERZ",
      subtitle: "Online Gateway",
      badgeClass: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
      dotClass: "bg-slate-400",
      fullName: "SSLCOMMERZ Payment Gateway",
    };
  }

  const raw = rawMethod.trim();
  const lower = raw.toLowerCase();

  // Mobile Banking: bKash
  if (lower.includes("bkash")) {
    return {
      title: "bKash",
      subtitle: "via SSLCOMMERZ",
      badgeClass: "bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800/60",
      dotClass: "bg-pink-500",
      fullName: "bKash (SSLCOMMERZ Gateway)",
    };
  }

  // Mobile Banking: Nagad
  if (lower.includes("nagad")) {
    return {
      title: "Nagad",
      subtitle: "via SSLCOMMERZ",
      badgeClass: "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60",
      dotClass: "bg-orange-500",
      fullName: "Nagad (SSLCOMMERZ Gateway)",
    };
  }

  // Mobile Banking: Rocket
  if (lower.includes("rocket") || lower.includes("dbbl mobile")) {
    return {
      title: "Rocket",
      subtitle: "DBBL via SSLCOMMERZ",
      badgeClass: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60",
      dotClass: "bg-purple-500",
      fullName: "Rocket DBBL (SSLCOMMERZ Gateway)",
    };
  }

  // Mobile Banking: Upay
  if (lower.includes("upay")) {
    return {
      title: "Upay",
      subtitle: "UCB via SSLCOMMERZ",
      badgeClass: "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60",
      dotClass: "bg-sky-500",
      fullName: "Upay (SSLCOMMERZ Gateway)",
    };
  }

  // Visa Cards
  if (lower.includes("visa")) {
    const bank = raw.includes("-") ? raw.split("-")[1].trim() : "";
    return {
      title: bank ? `Visa - ${bank}` : "Visa Card",
      subtitle: "via SSLCOMMERZ",
      badgeClass: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60",
      dotClass: "bg-blue-600",
      fullName: bank ? `Visa Card (${bank}) via SSLCOMMERZ` : "Visa Card (SSLCOMMERZ Gateway)",
    };
  }

  // Mastercard
  if (lower.includes("master")) {
    const bank = raw.includes("-") ? raw.split("-")[1].trim() : "";
    return {
      title: bank ? `Mastercard - ${bank}` : "Mastercard",
      subtitle: "via SSLCOMMERZ",
      badgeClass: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60",
      dotClass: "bg-amber-600",
      fullName: bank ? `Mastercard (${bank}) via SSLCOMMERZ` : "Mastercard (SSLCOMMERZ Gateway)",
    };
  }

  // American Express
  if (lower.includes("amex")) {
    const bank = raw.includes("-") ? raw.split("-")[1].trim() : "";
    return {
      title: bank ? `Amex - ${bank}` : "American Express",
      subtitle: "via SSLCOMMERZ",
      badgeClass: "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60",
      dotClass: "bg-teal-600",
      fullName: bank ? `American Express (${bank}) via SSLCOMMERZ` : "American Express (SSLCOMMERZ Gateway)",
    };
  }

  // General Bank or card formatted string (e.g., CITY-City Bank)
  if (raw.includes("-")) {
    const parts = raw.split("-");
    return {
      title: `${parts[0].trim()} - ${parts[1]?.trim() || ""}`,
      subtitle: "via SSLCOMMERZ",
      badgeClass: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
      dotClass: "bg-slate-500",
      fullName: `${raw} (SSLCOMMERZ Gateway)`,
    };
  }

  return {
    title: raw,
    subtitle: "via SSLCOMMERZ",
    badgeClass: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
    dotClass: "bg-slate-500",
    fullName: `${raw} (SSLCOMMERZ Gateway)`,
  };
};

// Persistent module cache
let cachedSubPayments: any[] = [];
let cachedSubCurrent: any = null;

export function SubscriptionHistoryView({ onNavigate }: SubscriptionHistoryViewProps) {
  const { settings } = useSettings();
  const [payments, setPayments] = useState<any[]>(() => cachedSubPayments);
  const [currentSub, setCurrentSub] = useState<any>(() => cachedSubCurrent);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [payRes, subRes] = await Promise.all([
        fetchApi<any[]>("/payments/history"),
        fetchApi<any>("/subscriptions/current"),
      ]);

      if (payRes.success && Array.isArray(payRes.data)) {
        // Only show completed/validated payments in history (discard any abandoned or uncompleted sessions)
        const validatedOnly = payRes.data.filter((item: any) => item.status === "VALIDATED");
        setPayments(validatedOnly);
        cachedSubPayments = validatedOnly;
      }
      if (subRes.success && subRes.data) {
        setCurrentSub(subRes.data);
        cachedSubCurrent = subRes.data;
      }
    } catch (err) {
      console.error("Failed to fetch billing history:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter payments based on date, status, and search query
  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      // 1. Date filter
      if (dateFilter !== "all") {
        const itemDate = new Date(item.createdAt);
        const now = new Date();

        if (dateFilter === "today") {
          const isToday =
            itemDate.getDate() === now.getDate() &&
            itemDate.getMonth() === now.getMonth() &&
            itemDate.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (dateFilter === "month") {
          const isThisMonth =
            itemDate.getMonth() === now.getMonth() &&
            itemDate.getFullYear() === now.getFullYear();
          if (!isThisMonth) return false;
        } else if (dateFilter === "year") {
          const isThisYear = itemDate.getFullYear() === now.getFullYear();
          if (!isThisYear) return false;
        }
      }

      // 2. Status filter (Active vs Completed)
      if (statusFilter !== "all") {
        const isCurrentActive =
          (currentSub?.subscriptionId && item.subscriptionId === currentSub.subscriptionId) ||
          (item.subscription?.status === "ACTIVE");
        if (statusFilter === "ACTIVE" && !isCurrentActive) return false;
        if (statusFilter === "COMPLETED" && isCurrentActive) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const planName = (item.subscription?.plan?.name || "").toLowerCase();
        const tier = (item.subscription?.plan?.tier || "").toLowerCase();
        const method = (item.paymentMethod || "").toLowerCase();
        if (!planName.includes(query) && !tier.includes(query) && !method.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [payments, dateFilter, statusFilter, searchQuery, currentSub]);

  if (loading && payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-2">
        <span className="text-base font-semibold">Loading payment history...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-2 sm:px-4 py-2">
      {/* Short Crisp Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-brand-primary/10 text-brand-primary mb-1.5">
            <Receipt className="h-3.5 w-3.5" />
            Billing Records
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Payment History
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Subscription billing transactions and official printable receipts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadData(true)}
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
              <span>Manage Plans</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Quick Date Presets: All, Today, This Month, This Year */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 overflow-x-auto shrink-0">
            <button
              type="button"
              onClick={() => setDateFilter("all")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
                dateFilter === "all"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setDateFilter("today")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
                dateFilter === "today"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDateFilter("month")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
                dateFilter === "month"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setDateFilter("year")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
                dateFilter === "year"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              This Year
            </button>
          </div>

          {/* Search & Status Filter */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Status Filter */}
            <div className="relative shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-9 pr-9 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 cursor-pointer"
              >
                <option value="all">All Transactions</option>
                <option value="ACTIVE">Active Plan</option>
                <option value="COMPLETED">Completed / Past</option>
              </select>
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Search Input */}
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search plan or gateway..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active Filter Summary */}
        {(dateFilter !== "all" || statusFilter !== "all" || searchQuery) && (
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-500">
            <span>
              Showing <strong>{filteredPayments.length}</strong> of {payments.length} transactions
            </span>
            <button
              type="button"
              onClick={() => {
                setDateFilter("all");
                setStatusFilter("all");
                setSearchQuery("");
              }}
              className="text-brand-primary hover:underline font-bold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Billing Records Container */}
      {filteredPayments.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <Receipt className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            No payment records found
          </h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            {searchQuery || dateFilter !== "all" || statusFilter !== "all"
              ? "No billing records match your filter criteria. Try resetting your filters."
              : "No subscription payments have been recorded yet. Purchases and renewals will show here."}
          </p>
        </div>
      ) : (
        <>
          {/* ============================================================ */}
          {/* 1. DESKTOP & LAPTOP VIEW: High-density, Clear, Large Fonts  */}
          {/* Note: In accordance with instruction, Transaction ID is omitted */}
          {/* ============================================================ */}
          <div className="hidden lg:block rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 uppercase font-black tracking-wider text-xs sm:text-sm">
                  <th className="py-4 px-6">Plan Subscribed</th>
                  <th className="py-4 px-6">Amount Paid</th>
                  <th className="py-4 px-6">Payment Date</th>
                  <th className="py-4 px-6">Plan Validity</th>
                  <th className="py-4 px-6">Payment Gateway</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-slate-700 dark:text-slate-300">
                {filteredPayments.map((item) => {
                  const planName =
                    item.subscription?.plan?.name ||
                    (item.subscription?.plan?.tier
                      ? `${item.subscription.plan.tier} Plan`
                      : "Subscription Plan");
                  const tier = item.subscription?.plan?.tier || "PLAN";
                  const status = (item.status || "PENDING").toUpperCase();
                  const startDate = item.subscription?.startDate;
                  const endDate = item.subscription?.endDate;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Plan Details */}
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-sm shrink-0">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-base">
                              {planName}
                            </div>
                            <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 mt-1">
                              {tier}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Amount Paid */}
                      <td className="py-5 px-6">
                        <div className="font-black text-slate-900 dark:text-white text-lg">
                          ৳ {Number(item.amount).toLocaleString()}
                        </div>
                        <span className="text-xs font-semibold text-slate-400">BDT</span>
                      </td>

                      {/* Payment Date & Time */}
                      <td className="py-5 px-6">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                          {new Date(item.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-xs font-medium text-slate-400">
                          {new Date(item.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Plan Validity / Expiry Date */}
                      <td className="py-5 px-6">
                        {endDate ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base flex items-center gap-1.5">
                              <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                              <span>
                                Valid to:{" "}
                                {new Date(endDate).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            {startDate && (
                              <div className="text-xs text-slate-400 font-medium">
                                Started: {new Date(startDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 italic font-medium">30 Days Period</span>
                        )}
                      </td>

                      {/* Payment Method / Gateway */}
                      <td className="py-5 px-6">
                        {(() => {
                          const gw = formatPaymentGateway(item.paymentMethod || item.cardType);
                          return (
                            <div className="flex flex-col gap-0.5">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold text-xs sm:text-sm w-fit ${gw.badgeClass}`}>
                                <span className={`h-2 w-2 rounded-full shrink-0 ${gw.dotClass}`} />
                                {gw.title}
                              </span>
                              <span className="text-[11px] font-medium text-slate-400 pl-1">
                                {gw.subtitle}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Status */}
                      <td className="py-5 px-6">
                        {(() => {
                          const isCurrentActive =
                            (currentSub?.subscriptionId && item.subscriptionId === currentSub.subscriptionId) ||
                            (item.subscription?.status === "ACTIVE");

                          return (
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                isCurrentActive
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              }`}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              {isCurrentActive ? "Paid & Active" : "Paid & Completed"}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Action: View Receipt */}
                      <td className="py-5 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(item)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer"
                        >
                          <Eye className="h-4 w-4 text-brand-primary" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ============================================================ */}
          {/* 2. MOBILE & TABLET VIEW: Responsive Card Stack               */}
          {/* Large clear typography, no cramped scrolling                 */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
            {filteredPayments.map((item) => {
              const planName =
                item.subscription?.plan?.name ||
                (item.subscription?.plan?.tier
                  ? `${item.subscription.plan.tier} Plan`
                  : "Subscription Plan");
              const tier = item.subscription?.plan?.tier || "PLAN";
              const status = (item.status || "PENDING").toUpperCase();
              const startDate = item.subscription?.startDate;
              const endDate = item.subscription?.endDate;

              return (
                <div
                  key={item.id}
                  className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4"
                >
                  {/* Card Header: Plan & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-base shrink-0">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-base">
                          {planName}
                        </h4>
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 mt-1">
                          {tier}
                        </span>
                      </div>
                    </div>

                    {(() => {
                      const isCurrentActive =
                        (currentSub?.subscriptionId && item.subscriptionId === currentSub.subscriptionId) ||
                        (item.subscription?.status === "ACTIVE");

                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                            isCurrentActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {isCurrentActive ? "Paid & Active" : "Paid & Completed"}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Card Content Grid */}
                  <div className="grid grid-cols-2 gap-4 py-3.5 border-y border-slate-100 dark:border-slate-800 text-sm">
                    <div>
                      <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">
                        Amount Paid
                      </span>
                      <span className="text-lg font-black text-slate-900 dark:text-white">
                        ৳ {Number(item.amount).toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">
                        Payment Date
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="col-span-2">
                      <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">
                        Subscription Validity
                      </span>
                      <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-1">
                        <Clock className="h-4 w-4 text-brand-primary shrink-0" />
                        <span>
                          {endDate
                            ? `Valid until ${new Date(endDate).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}`
                            : "30-Day Billing Cycle"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Gateway & Action */}
                  <div className="flex items-center justify-between pt-1">
                    {(() => {
                      const gw = formatPaymentGateway(item.paymentMethod || item.cardType);
                      return (
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs ${gw.badgeClass}`}>
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${gw.dotClass}`} />
                            {gw.title}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400">
                            ({gw.subtitle})
                          </span>
                        </div>
                      );
                    })()}

                    <button
                      type="button"
                      onClick={() => setSelectedReceipt(item)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold transition cursor-pointer"
                    >
                      <Eye className="h-4 w-4 text-brand-primary" />
                      <span>View Receipt</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Print-only CSS rules to isolate the invoice */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 12mm 12mm 12mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          /* Hide all page content by default */
          body * {
            visibility: hidden !important;
          }
          /* Make only the invoice and its children visible */
          #printable-subscription-invoice,
          #printable-subscription-invoice * {
            visibility: visible !important;
          }
          #printable-subscription-invoice {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 12px !important;
            display: block !important;
          }
          .invoice-backdrop-print {
            position: static !important;
            background: transparent !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            margin: 0 !important;
            inset: auto !important;
            display: block !important;
          }
          .print-hide {
            display: none !important;
          }
        }
      `}</style>

      {/* ============================================================ */}
      {/* 3. DIGITAL MONEY RECEIPT / INVOICE MODAL                     */}
      {/* Printable and downloadable receipt dialog                    */}
      {/* ============================================================ */}
      {selectedReceipt && (() => {
        const projectName = settings?.siteName || "SaaS Platform";
        const projectLogo = settings?.logoUrl || "";
        const supportEmail = settings?.contact?.email || "";
        const supportPhone = settings?.contact?.phone || "";
        const supportAddress = settings?.contact?.address || "";

        return (
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto invoice-backdrop-print"
            onClick={() => setSelectedReceipt(null)}
          >
            <div
              id="printable-subscription-invoice"
              className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 relative text-slate-900 dark:text-white animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="absolute right-4 top-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer print-hide"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Header: Platform Branding (from Super Admin settings) & Invoice Info */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 dark:border-slate-700 pb-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {projectLogo ? (
                      <img
                        src={projectLogo}
                        alt={projectName}
                        className="h-10 sm:h-12 object-contain print:h-12 max-w-[180px]"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-2xl bg-brand-primary text-white flex items-center justify-center font-black text-xl shadow-xs">
                        <Sparkles className="h-5 w-5" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white print:text-black">
                        {projectName}
                      </h2>
                    </div>
                  </div>

                  {(supportEmail || supportPhone || supportAddress) && (
                    <div className="text-xs text-slate-500 print:text-slate-600 space-y-0.5 font-medium">
                      {supportEmail && <p>Email: {supportEmail}</p>}
                      {supportPhone && <p>Phone: {supportPhone}</p>}
                      {supportAddress && <p>Address: {supportAddress}</p>}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 print:text-emerald-800 text-xs font-black uppercase tracking-wider mb-1.5">
                    ✓ PAID INVOICE
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white print:text-black">
                    OFFICIAL RECEIPT
                  </h3>
                  <p className="text-xs font-mono font-bold text-slate-500 print:text-slate-700">
                    Invoice #: INV-{new Date(selectedReceipt.createdAt).getFullYear()}-{(selectedReceipt.tranId || "000000").slice(-6).toUpperCase()}
                  </p>
                  <p className="text-xs text-slate-500 print:text-slate-700">
                    Date: {new Date(selectedReceipt.createdAt).toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Client Info & Payment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-slate-200 dark:border-slate-800 text-xs sm:text-sm">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600 block mb-1">
                    Billed To:
                  </span>
                  <div className="font-bold text-base text-slate-900 dark:text-white print:text-black">
                    {selectedReceipt.tenant?.name || currentSub?.tenantName || "Registered Pharmacy"}
                  </div>
                  <div className="text-xs text-slate-500 print:text-slate-700 mt-1 space-y-0.5 font-medium">
                    {selectedReceipt.tenant?.email && <p>Email: {selectedReceipt.tenant.email}</p>}
                    {selectedReceipt.tenant?.phone && <p>Phone: {selectedReceipt.tenant.phone}</p>}
                    {selectedReceipt.tenant?.address && <p>Address: {selectedReceipt.tenant.address}</p>}
                  </div>
                </div>

                <div className="sm:pl-6 sm:border-l border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600 block mb-1">
                    Payment Details:
                  </span>
                  <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300 print:text-slate-800">
                    <p>
                      <span className="font-semibold text-slate-400 print:text-slate-600">Method: </span>
                      <strong className="text-slate-900 dark:text-white print:text-black font-bold">
                        {formatPaymentGateway(selectedReceipt.paymentMethod || selectedReceipt.cardType).fullName}
                      </strong>
                    </p>
                    <p className="font-mono text-[11px] truncate">
                      <span className="font-semibold text-slate-400 print:text-slate-600 font-sans">Transaction ID: </span>
                      {selectedReceipt.tranId}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-400 print:text-slate-600">Coverage: </span>
                      {selectedReceipt.subscription?.startDate
                        ? `${new Date(selectedReceipt.subscription.startDate).toLocaleDateString()} to ${new Date(
                            selectedReceipt.subscription.endDate
                          ).toLocaleDateString()}`
                        : "30-Day Period"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="py-2">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-900 dark:border-slate-700 text-slate-600 dark:text-slate-300 print:text-black uppercase text-[11px] font-black tracking-wider">
                      <th className="py-2.5">Subscription Plan</th>
                      <th className="py-2.5 text-center">Billing Cycle</th>
                      <th className="py-2.5 text-right">Amount (BDT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 print:text-black">
                    <tr>
                      <td className="py-3.5 font-bold text-slate-900 dark:text-white print:text-black text-sm sm:text-base">
                        {selectedReceipt.subscription?.plan?.name || "Subscription"} Plan
                      </td>
                      <td className="py-3.5 text-center text-xs font-semibold">
                        {selectedReceipt.subscription?.plan?.billingCycle === "YEARLY" ? "Yearly Access" : "Monthly Access (30 Days)"}
                      </td>
                      <td className="py-3.5 text-right font-black text-slate-900 dark:text-white print:text-black text-base">
                        ৳ {Number(selectedReceipt.amount).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Financial Summary */}
              <div className="pt-3 border-t-2 border-slate-900 dark:border-slate-700 space-y-1.5 text-xs sm:text-sm">
                <div className="flex justify-between text-slate-500 print:text-slate-700">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-900 dark:text-white print:text-black">
                    ৳ {Number(selectedReceipt.amount).toLocaleString()} BDT
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 print:text-slate-700">
                  <span>VAT / Tax:</span>
                  <span className="font-semibold text-slate-900 dark:text-white print:text-black">
                    ৳ 0.00 BDT
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 dark:border-slate-800 text-base font-bold">
                  <span className="text-slate-900 dark:text-white print:text-black font-black">
                    Total Amount Paid:
                  </span>
                  <span className="text-2xl font-black text-brand-primary print:text-black">
                    ৳ {Number(selectedReceipt.amount).toLocaleString()} BDT
                  </span>
                </div>
              </div>

              {/* Minimal note without filler */}
              <div className="pt-2 text-center text-[11px] text-slate-400 print:text-slate-500 border-t border-dashed border-slate-200 dark:border-slate-800">
                This is a computer-generated invoice. No physical signature is required.
              </div>

              {/* Modal Actions */}
              <div className="flex items-center gap-3 pt-2 print-hide">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="px-6 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
