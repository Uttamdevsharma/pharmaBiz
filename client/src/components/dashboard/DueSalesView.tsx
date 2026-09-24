"use client";

import React, { useState, useEffect, useRef } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { OwnerModule } from "./DashboardSidebar";
import { Pagination } from "@/components/common/Pagination";
import { useBranchContext } from "@/context/BranchContext";
import {
  BadgeAlert,
  Search,
  Calendar,
  RefreshCw,
  Loader2,
  Receipt,
  Printer,
  Eye,
  Store,
  CreditCard,
  Banknote,
  Smartphone,
  Wallet,
  Landmark,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  DollarSign,
  User,
  Phone,
  ArrowRight,
  TrendingDown,
  Percent,
} from "lucide-react";
import { formatPaymentMethod } from "./SalesHistoryView";

interface DueSalesViewProps {
  onNavigate?: (module: OwnerModule) => void;
  selectedBranchId?: string;
}

interface FinancialAccountItem {
  id: string;
  name: string;
  type: string;
  bankName?: string | null;
  accountNumber?: string | null;
  balance: number;
  isDefault?: boolean;
  isActive?: boolean;
  branch?: { id: string; name: string } | null;
}

interface SaleRecord {
  id: string;
  receiptNo: string;
  createdAt: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  subTotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: string;
  bankName?: string | null;
  transactionRef?: string | null;
  status: string;
  notes?: string | null;
  prescriptionRef?: string | null;
  branch?: { id: string; name: string; location?: string | null } | null;
  user?: { id: string; name: string; username: string } | null;
  items?: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    subTotal: number;
    unitType?: string;
    batchNumber?: string;
    product?: { id: string; name: string; sku: string; size?: string; unit?: string } | null;
  }>;
}

// Persistent module-level cache across transitions
let cachedDueSales: SaleRecord[] = [];
let cachedDueTotalPages = 1;
let cachedDueTotalCount = 0;

export function setCachedDueSalesData(records: SaleRecord[], totalPages = 1, totalCount = 0) {
  cachedDueSales = records;
  cachedDueTotalPages = totalPages;
  cachedDueTotalCount = totalCount;
}

export function getCachedDueSalesData() {
  return {
    sales: cachedDueSales,
    totalPages: cachedDueTotalPages,
    totalCount: cachedDueTotalCount,
  };
}

