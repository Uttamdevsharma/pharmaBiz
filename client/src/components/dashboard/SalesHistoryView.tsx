"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { OwnerModule } from "./DashboardSidebar";
import { Pagination } from "@/components/common/Pagination";
import { offlineDb } from "@/lib/offlineDb";
import {
  History,
  Search,
  Calendar,
  Filter,
  RefreshCw,
  Loader2,
  Receipt,
  Printer,
  Eye,
  Store,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Clock,
  UserCheck,
} from "lucide-react";
import { useBranchContext } from "@/context/BranchContext";

export function formatPaymentMethod(pm?: string, notes?: string, bankName?: string): string {
  const u = (pm || "").toUpperCase();
  const text = `${notes || ""} ${bankName || ""}`.toLowerCase();
  if (u === "BKASH" || u.includes("BKASH") || text.includes("bkash")) return "bKash";
  if (u === "NAGAD" || u.includes("NAGAD") || text.includes("nagad")) return "Nagad";
  if (u === "CARD" || u.includes("CREDIT") || u.includes("DEBIT")) return "Card";
  if (u === "BANK") return "Bank";
  if (u === "CASH") return "Cash";
  if (u === "MOBILE") return "Mobile Banking";
  return pm || "Cash";
}

interface SalesHistoryViewProps {
  onNavigate?: (module: OwnerModule) => void;
  selectedBranchId?: string;
}

interface SaleRecord {
  id: string;
  receiptNo: string;
  createdAt: string;
  customerName?: string | null;
  customerPhone?: string | null;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  discount: number;
  tax: number;
  paymentMethod: string;
  bankName?: string | null;
  transactionRef?: string | null;
  status: string;
  notes?: string | null;
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
let cachedSalesRecords: SaleRecord[] = [];
let cachedSalesTotalPages = 1;
let cachedSalesTotalCount = 0;

export function SalesHistoryView({ selectedBranchId: propBranchId, onNavigate }: SalesHistoryViewProps = {}) {
  const { user: authUser } = useAuth();
  const { selectedBranchId: contextBranchId, currentBranch, isAllBranches } = useBranchContext();
  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;

  const [sales, setSales] = useState<SaleRecord[]>(() => cachedSalesRecords);
  const [loading, setLoading] = useState(() => cachedSalesRecords.length === 0);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const [periodPreset, setPeriodPreset] = useState<"today" | "yesterday" | "last7Days" | "thisMonth" | "all" | "custom">("today");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Debounce search input for instant live filtering
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Sale for View/Print Modal
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openSaleModal = async (sale: SaleRecord) => {
    setSelectedSale(sale);
    setReceiptData(null);
    setModalOpen(true);
    try {
      const res = await fetchApi<any>(`/sales/${sale.id}/receipt`);
      if (res.success && res.data) {
        setReceiptData(res.data);
      }
    } catch (e) {
      console.warn("Could not load receipt data:", e);
    }
  };

  const closeSaleModal = () => {
    setModalOpen(false);
    setSelectedSale(null);
    setReceiptData(null);
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const printReceipt = () => {
    window.print();
  };

  useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        printReceipt();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, selectedSale, receiptData]);

