"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import {
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Calendar,
  Filter,
  Loader2,
  Receipt,
  Store,
  Search,
  ChevronLeft,
  ChevronRight,
  Wallet,
} from "lucide-react";

interface FinancialAccount {
  id: string;
  name: string;
  type: string;
  accountNumber?: string | null;
}

import { useBranchContext } from "@/context/BranchContext";

interface PaymentMethodSalesViewProps {
  onNavigate?: (module: any) => void;
  selectedBranchId?: string;
}

export function PaymentMethodSalesView({ onNavigate: _onNavigate, selectedBranchId: propBranchId }: PaymentMethodSalesViewProps = {}) {
  const { selectedBranchId: contextBranchId, currentBranch, isAllBranches } = useBranchContext();
  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;

  // Date range filtering
  const [datePreset, setDatePreset] = useState<"today" | "yesterday" | "last7" | "thisMonth" | "custom">("today");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Accounts for dynamic payment method filter
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);

  // Telemetry Data
  const [dailyData, setDailyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMethodFilter, setSelectedMethodFilter] = useState<string>("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const loadAccounts = async (branchId?: string) => {
    try {
      const url = (branchId && branchId !== "all") ? `/accounting/accounts?branchId=${branchId}` : "/accounting/accounts";
      const res = await fetchApi<FinancialAccount[]>(url);
      if (res.success && res.data) {
        setAccounts(res.data);
      }
    } catch (err) {
      console.error("Failed to load accounts for filter", err);
    }
  };

  const loadPaymentSales = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (effectiveBranchId && effectiveBranchId !== "all") {
        params.append("branchId", effectiveBranchId);
      }

      const res = await fetchApi<any>(`/reports/sales/daily?${params.toString()}`);

      if (res.success && res.data) {
        setDailyData(res.data);
      }
    } catch (err) {
      console.error("Failed to load payment method sales", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadAccounts(effectiveBranchId);
    loadPaymentSales();
  }, [startDate, endDate, effectiveBranchId]);

  const handlePresetChange = (preset: "today" | "yesterday" | "last7" | "thisMonth" | "custom") => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === "today") {
      const d = now.toISOString().split("T")[0];
      setStartDate(d);
      setEndDate(d);
    } else if (preset === "yesterday") {
      const y = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setStartDate(y);
      setEndDate(y);
    } else if (preset === "last7") {
      const s = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const e = now.toISOString().split("T")[0];
      setStartDate(s);
      setEndDate(e);
    } else if (preset === "thisMonth") {
      const s = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const e = now.toISOString().split("T")[0];
      setStartDate(s);
      setEndDate(e);
    }
  };

  // Build dynamic payment method options from real accounts
  const paymentMethodOptions = [
    { value: "ALL", label: "All Methods" },
    ...accounts.map((acc) => ({
      value: acc.id,
      label: acc.name,
      type: acc.type,
    })),
  ];

  // Filter transactions
  const filteredTransactions = (dailyData?.transactions || []).filter((t: any) => {
    if (selectedMethodFilter !== "ALL") {
      // Match by account id (financialAccountId) or by paymentMethod/type heuristics
      const acc = accounts.find((a) => a.id === selectedMethodFilter);
      if (acc) {
        const accType = acc.type.toUpperCase();
        const tMethod = (t.paymentMethod || "").toUpperCase();
        const tDetail = (t.paymentDetail || "").toLowerCase();
        const tAccId = t.financialAccountId;

        // Prefer financialAccountId match
        if (tAccId && tAccId === acc.id) {
          // matched
        } else if (accType === "CASH" && tMethod !== "CASH") {
          return false;
        } else if (accType === "BKASH" && !tDetail.includes("bkash") && tMethod !== "BKASH") {
          return false;
        } else if (accType === "NAGAD" && !tDetail.includes("nagad") && tMethod !== "NAGAD") {
          return false;
        } else if (accType === "BANK" || accType === "CARD_SETTLEMENT") {
          if (tMethod !== "BANK" && tMethod !== "CARD" && tMethod !== "CARD_SETTLEMENT") return false;
        }
      }
    }

    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      return (
        t.receiptNo?.toLowerCase().includes(s) ||
        t.customerName?.toLowerCase().includes(s) ||
        t.cashier?.name?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getAccountIcon = (type: string) => {
    const t = type?.toUpperCase();
    if (t === "CASH") return Banknote;
    if (t === "BKASH" || t === "NAGAD" || t === "MOBILE") return Smartphone;
    if (t === "BANK" || t === "CARD_SETTLEMENT") return Building2;
    return Wallet;
  };

  const getPaymentBadgeStyle = (paymentMethod: string, paymentDetail: string) => {
    const m = (paymentMethod || "").toUpperCase();
    const d = (paymentDetail || "").toLowerCase();
    if (m === "CASH") return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400";
    if (m === "CARD" || m === "CARD_SETTLEMENT") return "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400";
    if (d.includes("nagad") || m === "NAGAD") return "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400";
    if (d.includes("bkash") || m === "BKASH") return "bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-400";
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  };

  return (
    <div className="space-y-6 2xl:space-y-8 w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs xl:text-sm text-slate-400 mb-1">
            <span>Accounts & Finance</span>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300 font-bold">Payment Methods</span>
          </div>
          <h1 className="text-2xl xl:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <CreditCard className="h-7 w-7 xl:h-8 xl:w-8 text-emerald-600 dark:text-emerald-400" />
            Payment Method Sales History
          </h1>
          <p className="text-xs sm:text-sm xl:text-base text-slate-500 dark:text-slate-400 mt-1">
            Filter and audit individual customer sales transactions by specific payment method and destination financial accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadPaymentSales(true)}
            disabled={refreshing}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" /> : <Filter className="h-3.5 w-3.5" />}
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Date & Filter Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Period:</span>
          {[
            { id: "today", label: "Today" },
            { id: "yesterday", label: "Yesterday" },
            { id: "last7", label: "Last 7 Days" },
            { id: "thisMonth", label: "This Month" },
            { id: "custom", label: "Custom Range" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => {
                handlePresetChange(p.id as any);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                datePreset === p.id
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date Pickers & Branch Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset("custom");
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset("custom");
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
            <Store className="h-4 w-4 text-emerald-500" />
            <span>Scope:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {isAllBranches ? "All Branches" : (currentBranch?.name || "Selected Branch")}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <span className="text-xs font-bold">Querying payment method telemetry...</span>
        </div>
      ) : (
        <>
          {/* PAYMENT TRANSACTIONS TABLE */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-emerald-600" />
                  Payment Transactions Ledger
                </h3>
                <p className="text-xs text-slate-400">
                  Detailed list of invoices with verified payment collection methods.
                  {filteredTransactions.length > 0 && (
                    <span className="ml-2 font-bold text-slate-600 dark:text-slate-300">
                      {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search invoice, customer, cashier..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                  />
                </div>

                {/* Dynamic account-based payment filter */}
                <select
                  value={selectedMethodFilter}
                  onChange={(e) => {
                    setSelectedMethodFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
                >
                  <option value="ALL">All Accounts</option>
                  {accounts.length === 0 ? (
                    <option value="" disabled>No accounts created yet</option>
                  ) : (
                    accounts.map((acc) => {
                      const Icon = getAccountIcon(acc.type);
                      return (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}{acc.accountNumber ? ` (${acc.accountNumber})` : ""}
                        </option>
                      );
                    })
                  )}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Cashier</th>
                    <th className="py-3 px-4">Payment Method / Account</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <CreditCard className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <div className="text-slate-400 font-semibold">No transactions found for the selected criteria.</div>
                        <div className="text-slate-300 dark:text-slate-600 text-[11px] mt-1">Try a different date range or payment filter.</div>
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono">
                          <div>{new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                          <div className="text-[10px] text-slate-400">{new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {t.receiptNo}
                        </td>
                        <td className="py-3 px-4 font-medium">{t.customerName || "Walk-in Customer"}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{t.cashier?.name || "Staff"}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getPaymentBadgeStyle(t.paymentMethod, t.paymentDetail)}`}
                          >
                            {t.paymentDetail || t.paymentMethod || "—"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{t.branchName || "Main Branch"}</td>
                        <td className="py-3 px-4 text-right font-black font-mono text-emerald-600 dark:text-emerald-400">
                          ৳{Number(t.totalAmount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 text-xs text-slate-500">
                <div>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}{" "}
                  transactions
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-200"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-3 font-bold">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-200"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