export function DueSalesView({ selectedBranchId: propBranchId, onNavigate }: DueSalesViewProps = {}) {
  const { user: authUser } = useAuth();
  const { selectedBranchId: contextBranchId, currentBranch, isAllBranches } = useBranchContext();
  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;

  const [sales, setSales] = useState<SaleRecord[]>(() => cachedDueSales);
  const [loading, setLoading] = useState(() => cachedDueSales.length === 0);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [periodPreset, setPeriodPreset] = useState<
    "today" | "yesterday" | "last7Days" | "thisMonth" | "thisYear" | "all" | "custom"
  >("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(() => cachedDueTotalPages);
  const [totalCount, setTotalCount] = useState(() => cachedDueTotalCount);

  // Selected Sale for View Invoice Modal
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  // Collect Due Modal & Financial Accounts (Loaded from Accounts & Finance)
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [collectSale, setCollectSale] = useState<SaleRecord | null>(null);
  const [collectAmount, setCollectAmount] = useState<string>("");
  const [collectTransactionRef, setCollectTransactionRef] = useState<string>("");
  const [collectNotes, setCollectNotes] = useState<string>("");
  const [collectSubmitting, setCollectSubmitting] = useState(false);
  const [collectError, setCollectError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Dynamic Financial Accounts
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load Due Sales List
  const loadDueSales = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else if (cachedDueSales.length === 0) setLoading(true);

      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      params.append("paymentStatus", "DUE"); // Always query only due sales

      if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
      if (effectiveBranchId && effectiveBranchId !== "all") {
        params.append("branchId", effectiveBranchId);
      }

      if (periodPreset !== "all") {
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
      }

      const res = await fetchApi<any>(`/sales?${params.toString()}`);

      if (res.success) {
        const list = res.data || [];
        setSales(list);
        cachedDueSales = list;
        const pagination = (res as any).pagination || res.meta;
        if (pagination) {
          const tp = pagination.totalPages || 1;
          const tc = pagination.total || 0;
          setTotalPages(tp);
          setTotalCount(tc);
          cachedDueTotalPages = tp;
          cachedDueTotalCount = tc;
        }
      }
    } catch (err) {
      console.error("Failed to load due sales", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDueSales();
  }, [page, limit, periodPreset, startDate, endDate, debouncedSearch, effectiveBranchId]);

  const handlePeriodPreset = (
    preset: "today" | "yesterday" | "last7Days" | "thisMonth" | "thisYear" | "all" | "custom"
  ) => {
    setPeriodPreset(preset);
    setPage(1);
    const now = new Date();

    if (preset === "today") {
      const todayStr = now.toISOString().split("T")[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === "last7Days") {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      setStartDate(past.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "thisMonth") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      setStartDate(first);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "thisYear") {
      const first = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
      setStartDate(first);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  // Open Invoice Preview Modal
  const openInvoiceModal = async (sale: SaleRecord) => {
    setSelectedSale(sale);
    setReceiptData(null);
    setInvoiceModalOpen(true);
    try {
      const res = await fetchApi<any>(`/sales/${sale.id}/receipt`);
      if (res.success && res.data) {
        setReceiptData(res.data);
      }
    } catch (e) {
      console.warn("Could not load receipt data:", e);
    }
  };

  const closeInvoiceModal = () => {
    setInvoiceModalOpen(false);
    setSelectedSale(null);
    setReceiptData(null);
  };

  // Open Collect Due Modal & Load Financial Accounts for this branch
  const openCollectModal = async (sale: SaleRecord) => {
    setCollectSale(sale);
    setCollectAmount(String(Number(sale.dueAmount || 0)));
    setCollectTransactionRef("");
    setCollectNotes("");
    setCollectError(null);
    setCollectModalOpen(true);
    setLoadingAccounts(true);

    try {
      const branchParam = sale.branch?.id || (effectiveBranchId !== "all" ? effectiveBranchId : undefined);
      const url = branchParam ? `/accounting/accounts?branchId=${branchParam}` : "/accounting/accounts";
      const res = await fetchApi<any[]>(url);
      if (res.success && Array.isArray(res.data)) {
        const active = res.data.filter((a: any) => a.isActive !== false);
        setFinancialAccounts(active);
        const def = active.find((a: any) => a.isDefault) || active[0];
        if (def) {
          setSelectedAccountId(def.id);
        } else {
          setSelectedAccountId("");
        }
      }
    } catch (e) {
      console.warn("Could not load financial accounts:", e);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const closeCollectModal = () => {
    setCollectModalOpen(false);
    setCollectSale(null);
    setCollectError(null);
  };

  // Handle Due Collection Submission
  const handleCollectDueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectSale) return;

    const amountNum = parseFloat(collectAmount);
    const maxDue = Number(collectSale.dueAmount || 0);

    if (isNaN(amountNum) || amountNum <= 0) {
      setCollectError("Please enter a valid payment amount greater than 0.");
      return;
    }

    if (amountNum > maxDue + 0.01) {
      setCollectError(`Amount cannot exceed outstanding due of ৳${maxDue.toFixed(2)}.`);
      return;
    }

    if (!selectedAccountId && financialAccounts.length > 0) {
      setCollectError("Please select a financial account to receive this due payment.");
      return;
    }

    const selectedAcc = financialAccounts.find((a) => a.id === selectedAccountId);
    let method: "CASH" | "BKASH" | "NAGAD" | "BANK" | "CARD" | "MOBILE" | "OTHER" = "CASH";
    if (selectedAcc) {
      const typeUpper = (selectedAcc.type || "").toUpperCase();
      const nameUpper = (selectedAcc.name || "").toUpperCase();
      if (typeUpper === "BANK") {
        method = "BANK";
      } else if (typeUpper === "MOBILE_BANKING" || typeUpper === "MOBILE") {
        if (nameUpper.includes("NAGAD")) method = "NAGAD";
        else if (nameUpper.includes("BKASH")) method = "BKASH";
        else method = "MOBILE";
      } else if (typeUpper === "CARD_SETTLEMENT" || typeUpper === "CARD") {
        method = "CARD";
      } else {
        method = "CASH";
      }
    }

    try {
      setCollectSubmitting(true);
      setCollectError(null);

      const res = await fetchApi<any>(`/sales/${collectSale.id}/collect-due`, {
        method: "POST",
        body: JSON.stringify({
          amount: amountNum,
          paymentMethod: method,
          financialAccountId: selectedAccountId || undefined,
          bankName: selectedAcc?.bankName || selectedAcc?.name || undefined,
          transactionRef: collectTransactionRef || undefined,
          notes: collectNotes || undefined,
        }),
      });

      if (res.success) {
        setSuccessBanner(
          `Successfully collected ৳${amountNum.toFixed(2)} for Receipt #${collectSale.receiptNo}! Account balance updated.`
        );
        setTimeout(() => setSuccessBanner(null), 6000);
        closeCollectModal();
        loadDueSales(true);
      } else {
        setCollectError(res.message || "Failed to collect due payment.");
      }
    } catch (err: any) {
      setCollectError(err.message || "An unexpected error occurred while collecting payment.");
    } finally {
      setCollectSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-primary/10 rounded-2xl text-brand-primary">
            <BadgeAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Due Sales
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customer credit accounts & outstanding due collection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate("pos")}
              className="h-10 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-black shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <span>+ New POS Sale</span>
            </button>
          )}

          <button
            onClick={() => loadDueSales(true)}
            disabled={refreshing}
            className="h-10 px-4 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-brand-primary" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-3 text-sm font-bold shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        {/* Timeframe Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider mr-1">Timeframe:</span>
            {[
              { id: "all", label: "All Dues" },
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "last7Days", label: "Last 7 Days" },
              { id: "thisMonth", label: "This Month" },
              { id: "thisYear", label: "This Year" },
              { id: "custom", label: "Custom Range" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePeriodPreset(p.id as any)}
                className={`h-9 px-3.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  periodPreset === p.id
                    ? "bg-brand-primary text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date range pickers (ONLY shown when Custom Range is selected) */}
          {periodPreset === "custom" && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 h-9 rounded-xl border border-slate-200 dark:border-slate-700 animate-in fade-in">
              <Calendar className="h-3.5 w-3.5 text-brand-primary" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Real-time Debounced Search & Branch Scope */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 w-full">
            <Search className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, phone number, or receipt #..."
              className="w-full h-11 pl-11 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-brand-primary transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Active Branch Scope Badge */}
          <div className="flex items-center gap-2 h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
            <Store className="h-3.5 w-3.5 text-brand-primary" />
            <span>Branch:</span>
            <span className="font-black text-slate-900 dark:text-white">
              {isAllBranches ? "All Branches" : currentBranch?.name || "Selected Branch"}
            </span>
          </div>
        </div>
      </div>

      {/* Due Sales Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading && sales.length === 0 ? (
          <div className="table-responsive-container">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-wider border-b-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-4 px-5">Date & Receipt</th>
                  <th className="py-4 px-4">Branch</th>
                  <th className="py-4 px-4">Customer</th>
                  <th className="py-4 px-4 text-right">Total Bill (৳)</th>
                  <th className="py-4 px-4 text-right">Paid (৳)</th>
                  <th className="py-4 px-4 text-right">Due (৳)</th>
                  <th className="py-4 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 animate-pulse">
                {[...Array(6)].map((_, i) => (
                  <tr key={i} className="h-16">
                    <td className="py-4 px-5"><div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" /></td>
                    <td className="py-4 px-4 text-right"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded ml-auto" /></td>
                    <td className="py-4 px-4 text-right"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded ml-auto" /></td>
                    <td className="py-4 px-4 text-right"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded ml-auto" /></td>
                    <td className="py-4 px-5 text-center"><div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded mx-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : sales.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
            <p className="text-base font-bold text-slate-700 dark:text-slate-300">
              No outstanding customer dues found!
            </p>
            <p className="text-xs text-slate-400">
              All sales within this filter timeframe have been fully settled.
            </p>
          </div>
        ) : (
          <div className="table-responsive-container">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-wider border-b-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-4 px-5">Date & Receipt</th>
                  <th className="py-4 px-4">Branch</th>
                  <th className="py-4 px-4">Customer</th>
                  <th className="py-4 px-4 text-right">Total Bill (৳)</th>
                  <th className="py-4 px-4 text-right">Paid (৳)</th>
                  <th className="py-4 px-4 text-right">Due (৳)</th>
                  <th className="py-4 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sales.map((sale) => {
                  const remainingDue = Number(sale.dueAmount || 0);
                  const paidSoFar = Number(sale.paidAmount || 0);
                  const totalBill = Number(sale.totalAmount || 0);

                  return (
                    <tr
                      key={sale.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition"
                    >
                      {/* Date & Receipt Combined */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="text-slate-900 dark:text-white text-sm font-bold">
                          {new Date(sale.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>
                            {new Date(sale.createdAt).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="font-bold text-brand-primary">#{sale.receiptNo}</span>
                        </div>
                      </td>

                      {/* Branch */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">
                          <Store className="h-4 w-4 text-brand-primary shrink-0" />
                          <span>{sale.branch?.name || "Main Branch"}</span>
                        </span>
                      </td>

                      {/* Customer Info */}
                      <td className="py-4 px-4">
                        <div className="text-slate-900 dark:text-white text-sm font-black truncate max-w-[190px]">
                          {sale.customerName || "Walk-in Customer"}
                        </div>
                        {sale.customerPhone && (
                          <div className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{sale.customerPhone}</span>
                          </div>
                        )}
                      </td>

                      {/* Total Bill */}
                      <td className="py-4 px-4 text-right font-mono font-bold text-sm text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        ৳{totalBill.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-4 px-4 text-right font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        ৳{paidSoFar.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Remaining Due (Brand Primary Color, NOT red!) */}
                      <td className="py-4 px-4 text-right font-mono font-black text-base text-brand-primary whitespace-nowrap">
                        ৳{remainingDue.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openCollectModal(sale)}
                            className="h-9 px-3.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <DollarSign className="h-4 w-4" />
                            <span>Collect Due</span>
                          </button>

                          <button
                            onClick={() => openInvoiceModal(sale)}
                            className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                            title="View Invoice & Purchased Medicines"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-500" />
                            <span>Invoice</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer hover:border-brand-primary transition"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Showing <span className="font-bold text-slate-900 dark:text-white">{totalCount === 0 ? 0 : (page - 1) * limit + 1}</span> to{" "}
              <span className="font-bold text-slate-900 dark:text-white">{Math.min(page * limit, totalCount)}</span> of{" "}
              <span className="font-bold text-slate-900 dark:text-white">{totalCount}</span> due sales
            </div>
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={limit}
            onPageChange={setPage}
            showDetails={false}
            alwaysShow={true}
            className="border-t-0 p-0 bg-transparent"
          />
        </div>
      </div>

      {/* ================= MODAL: COLLECT DUE ================= */}
      {collectModalOpen && collectSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-primary/10 text-brand-primary rounded-2xl">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Collect Due Payment
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Receipt #{collectSale.receiptNo} • {collectSale.customerName || "Walk-in Customer"}
                  </p>
                </div>
              </div>
              <button
                onClick={closeCollectModal}
                disabled={collectSubmitting}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCollectDueSubmit} className="p-6 space-y-5">
              {/* Due Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 font-bold">
                  <span>Total Bill:</span>
                  <span className="font-mono text-slate-900 dark:text-white">৳{Number(collectSale.totalAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 font-bold">
                  <span>Already Paid:</span>
                  <span className="font-mono text-emerald-600">৳{Number(collectSale.paidAmount).toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm font-black">
                  <span className="text-brand-primary">Remaining Due:</span>
                  <span className="font-mono text-brand-primary text-base">
                    ৳{Number(collectSale.dueAmount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Error Alert */}
              {collectError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{collectError}</span>
                </div>
              )}

              {/* Amount to Collect Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Amount to Collect (৳) <span className="text-brand-primary">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCollectAmount(String(Number(collectSale.dueAmount)))}
                    className="text-xs font-bold text-brand-primary hover:underline cursor-pointer"
                  >
                    Pay Full Due (৳{Number(collectSale.dueAmount).toFixed(2)})
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={Number(collectSale.dueAmount)}
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    required
                    className="w-full h-12 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-base font-black text-slate-900 dark:text-white outline-none focus:border-brand-primary transition font-mono"
                    placeholder="Enter collected amount"
                  />
                </div>
              </div>

              {/* Financial Accounts from Accounts & Finance */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Deposit To Financial Account <span className="text-brand-primary">*</span>
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">
                    Accounts & Finance
                  </span>
                </div>

                {loadingAccounts && financialAccounts.length === 0 ? (
                  <div className="py-6 flex items-center justify-center text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span>Loading financial accounts...</span>
                  </div>
                ) : financialAccounts.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-800 dark:text-amber-300 space-y-1">
                    <div className="font-black text-amber-900 dark:text-amber-200">No active financial accounts found!</div>
                    <p className="font-normal text-amber-700 dark:text-amber-400">
                      Please go to Accounts & Finance &gt; Financial Accounts to create a Cash, Bank, or Mobile Banking account first.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {financialAccounts.map((acc) => {
                      const isSelected = selectedAccountId === acc.id;
                      const typeUpper = (acc.type || "").toUpperCase();
                      const isBank = typeUpper === "BANK";
                      const isMobile = typeUpper === "MOBILE_BANKING" || typeUpper === "MOBILE";
                      const isCard = typeUpper === "CARD_SETTLEMENT" || typeUpper === "CARD";
                      
                      const Icon = isBank ? Landmark : isMobile ? Smartphone : isCard ? CreditCard : Wallet;

                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => setSelectedAccountId(acc.id)}
                          className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex items-start justify-between gap-2 ${
                            isSelected
                              ? "bg-brand-primary/10 border-brand-primary ring-1 ring-brand-primary/30"
                              : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div
                              className={`p-2 rounded-xl shrink-0 ${
                                isSelected
                                  ? "bg-brand-primary text-white"
                                  : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                                {acc.name}
                              </div>
                              <div className="text-[11px] font-mono text-slate-500 truncate">
                                {acc.accountNumber ? `A/C: ${acc.accountNumber}` : acc.bankName || acc.type}
                              </div>
                              <div className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                                Bal: ৳{Number(acc.balance || 0).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-brand-primary shrink-0 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Optional Reference or TrxID for Bank/Mobile Banking */}
              {(() => {
                const selectedAcc = financialAccounts.find((a) => a.id === selectedAccountId);
                const typeUpper = (selectedAcc?.type || "").toUpperCase();
                const isNonCash =
                  selectedAcc &&
                  (typeUpper === "BANK" ||
                    typeUpper === "MOBILE_BANKING" ||
                    typeUpper === "MOBILE" ||
                    typeUpper === "CARD_SETTLEMENT" ||
                    typeUpper === "CARD");

                if (!isNonCash) return null;

                return (
                  <div className="space-y-1 animate-in fade-in">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Transaction ID / Cheque # / TrxID (Optional)
                    </label>
                    <input
                      type="text"
                      value={collectTransactionRef}
                      onChange={(e) => setCollectTransactionRef(e.target.value)}
                      placeholder="e.g. TRX-90284 or Cheque #10294"
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand-primary transition"
                    />
                  </div>
                );
              })()}

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  placeholder="e.g. Paid in full by customer's brother"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand-primary"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeCollectModal}
                  disabled={collectSubmitting}
                  className="h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={collectSubmitting || loadingAccounts || (!selectedAccountId && financialAccounts.length > 0)}
                  className="h-11 px-6 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-black transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {collectSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Confirm Collection</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: VIEW INVOICE & MEDICINES ================= */}
      {invoiceModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
                  <Receipt className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Invoice Details & Medicines
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Receipt #{selectedSale.receiptNo}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="h-9 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-brand-primary" />
                  <span>Print</span>
                </button>
                <button
                  onClick={closeInvoiceModal}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Customer & Branch Details Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block">Customer</span>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedSale.customerName || "Walk-in Customer"}
                  </div>
                  {selectedSale.customerPhone && (
                    <div className="text-slate-500 font-mono">{selectedSale.customerPhone}</div>
                  )}
                </div>

                <div className="space-y-1 text-right">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block">Sale Date & Time</span>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {new Date(selectedSale.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  <div className="text-slate-400 font-mono">
                    {new Date(selectedSale.createdAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>

              {/* Purchased Items List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  Purchased Items & Medicines
                </h4>
                <div className="border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black">
                      <tr>
                        <th className="py-2.5 px-4">Medicine / Product</th>
                        <th className="py-2.5 px-3 text-center">Batch</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Price</th>
                        <th className="py-2.5 px-4 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedSale.items && selectedSale.items.length > 0 ? (
                        selectedSale.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                              {it.product?.name || "Medicine Item"}
                              {it.product?.unit && (
                                <span className="text-[11px] text-slate-400 font-normal ml-1">
                                  ({it.unitType || it.product.unit})
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                              {it.batchNumber || "—"}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                              {it.quantity}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                              ৳{Number(it.unitPrice).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                              ৳{Number(it.subTotal).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">
                            No individual line item records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold">৳{Number(selectedSale.subTotal || selectedSale.totalAmount).toFixed(2)}</span>
                </div>
                {Number(selectedSale.discount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span className="font-mono font-bold">-৳{Number(selectedSale.discount).toFixed(2)}</span>
                  </div>
                )}
                {Number(selectedSale.tax || 0) > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Tax/VAT:</span>
                    <span className="font-mono font-bold">+৳{Number(selectedSale.tax).toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-sm">
                  <span className="text-slate-900 dark:text-white">Total Amount:</span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    ৳{Number(selectedSale.totalAmount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Paid Amount:</span>
                  <span className="font-mono">৳{Number(selectedSale.paidAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-brand-primary font-black text-sm pt-1 border-t border-brand-primary/20">
                  <span>Outstanding Due:</span>
                  <span className="font-mono">৳{Number(selectedSale.dueAmount).toFixed(2)}</span>
                </div>
              </div>

              {/* Notes or Prescription Reference */}
              {selectedSale.notes && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-bold">Remarks: </span>
                  <span>{selectedSale.notes}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-xs text-slate-400 font-medium">
                Branch: {selectedSale.branch?.name || "Main Branch"}
              </span>
              <button
                onClick={() => {
                  closeInvoiceModal();
                  openCollectModal(selectedSale);
                }}
                className="h-10 px-5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <DollarSign className="h-4 w-4" />
                <span>Collect Due Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