  const loadSales = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
      if (paymentMethod) params.append("paymentMethod", paymentMethod);
      if (paymentStatus) params.append("paymentStatus", paymentStatus);
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
        cachedSalesRecords = list;
        const pagination = (res as any).pagination || res.meta;
        if (pagination) {
          const tp = pagination.totalPages || 1;
          const tc = pagination.total || 0;
          setTotalPages(tp);
          setTotalCount(tc);
          cachedSalesTotalPages = tp;
          cachedSalesTotalCount = tc;
        }
      }
    } catch (err) {
      console.error("Failed to load sales history", err);
      // Fallback to offline cached / pending sales if network unavailable
      try {
        const pending = await offlineDb.getPendingSales(
          effectiveBranchId && effectiveBranchId !== "all" ? effectiveBranchId : undefined
        );
        if (pending && pending.length > 0) {
          const mapped = pending.map((p) => ({
            id: p.localId,
            receiptNo: p.receiptNo,
            createdAt: p.localCreatedAt,
            customerName: p.customerName,
            customerPhone: p.customerPhone,
            totalAmount: p.totalAmount,
            paidAmount: p.paidAmount,
            dueAmount: p.dueAmount || 0,
            discount: p.discount,
            tax: p.tax,
            paymentMethod: p.paymentMethod,
            bankName: p.bankName,
            notes: p.notes,
            status: "OFFLINE_PENDING",
            items: p.items.map((it) => ({
              id: it.productId,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              subTotal: it.subTotal,
              product: { id: it.productId, name: it.name || "Product", sku: "" },
            })),
          }));
          setSales(mapped as any);
          setTotalPages(1);
          setTotalCount(mapped.length);
        }
      } catch (offlineErr) {
        console.warn("Could not read offline sales:", offlineErr);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [page, limit, periodPreset, startDate, endDate, paymentMethod, paymentStatus, debouncedSearch, effectiveBranchId]);

  const handlePeriodPreset = (preset: "today" | "yesterday" | "last7Days" | "thisMonth" | "all" | "custom") => {
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
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadSales();
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
            <History className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Sales History
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate("pos")}
              className="h-11 px-5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-black shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <span>+ New POS Sale</span>
            </button>
          )}

          <button
            onClick={() => loadSales(true)}
            disabled={refreshing}
            className="h-11 px-5 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-sm font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-brand-primary" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        {/* Date Presets Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider mr-1">Timeframe:</span>
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "last7Days", label: "Last 7 Days" },
              { id: "thisMonth", label: "This Month" },
              { id: "all", label: "All Time" },
              { id: "custom", label: "Custom Range" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePeriodPreset(p.id as any)}
                className={`h-10 px-4 rounded-xl text-sm font-bold transition cursor-pointer ${
                  periodPreset === p.id
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date range pickers */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3.5 h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriodPreset("custom");
              }}
              className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodPreset("custom");
              }}
              className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Search & Channel Filters Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 w-full">
            <Search className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by receipt # (e.g. REC-12345), customer name, or phone..."
              className="w-full h-12 pl-11 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-brand-primary transition"
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

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
            {/* Payment Status Filter (Paid / Due) */}
            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setPage(1);
              }}
              className="h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer focus:border-brand-primary transition shrink-0"
            >
              <option value="">All Status (Paid & Due)</option>
              <option value="PAID">Fully Paid Only</option>
              <option value="DUE">Has Due Only</option>
            </select>

            {/* Payment Method Filter */}
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPage(1);
              }}
              className="h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer focus:border-brand-primary transition shrink-0"
            >
              <option value="">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="BKASH">bKash</option>
              <option value="NAGAD">Nagad</option>
              <option value="BANK">Bank / Card</option>
            </select>

            {/* Active Branch Scope Badge */}
            <div className="flex items-center gap-2 h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 shrink-0">
              <Store className="h-4 w-4 text-brand-primary" />
              <span>Scope:</span>
              <span className="font-black text-slate-900 dark:text-white">
                {isAllBranches ? "All Branches" : (currentBranch?.name || "Selected Branch")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading && sales.length === 0 ? (
          <div className="table-responsive-container">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-wider border-b-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-4 px-5">Date & Time</th>
                  <th className="py-4 px-4">Branch</th>
                  <th className="py-4 px-4">Customer</th>
                  <th className="py-4 px-4">Payment Method</th>
                  <th className="py-4 px-4 text-right">Total (৳)</th>
                  <th className="py-4 px-4 text-right">Paid (৳)</th>
                  <th className="py-4 px-4 text-right">Due (৳)</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 animate-pulse">
                {[...Array(6)].map((_, i) => (
                  <tr key={i} className="h-16">
                    <td className="py-4 px-5"><div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" /></td>
                    <td className="py-4 px-4 text-right"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded ml-auto" /></td>
                    <td className="py-4 px-4 text-right"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded ml-auto" /></td>
                    <td className="py-4 px-4 text-right"><div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded ml-auto" /></td>
                    <td className="py-4 px-4 text-center"><div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto" /></td>
                    <td className="py-4 px-5 text-center"><div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded mx-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : sales.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Receipt className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-base font-bold text-slate-700 dark:text-slate-300">
              No sales transactions found.
            </p>
            <p className="text-xs text-slate-400">Try adjusting your date range or search filters.</p>
          </div>
        ) : (
          <div className="table-responsive-container">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-wider border-b-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-4 px-5">Date & Time</th>
                  <th className="py-4 px-4">Branch</th>
                  <th className="py-4 px-4">Customer</th>
                  <th className="py-4 px-4">Payment Method</th>
                  <th className="py-4 px-4 text-right">Total (৳)</th>
                  <th className="py-4 px-4 text-right">Paid (৳)</th>
                  <th className="py-4 px-4 text-right">Due (৳)</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sales.map((sale) => {
                  const displayMethod = formatPaymentMethod(
                    sale.paymentMethod,
                    sale.notes || undefined,
                    sale.bankName || undefined
                  );
                  const isBkash = displayMethod === "bKash";
                  const isNagad = displayMethod === "Nagad";
                  const isCash = displayMethod === "Cash";
                  const isCard = displayMethod === "Card";
                  const isBank = displayMethod === "Bank";
                  const isDue = Number(sale.dueAmount || 0) > 0;

                  return (
                    <tr
                      key={sale.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition"
                    >
                      {/* Date & Time with subtle Receipt # */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="text-slate-900 dark:text-white text-sm font-black">
                          {new Date(sale.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-slate-400 font-mono font-medium flex items-center gap-1.5 mt-0.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {new Date(sale.createdAt).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="text-brand-primary font-bold">{sale.receiptNo}</span>
                        </div>
                      </td>

                      {/* Branch */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                            <Store className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {sale.branch?.name || "Main Branch"}
                          </span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-4 px-4">
                        <div className="text-slate-900 dark:text-white text-sm font-black truncate max-w-[180px]">
                          {sale.customerName || "Walk-in Customer"}
                        </div>
                        {sale.customerPhone && (
                          <div className="text-xs text-slate-500 font-mono font-medium mt-0.5">
                            {sale.customerPhone}
                          </div>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black ${
                            isCash
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : isBkash
                              ? "bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300"
                              : isNagad
                              ? "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300"
                              : isCard
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                              : isBank
                              ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                              : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {isCash ? (
                            <Banknote className="h-3.5 w-3.5" />
                          ) : isBkash || isNagad ? (
                            <Smartphone className="h-3.5 w-3.5" />
                          ) : (
                            <CreditCard className="h-3.5 w-3.5" />
                          )}
                          <span>{displayMethod}</span>
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="py-4 px-4 text-right font-mono font-black text-base text-slate-900 dark:text-white whitespace-nowrap">
                        ৳{Number(sale.totalAmount || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-4 px-4 text-right font-mono font-bold text-base text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        ৳{Number(sale.paidAmount || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Due Amount */}
                      <td className="py-4 px-4 text-right font-mono font-black text-base whitespace-nowrap">
                        {isDue ? (
                          <span className="text-rose-600 dark:text-rose-400">
                            ৳{Number(sale.dueAmount || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">৳0.00</span>
                        )}
                      </td>

                      {/* Payment Status (Paid / Due) */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {isDue ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                            Due
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Paid
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-center whitespace-nowrap">
                        <button
                          onClick={() => openSaleModal(sale)}
                          className="h-9 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 mx-auto cursor-pointer"
                        >
                          <Eye className="h-4 w-4 text-brand-primary" />
                          <span>View Invoice</span>
                        </button>
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
              <span className="font-bold text-slate-900 dark:text-white">{totalCount}</span> sales
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

      {/* Invoice Details & Thermal Print Modal */}
      {mounted && modalOpen && selectedSale && createPortal(
        <div className="print-portal fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:static print:inset-auto print:bg-white print:p-0 print:m-0 print:block print:w-full">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh] printable-document print-invoice-card print:rounded-none print:shadow-none print:border-none print:max-w-full print:w-full print:text-black print:max-h-none print:overflow-visible print:m-0 print:p-0">
            {/* Modal Control Bar */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                <CheckCircle2 className="h-5 w-5" /> Sale Receipt
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={printReceipt}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow hover:bg-emerald-700 cursor-pointer"
                >
                  <Printer className="h-4 w-4" /> Print Receipt
                </button>
                <button
                  onClick={closeSaleModal}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Receipt Document */}
            <div className="p-6 sm:p-8 space-y-5 overflow-y-auto print:max-h-none print:overflow-visible print:p-0 print:space-y-6 text-slate-800 dark:text-slate-200 print:text-black">
              {/* Pharmacy & Branch Header */}
              <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900 dark:border-slate-100 print:border-black">
                {(receiptData?.pharmacy?.logoUrl || authUser?.tenant?.logoUrl) && (
                  <div className="flex justify-center mb-2">
                    <img
                      src={receiptData?.pharmacy?.logoUrl || authUser?.tenant?.logoUrl || ""}
                      alt="Pharmacy logo"
                      className="h-16 sm:h-20 object-contain print:h-20 max-w-[240px]"
                    />
                  </div>
                )}
                <h2 className="font-black text-2xl sm:text-3xl print:text-3xl uppercase tracking-tight text-slate-900 dark:text-white print:text-black">
                  {receiptData?.pharmacy?.name || authUser?.tenant?.name || "Shapla Pharmacy"}
                </h2>
                {(selectedSale.branch?.name || receiptData?.invoice?.branch) && (
                  <p className="text-sm sm:text-base print:text-base text-emerald-800 dark:text-emerald-400 print:text-black font-bold">
                    Branch: {selectedSale.branch?.name || receiptData?.invoice?.branch} {selectedSale.branch?.location ? `(${selectedSale.branch.location})` : ""}
                  </p>
                )}
                <p className="text-xs sm:text-sm print:text-sm text-emerald-700 dark:text-emerald-400 print:text-black font-bold italic">
                  Thank you for shopping with us. Get well soon!
                </p>
                <p className="text-xs sm:text-sm print:text-sm text-slate-600 dark:text-slate-300 print:text-black font-medium">
                  {(receiptData?.pharmacy?.phone || authUser?.tenant?.phone) ? `Tel: ${receiptData?.pharmacy?.phone || authUser?.tenant?.phone}` : ""}
                  {(receiptData?.pharmacy?.phone || authUser?.tenant?.phone) && (receiptData?.pharmacy?.email || authUser?.tenant?.email) ? " | " : ""}
                  {(receiptData?.pharmacy?.email || authUser?.tenant?.email) ? `Email: ${receiptData?.pharmacy?.email || authUser?.tenant?.email}` : ""}
                </p>
              </div>

              {/* Invoice Meta Grid */}
              <div className="flex justify-between text-xs sm:text-sm print:text-sm pb-4 border-b-2 border-slate-900 dark:border-slate-100 print:border-black font-medium leading-relaxed">
                <div className="space-y-1">
                  <div>
                    <span className="font-bold text-slate-500 print:text-black">Invoice #: </span>
                    <span className="font-mono font-bold text-sm sm:text-base print:text-base">{selectedSale.receiptNo}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 print:text-black">Customer: </span>
                    <span className="font-bold text-slate-900 dark:text-white print:text-black">{selectedSale.customerName || "Walk-in Customer"}</span>
                  </div>
                  {selectedSale.customerPhone && (
                    <div>
                      <span className="font-bold text-slate-500 print:text-black">Phone: </span>
                      <span className="font-mono">{selectedSale.customerPhone}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-slate-500 print:text-black">Cashier: </span>
                    {selectedSale.user?.name || "Staff"}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div>
                    <span className="font-bold text-slate-500 print:text-black">Date: </span>
                    {new Date(selectedSale.createdAt).toLocaleDateString("en-BD", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 print:text-black">Time: </span>
                    {new Date(selectedSale.createdAt).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 print:text-black">Payment Method: </span>
                    <span className="font-bold text-slate-900 dark:text-white print:text-black">
                      {formatPaymentMethod(selectedSale.paymentMethod, selectedSale.notes || undefined, selectedSale.bankName || undefined)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="table-responsive-container print:overflow-visible">
                <table className="w-full min-w-[480px] print:min-w-0 text-xs sm:text-sm print:text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-900 dark:border-slate-100 print:border-black uppercase text-xs font-bold text-slate-700 dark:text-slate-300 print:text-black">
                      <th className="pb-2 text-left w-8">#</th>
                      <th className="pb-2 text-left">Medicine / Product</th>
                      <th className="pb-2 text-center">Batch</th>
                      <th className="pb-2 text-center">Unit</th>
                      <th className="pb-2 text-center">Qty</th>
                      <th className="pb-2 text-right">Unit Price</th>
                      <th className="pb-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 print:divide-slate-300 font-medium">
                    {(selectedSale.items || []).map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 print:border-slate-200">
                        <td className="py-2.5 text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className="py-2.5 font-bold text-slate-900 dark:text-white print:text-black">
                          {item.product?.name || item.name || "Product"}
                          {item.product?.genericName && (
                            <div className="text-[11px] print:text-xs text-slate-500 print:text-slate-700 font-medium">
                              {item.product.genericName}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 text-center text-slate-600 print:text-black font-mono text-xs">{item.batchNumber || "—"}</td>
                        <td className="py-2.5 text-center text-slate-600 print:text-black">{item.unitType || item.product?.unit || "Pc"}</td>
                        <td className="py-2.5 text-center font-bold">{item.quantity}</td>
                        <td className="py-2.5 text-right font-mono">৳{Number(item.unitPrice || 0).toFixed(2)}</td>
                        <td className="py-2.5 text-right font-bold font-mono">৳{Number(item.subTotal || (item.unitPrice * item.quantity) || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Invoice Totals */}
              <div className="pt-3 border-t-2 border-slate-900 dark:border-slate-100 print:border-black space-y-1.5 text-xs sm:text-sm print:text-sm font-medium">
                <div className="flex justify-between text-slate-600 print:text-black">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold">
                    ৳{Number((selectedSale.items || []).reduce((acc: number, it: any) => acc + Number(it.subTotal || 0), 0) || selectedSale.totalAmount || 0).toFixed(2)}
                  </span>
                </div>
                {Number(selectedSale.discount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600 print:text-black font-bold">
                    <span>Discount:</span>
                    <span className="font-mono">-৳{Number(selectedSale.discount).toFixed(2)}</span>
                  </div>
                )}
                {Number(selectedSale.tax || 0) > 0 && (
                  <div className="flex justify-between text-slate-600 print:text-black">
                    <span>VAT / Tax:</span>
                    <span className="font-mono font-bold">+৳{Number(selectedSale.tax).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-base sm:text-lg print:text-xl text-slate-900 dark:text-white print:text-black pt-2 border-t border-slate-300 print:border-black">
                  <span>Grand Total:</span>
                  <span className="font-mono">৳{Number(selectedSale.totalAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400 print:text-black">
                  <span>Paid Amount:</span>
                  <span className="font-mono font-bold">৳{Number(selectedSale.paidAmount || 0).toFixed(2)}</span>
                </div>
                {Number(selectedSale.dueAmount || 0) > 0 && (
                  <div className="flex justify-between font-bold text-rose-600 print:text-black">
                    <span>Due Amount:</span>
                    <span className="font-mono">৳{Number(selectedSale.dueAmount).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Footer Policy */}
              <div className="pt-3 border-t border-dashed border-slate-300 print:border-black text-center text-xs print:text-sm text-slate-500 print:text-black italic">
                Items can be returned within 48 hours with original invoice and valid prescription.
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
