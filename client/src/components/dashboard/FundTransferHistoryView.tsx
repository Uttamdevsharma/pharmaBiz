"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import {
  History,
  ArrowLeftRight,
  Wallet,
  Calendar,
  Search,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Printer,
  X,
  Building2,
  Store,
  CheckCircle2,
} from "lucide-react";

interface FinancialTransaction {
  id: string;
  type: string;
  amount: number;
  reference?: string | null;
  note?: string | null;
  createdAt: string;
  branch?: {
    id: string;
    name: string;
  } | null;
  tenant?: {
    id?: string;
    name?: string;
    address?: string;
    phone?: string;
  } | null;
  sourceAccount?: {
    id: string;
    name: string;
    type: string;
    branchId?: string | null;
    branch?: { name: string } | null;
  } | null;
  destinationAccount?: {
    id: string;
    name: string;
    type: string;
    branchId?: string | null;
    branch?: { name: string } | null;
  } | null;
  user?: {
    id: string;
    name?: string | null;
    username?: string | null;
    role?: string | null;
  } | null;
}

interface FundTransferHistoryViewProps {
  onNavigate?: (module: OwnerModule) => void;
}

type DatePreset = "ALL" | "TODAY" | "YESTERDAY" | "THIS_MONTH" | "THIS_YEAR" | "CUSTOM";

function numberToWordsBDT(num: number): string {
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen ",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const n = Math.floor(Math.abs(num));
  if (n === 0) return "Zero Taka Only";

  const numStr = ("000000000" + n).substr(-9);
  const crore = parseInt(numStr.substr(0, 2), 10);
  const lakh = parseInt(numStr.substr(2, 2), 10);
  const thousand = parseInt(numStr.substr(4, 2), 10);
  const hundred = parseInt(numStr.substr(6, 1), 10);
  const rest = parseInt(numStr.substr(7, 2), 10);

  let str = "";
  if (crore > 0) str += (crore < 20 ? a[crore] : b[Math.floor(crore / 10)] + " " + a[crore % 10]) + "Crore ";
  if (lakh > 0) str += (lakh < 20 ? a[lakh] : b[Math.floor(lakh / 10)] + " " + a[lakh % 10]) + "Lakh ";
  if (thousand > 0) str += (thousand < 20 ? a[thousand] : b[Math.floor(thousand / 10)] + " " + a[thousand % 10]) + "Thousand ";
  if (hundred > 0) str += a[hundred] + "Hundred ";
  if (rest > 0) str += (rest < 20 ? a[rest] : b[Math.floor(rest / 10)] + " " + a[rest % 10]);

  return `${str.trim()} Taka Only`;
}

function HistorySkeleton() {
  return (
    <div className="space-y-4 w-full animate-pulse">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="h-7 w-48 bg-slate-200 dark:bg-slate-800 rounded-none" />
        <div className="flex gap-2">
          <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 rounded-none" />
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-none" />
        </div>
      </div>
      <div className="h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none" />
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-none space-y-2">
        <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-none" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-11 bg-slate-50 dark:bg-slate-800/60 rounded-none" />
        ))}
      </div>
    </div>
  );
}

export function FundTransferHistoryView({ onNavigate }: FundTransferHistoryViewProps) {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>("THIS_MONTH");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Voucher Print Modal State
  const [voucherModalTrx, setVoucherModalTrx] = useState<FinancialTransaction | null>(null);

  // Compute actual date strings based on preset
  const computeDateRange = useCallback((preset: DatePreset) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === "TODAY") {
      const today = fmt(now);
      return { start: today, end: today };
    }
    if (preset === "YESTERDAY") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = fmt(y);
      return { start: yStr, end: yStr };
    }
    if (preset === "THIS_MONTH") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: fmt(first), end: fmt(last) };
    }
    if (preset === "THIS_YEAR") {
      const first = new Date(now.getFullYear(), 0, 1);
      const last = new Date(now.getFullYear(), 11, 31);
      return { start: fmt(first), end: fmt(last) };
    }
    if (preset === "CUSTOM") {
      return { start: startDate, end: endDate };
    }
    return { start: "", end: "" };
  }, [startDate, endDate]);

  const loadTransactions = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      params.append("type", "TRANSFER");

      const { start, end } = computeDateRange(datePreset);
      if (start) params.append("startDate", start);
      if (end) params.append("endDate", end);

      params.append("page", String(page));
      params.append("limit", String(limit));

      const res = await fetchApi<{ data: FinancialTransaction[]; meta: { total: number; page: number } }>(
        `/accounting/transactions?${params.toString()}`
      );

      if (res.success && res.data) {
        if (Array.isArray(res.data)) {
          setTransactions(res.data);
          setTotalCount(res.data.length);
        } else if (res.data.data && Array.isArray(res.data.data)) {
          setTransactions(res.data.data);
          setTotalCount(res.data.meta?.total || res.data.data.length);
        }
      }
    } catch (err) {
      console.error("Failed to load transfer history", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [datePreset, computeDateRange, page, limit]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handlePresetClick = (preset: DatePreset) => {
    setDatePreset(preset);
    setPage(1);
    if (preset !== "CUSTOM") {
      setStartDate("");
      setEndDate("");
    }
  };

  // Client-side text search
  const filteredList = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter((t) => {
      const src = (t.sourceAccount?.name || "").toLowerCase();
      const dst = (t.destinationAccount?.name || "").toLowerCase();
      const ref = (t.reference || "").toLowerCase();
      const note = (t.note || "").toLowerCase();
      const user = (t.user?.name || t.user?.username || "").toLowerCase();
      return src.includes(q) || dst.includes(q) || ref.includes(q) || note.includes(q) || user.includes(q);
    });
  }, [transactions, search]);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <History className="h-5 w-5 text-emerald-600" />
          Fund Transfer History
        </h1>

        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("acc_fund_transfer")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition rounded-none cursor-pointer"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              New Transfer
            </button>
          )}

          <button
            type="button"
            onClick={() => loadTransactions(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-none flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {(["ALL", "TODAY", "YESTERDAY", "THIS_MONTH", "THIS_YEAR", "CUSTOM"] as DatePreset[]).map((p) => {
            const active = datePreset === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => handlePresetClick(p)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-none border transition cursor-pointer ${
                  active
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {p === "THIS_MONTH" ? "This Month" : p === "THIS_YEAR" ? "This Year" : p.charAt(0) + p.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>

        {datePreset === "CUSTOM" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs rounded-none outline-none text-slate-900 dark:text-white"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs rounded-none outline-none text-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => {
                setPage(1);
                loadTransactions();
              }}
              className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded-none hover:bg-emerald-700 transition"
            >
              Apply
            </button>
          </div>
        )}

        <div className="relative min-w-[200px]">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search transfer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs rounded-none outline-none text-slate-900 dark:text-white focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-xs sm:text-sm">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-600" />
            Loading transfer records...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs sm:text-sm">
            No transfer records found for the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/75 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">SL</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">From (Source)</th>
                  <th className="py-3 px-4">To (Destination)</th>
                  <th className="py-3 px-4">Transferred By</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center w-28">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
                {filteredList.map((trx, index) => {
                  const sl = (page - 1) * limit + index + 1;
                  const srcBranch = trx.sourceAccount?.branch?.name || (trx.sourceAccount?.type === "CASH" ? "Branch Cash" : "Central");
                  const dstBranch = trx.destinationAccount?.branch?.name || (trx.destinationAccount?.type === "CASH" ? "Branch Cash" : "Central");

                  return (
                    <tr
                      key={trx.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-center text-xs text-slate-400">
                        {sl}
                      </td>

                      <td className="py-3 px-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono">
                        {new Date(trx.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {trx.sourceAccount?.name || "Source Account"}
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {srcBranch}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {trx.destinationAccount?.name || "Destination Account"}
                        </div>
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                          {dstBranch}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                        <div className="font-semibold">{trx.user?.name || trx.user?.username || "Staff"}</div>
                        <div className="text-[10px] text-slate-400 uppercase">{trx.user?.role?.replace("_", " ") || "USER"}</div>
                      </td>

                      <td className="py-3 px-4 text-right font-bold font-mono text-slate-900 dark:text-white whitespace-nowrap">
                        ৳{Number(trx.amount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setVoucherModalTrx(trx)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 transition rounded-none cursor-pointer shadow-2xs"
                          title="Print Transfer Receipt Voucher"
                        >
                          <Printer className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Voucher</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/75 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-xs sm:text-sm">
          <div className="text-slate-500">
            Page <span className="font-semibold text-slate-800 dark:text-slate-200">{page}</span> of{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs rounded-none outline-none text-slate-700 dark:text-slate-200"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MONEY TRANSFER RECEIPT / VOUCHER PRINT MODAL                              */}
      {/* ========================================================================= */}
      {voucherModalTrx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none w-full max-w-2xl shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Money Transfer Voucher Preview
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-none cursor-pointer shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Receipt
                </button>
                <button
                  type="button"
                  onClick={() => setVoucherModalTrx(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-none cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Sheet Container */}
            <div className="p-6 bg-slate-100 dark:bg-slate-950 overflow-y-auto max-h-[75vh]">
              <div
                id="printable-voucher-sheet"
                className="bg-white text-black p-8 border border-slate-300 shadow-sm max-w-xl mx-auto space-y-6 text-sm"
              >
                {/* Store Header */}
                <div className="text-center pb-4 border-b-2 border-black/80 space-y-1">
                  <h2 className="text-xl font-black uppercase tracking-wide">
                    {voucherModalTrx.tenant?.name || "PHARMACY MANAGEMENT"}
                  </h2>
                  <div className="text-xs text-slate-600">
                    {voucherModalTrx.tenant?.address || "Main Branch & Pharmacy Outlets"}
                  </div>
                  {voucherModalTrx.tenant?.phone && (
                    <div className="text-xs text-slate-600 font-mono">
                      Phone: {voucherModalTrx.tenant.phone}
                    </div>
                  )}
                  <div className="pt-2">
                    <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-black uppercase tracking-widest">
                      Debit / Credit Fund Transfer Voucher
                    </span>
                  </div>
                </div>

                {/* Voucher Meta Info */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-slate-500 block">Voucher No:</span>
                    <span className="font-mono font-bold text-sm">
                      {voucherModalTrx.reference || voucherModalTrx.id.slice(0, 12).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-500 block">Date & Time:</span>
                    <span className="font-mono font-bold">
                      {new Date(voucherModalTrx.createdAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Transfer Details Table */}
                <div className="border border-black">
                  <table className="w-full text-xs text-left border-collapse">
                    <tbody>
                      <tr className="border-b border-black bg-slate-50">
                        <td className="p-2.5 font-bold w-1/3 border-r border-black">From Account (উৎস):</td>
                        <td className="p-2.5 font-semibold">
                          <div>{voucherModalTrx.sourceAccount?.name || "Source Account"}</div>
                          <div className="text-[11px] text-slate-600 font-mono">
                            Branch: {voucherModalTrx.sourceAccount?.branch?.name || voucherModalTrx.branch?.name || "Central / Main"}
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-2.5 font-bold border-r border-black">To Account (গন্তব্য):</td>
                        <td className="p-2.5 font-semibold">
                          <div>{voucherModalTrx.destinationAccount?.name || "Destination Account"}</div>
                          <div className="text-[11px] text-slate-600 font-mono">
                            Branch: {voucherModalTrx.destinationAccount?.branch?.name || "Central / Owner Account"}
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-black bg-slate-50">
                        <td className="p-2.5 font-bold border-r border-black">Transfer Amount (টাকা):</td>
                        <td className="p-2.5 font-mono font-black text-base">
                          ৳{Number(voucherModalTrx.amount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-2.5 font-bold border-r border-black">Amount in Words:</td>
                        <td className="p-2.5 font-semibold italic text-slate-800">
                          {numberToWordsBDT(Number(voucherModalTrx.amount))}
                        </td>
                      </tr>
                      {voucherModalTrx.note && (
                        <tr>
                          <td className="p-2.5 font-bold border-r border-black">Note / Purpose:</td>
                          <td className="p-2.5 text-slate-700">
                            {voucherModalTrx.note}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Side-by-Side Signatures */}
                <div className="pt-12 grid grid-cols-2 gap-8 text-xs">
                  {/* Left: Sender Signature */}
                  <div className="text-center">
                    <div className="border-t border-black pt-1.5 font-bold">
                      {voucherModalTrx.user?.name || voucherModalTrx.user?.username || "Staff / Branch Manager"}
                    </div>
                    <div className="text-[10px] text-slate-600 uppercase font-mono">
                      Role: {voucherModalTrx.user?.role?.replace("_", " ") || "Branch Manager"}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      (Transferred / Handed Over By)
                    </div>
                  </div>

                  {/* Right: Owner / Authorized Signature */}
                  <div className="text-center">
                    <div className="border-t border-black pt-1.5 font-bold">
                      Pharmacy Owner / Authorized
                    </div>
                    <div className="text-[10px] text-slate-600 uppercase font-mono">
                      Approved & Received
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      (Signature & Official Stamp)
                    </div>
                  </div>
                </div>

                {/* Footer Notice */}
                <div className="pt-4 text-center text-[10px] text-slate-400 border-t border-dashed border-slate-300">
                  This is a system generated money transfer voucher from PharmaBiz ERP.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Print Styles for Voucher */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-voucher-sheet,
          #printable-voucher-sheet * {
            visibility: visible;
          }
          #printable-voucher-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px;
            box-shadow: none;
            border: 1px solid #000;
          }
        }
      `}</style>
    </div>
  );
}
