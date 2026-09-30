"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import {
  History,
  Search,
  Calendar,
  Wallet,
  Receipt,
  DollarSign,
  Printer,
  Eye,
  AlertCircle,
  Loader2,
  Check,
  Store,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  X,
  User,
} from "lucide-react";
import { useBranchContext } from "@/context/BranchContext";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";

interface BranchSalaryHistoryViewProps {
  selectedBranchId?: string;
  onNavigate?: (module: OwnerModule) => void;
  onSelectEmployee?: (employeeId: string) => void;
}

interface DisbursementItem {
  id: string;
  month: string;
  baseAmount: number;
  allowances: number;
  deductions: number;
  netPayable: number;
  paidAmount: number;
  dueAmount: number;
  status: "PAID" | "PARTIAL";
  paymentDate: string;
  paymentRef?: string | null;
  notes?: string | null;
  user: {
    id: string;
    name?: string;
    username: string;
    phone?: string;
    role: string;
    customRoleName?: string;
    pharmacyRoleName?: string;
  };
  financialAccount: {
    id: string;
    name: string;
    type: string;
    accountNumber?: string;
    bankName?: string;
  };
  disbursedBy?: {
    id: string;
    name?: string;
    username: string;
  } | null;
  branch?: {
    id: string;
    name: string;
  };
}

function SalaryTableSkeleton() {
  return (
    <div className="w-full animate-pulse bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-4 space-y-3">
      <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-none" />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-12 bg-slate-50 dark:bg-slate-800/60 rounded-none" />
      ))}
    </div>
  );
}

export function BranchSalaryHistoryView({
  selectedBranchId: propBranchId,
  onNavigate,
  onSelectEmployee,
}: BranchSalaryHistoryViewProps) {
  const { user: authUser } = useAuth();
  const { settings } = useSettings();
  const {
    selectedBranchId: contextBranchId,
    currentBranch,
    isAllBranches,
  } = useBranchContext();

  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;

  const [mounted, setMounted] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [disbursements, setDisbursements] = useState<DisbursementItem[]>([]);
  const [totalDisbursed, setTotalDisbursed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Pagination State (matching FundTransferHistoryView)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Voucher Slip Modal
  const [selectedSlip, setSelectedSlip] = useState<DisbursementItem | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadSalaryHistory = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        let url = `/accounting/salaries/branch-history?page=${page}&limit=${limit}`;
        if (effectiveBranchId && effectiveBranchId !== "all" && effectiveBranchId !== "all-branches") {
          url += `&branchId=${effectiveBranchId}`;
        }
        if (currentMonth) {
          url += `&month=${currentMonth}`;
        }

        const res = await fetchApi<{
          items: DisbursementItem[];
          totalDisbursed: number;
          pagination?: { page: number; limit: number; total: number; totalPages: number };
        }>(url);

        if (res.success && res.data) {
          setDisbursements(res.data.items || []);
          setTotalDisbursed(res.data.totalDisbursed || 0);
          setTotalCount(res.data.pagination?.total ?? (res.data.items || []).length);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load salary history");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [effectiveBranchId, currentMonth, page, limit]
  );

  useEffect(() => {
    loadSalaryHistory();
  }, [loadSalaryHistory]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return disbursements;
    const q = searchQuery.toLowerCase();
    return disbursements.filter((item) => {
      const staffName = item.user?.name?.toLowerCase() || "";
      const username = item.user?.username?.toLowerCase() || "";
      const voucher = item.paymentRef?.toLowerCase() || item.id.toLowerCase();
      const account = item.financialAccount?.name?.toLowerCase() || "";
      return staffName.includes(q) || username.includes(q) || voucher.includes(q) || account.includes(q);
    });
  }, [disbursements, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return (
    <div className="space-y-4 w-full mx-auto">
      {/* Header - Clean, Compact & No Large Banners (matching Fund Transfer page) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <History className="h-5 w-5 text-brand-primary" />
          Salary History
        </h1>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 rounded-none">
            <Store className="h-3.5 w-3.5 text-brand-primary" />
            <span>Scope:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {isAllBranches ? "All Branches" : currentBranch?.name || "Selected Branch"}
            </span>
          </div>

          {onNavigate && (
            <button
              onClick={() => onNavigate("sal_management")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-brand-primary bg-brand-primary text-white text-xs sm:text-sm font-semibold hover:opacity-90 transition rounded-none cursor-pointer"
            >
              <DollarSign className="h-3.5 w-3.5" />
              Salary Management
            </button>
          )}

          <button
            onClick={() => loadSalaryHistory(true)}
            disabled={refreshing}
            className="p-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none disabled:opacity-50 cursor-pointer"
            title="Refresh History"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2.5 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs sm:text-sm rounded-none">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Bar - Clean, Compact & No Border Radius (matching Fund Transfer page) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 rounded-none space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by staff name, voucher #, or account..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 pl-9 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm outline-none focus:border-brand-primary dark:text-white"
            />
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Salary Month:
            </span>
            <input
              type="month"
              value={currentMonth}
              onChange={(e) => {
                setCurrentMonth(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs outline-none focus:border-brand-primary dark:text-white cursor-pointer"
            />
            {currentMonth && (
              <button
                onClick={() => {
                  setCurrentMonth("");
                  setPage(1);
                }}
                className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title="Clear month filter"
              >
                ✕ All
              </button>
            )}
          </div>
        </div>

        {/* Count Note */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
          <div>
            Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredItems.length}</span> of{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{totalCount}</span> records
          </div>
          {totalDisbursed > 0 && (
            <div>
              Total Disbursed:{" "}
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                ৳{totalDisbursed.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Table - Exact Font Size & Spacing matching Fund Transfer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden">
        {loading ? (
          <SalaryTableSkeleton />
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs sm:text-sm">
            {searchQuery || currentMonth
              ? "No salary disbursements match your search criteria."
              : "No staff salary payments have been recorded for this branch yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/75 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">SL</th>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Salary Month</th>
                  <th className="py-3 px-4">Paid From Account</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
                {filteredItems.map((item, index) => {
                  const sl = (page - 1) * limit + index + 1;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                        {sl}
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-xs sm:text-sm font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {new Date(item.paymentDate).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
                          {item.user?.name || item.user?.username}
                        </div>
                        <span className="text-xs text-slate-400">
                          {item.user?.customRoleName || item.user?.pharmacyRoleName || item.user?.role?.replace("_", " ")}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-none">
                          {item.month}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                        <div className="flex items-center gap-1.5">
                          <Wallet className="h-3.5 w-3.5 text-brand-primary" />
                          <span>{item.financialAccount?.name}</span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {item.financialAccount?.type} {item.financialAccount?.bankName ? `• ${item.financialAccount.bankName}` : ""}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-bold font-mono text-slate-900 dark:text-white whitespace-nowrap text-xs sm:text-sm">
                        ৳{Number(item.paidAmount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                        {Number(item.dueAmount) > 0 && (
                          <div className="text-xs text-amber-500 font-semibold font-mono">
                            Due: ৳{Number(item.dueAmount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-none border ${
                            item.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                          }`}
                        >
                          <Check className="h-3 w-3" />
                          {item.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedSlip(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-none transition cursor-pointer"
                          title="View & Print Voucher Slip"
                        >
                          <Eye className="h-3.5 w-3.5 text-brand-primary" />
                          Slip
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination Footer - Exactly Matching Fund Transfer Style */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/75 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-xs sm:text-sm">
          <div className="text-slate-500">
            Page <span className="font-semibold text-slate-800 dark:text-slate-200">{page}</span> of{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</span>
            {totalCount > 0 && (
              <span className="ml-2 text-slate-400">({totalCount} records)</span>
            )}
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
                className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs rounded-none outline-none text-slate-700 dark:text-slate-200 cursor-pointer"
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
                className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer transition"
                title="First Page"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer transition"
                title="Previous Page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer transition"
                title="Next Page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer transition"
                title="Last Page"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VOUCHER SLIP INVOICE MODAL & ISOLATED CLEAN PRINT PORTAL */}
      {/* ========================================================================= */}
      {mounted && selectedSlip && createPortal(
        <div className="print-portal fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:static print:inset-auto print:bg-white print:p-0 print:m-0 print:block print:w-full">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-2xl max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden print-voucher-card print:rounded-none print:shadow-none print:border-none print:max-w-full print:w-full print:text-black print:max-h-none print:overflow-visible print:m-0 print:p-0">
            {/* Modal Control Bar - hidden on print */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/75 dark:bg-slate-800/60 print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-brand-primary" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Salary Payment Voucher
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white text-xs sm:text-sm font-semibold rounded-none hover:opacity-90 transition cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Voucher
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSlip(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Slip Printable Voucher Document */}
            <div className="p-6 sm:p-8 space-y-5 overflow-y-auto print:max-h-none print:overflow-visible print:p-4 print:space-y-4 text-slate-800 dark:text-slate-200 print:text-black print:bg-white">
              {/* 1. Header with Pharmacy Logo & Name */}
              <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900 dark:border-slate-100 print:border-black">
                {(authUser?.tenant?.logoUrl || settings?.logoUrl) && (
                  <div className="flex justify-center mb-2">
                    <img
                      src={authUser?.tenant?.logoUrl || settings?.logoUrl || ""}
                      alt={authUser?.tenant?.name || "Pharmacy Logo"}
                      className="h-14 sm:h-16 object-contain print:h-14 max-w-[220px]"
                      crossOrigin="anonymous"
                    />
                  </div>
                )}
                <h2 className="font-black text-xl sm:text-2xl print:text-2xl uppercase tracking-tight text-slate-900 dark:text-white print:text-black">
                  {authUser?.tenant?.name || settings?.siteName || "Pharmacy Management"}
                </h2>
                <div className="text-xs text-slate-600 dark:text-slate-400 print:text-black space-y-0.5">
                  <p className="font-semibold">
                    Branch: {selectedSlip.branch?.name || currentBranch?.name || "Main Branch"}
                  </p>
                  {(authUser?.tenant?.address || settings?.contact?.address) && (
                    <p>{authUser?.tenant?.address || settings?.contact?.address}</p>
                  )}
                  <p>
                    {authUser?.tenant?.phone ? `Phone: ${authUser.tenant.phone}` : ""}
                    {authUser?.tenant?.phone && authUser?.tenant?.email ? " | " : ""}
                    {authUser?.tenant?.email ? `Email: ${authUser.tenant.email}` : ""}
                  </p>
                </div>

                <div className="inline-block mt-2 px-3 py-1 border border-slate-900 dark:border-slate-100 print:border-black text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white print:text-black bg-slate-50 dark:bg-slate-800 print:bg-white">
                  SALARY PAYMENT VOUCHER / RECEIPT
                </div>
              </div>

              {/* 2. Metadata Grid (Voucher info + Staff Info) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm print:text-sm pb-4 border-b border-slate-200 dark:border-slate-800 print:border-black">
                <div className="space-y-1.5">
                  <div>
                    <span className="font-bold text-slate-500 dark:text-slate-400 print:text-black">Voucher Ref: </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white print:text-black">
                      {selectedSlip.paymentRef || selectedSlip.id}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 dark:text-slate-400 print:text-black">Salary Month: </span>
                    <span className="font-bold text-slate-900 dark:text-white print:text-black">
                      {selectedSlip.month}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 dark:text-slate-400 print:text-black">Payment Date: </span>
                    <span className="font-mono text-slate-900 dark:text-white print:text-black">
                      {new Date(selectedSlip.paymentDate).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 dark:text-slate-400 print:text-black">Paid From Account: </span>
                    <span className="font-medium text-slate-900 dark:text-white print:text-black">
                      {selectedSlip.financialAccount?.name} ({selectedSlip.financialAccount?.type})
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 sm:text-right">
                  <div>
                    <span className="font-bold text-slate-500 dark:text-slate-400 print:text-black">Employee: </span>
                    <span className="font-bold text-slate-900 dark:text-white print:text-black">
                      {selectedSlip.user?.name || selectedSlip.user?.username}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 dark:text-slate-400 print:text-black">Designation: </span>
                    <span className="font-medium text-slate-900 dark:text-white print:text-black">
                      {selectedSlip.user?.customRoleName || selectedSlip.user?.pharmacyRoleName || selectedSlip.user?.role?.replace("_", " ")}
                    </span>
                  </div>
                  {selectedSlip.user?.phone && (
                    <div>
                      <span className="font-bold text-slate-500 dark:text-slate-400 print:text-black">Phone: </span>
                      <span className="font-mono text-slate-900 dark:text-white print:text-black">
                        {selectedSlip.user.phone}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-slate-500 dark:text-slate-400 print:text-black">Disbursed By: </span>
                    <span className="font-medium text-slate-900 dark:text-white print:text-black">
                      {selectedSlip.disbursedBy?.name || selectedSlip.disbursedBy?.username || "Authorized Manager"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Financial Particulars Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm print:text-sm border border-slate-300 dark:border-slate-700 print:border-black border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 text-slate-700 dark:text-slate-300 print:text-black font-bold">
                    <tr className="border-b border-slate-300 dark:border-slate-700 print:border-black">
                      <th className="py-2.5 px-3 w-12 text-center">SL</th>
                      <th className="py-2.5 px-3">Description / Particulars</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700 print:divide-black">
                    <tr>
                      <td className="py-2.5 px-3 text-center font-mono">1</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white print:text-black">
                          Salary Disbursement for {selectedSlip.month}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-700">
                          Net Payable Package: ৳{Number(selectedSlip.netPayable).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900 dark:text-white print:text-black">
                        ৳{Number(selectedSlip.netPayable).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="bg-slate-50/75 dark:bg-slate-800/40 print:bg-white font-bold">
                      <td className="py-3 px-3 text-center font-mono">2</td>
                      <td className="py-3 px-3 text-emerald-700 dark:text-emerald-400 print:text-black font-bold">
                        <div>Amount Paid / Disbursed</div>
                        <div className="text-xs font-normal text-slate-500 print:text-slate-700">
                          Debited from: {selectedSlip.financialAccount?.name} ({selectedSlip.financialAccount?.type})
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-base font-black text-emerald-700 dark:text-emerald-400 print:text-black">
                        ৳{Number(selectedSlip.paidAmount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    {Number(selectedSlip.dueAmount) > 0 && (
                      <tr className="text-amber-700 dark:text-amber-400 print:text-black">
                        <td className="py-2.5 px-3 text-center font-mono">3</td>
                        <td className="py-2.5 px-3">Remaining Balance Due</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          ৳{Number(selectedSlip.dueAmount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {selectedSlip.notes && (
                <div className="text-xs text-slate-500 dark:text-slate-400 print:text-black italic">
                  Note: &ldquo;{selectedSlip.notes}&rdquo;
                </div>
              )}

              {/* 4. Three Signatures Block */}
              <div className="pt-10 grid grid-cols-3 gap-6 text-center text-xs print:pt-14">
                <div>
                  <div className="border-t border-slate-400 dark:border-slate-600 print:border-black pt-1.5 font-medium text-slate-800 dark:text-slate-200 print:text-black">
                    Prepared / Disbursed By
                  </div>
                  <div className="text-[10px] text-slate-400 print:text-black font-mono">
                    {selectedSlip.disbursedBy?.name || selectedSlip.disbursedBy?.username || "Manager"}
                  </div>
                </div>
                <div>
                  <div className="border-t border-slate-400 dark:border-slate-600 print:border-black pt-1.5 font-medium text-slate-800 dark:text-slate-200 print:text-black">
                    Employee / Received By
                  </div>
                  <div className="text-[10px] text-slate-400 print:text-black font-mono">
                    {selectedSlip.user?.name || selectedSlip.user?.username}
                  </div>
                </div>
                <div>
                  <div className="border-t border-slate-400 dark:border-slate-600 print:border-black pt-1.5 font-medium text-slate-800 dark:text-slate-200 print:text-black">
                    Authorized Signatory
                  </div>
                  <div className="text-[10px] text-slate-400 print:text-black font-mono">
                    Pharmacy Management
                  </div>
                </div>
              </div>

              {/* 5. Footer Notice */}
              <div className="text-center text-[10px] text-slate-400 print:text-slate-600 border-t border-slate-200 dark:border-slate-800 print:border-slate-300 pt-3">
                This is an official system-generated salary disbursement receipt. Generated by PharmaBiz.
              </div>
            </div>

            {/* Modal Screen Footer - hidden on print */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5 bg-slate-50/75 dark:bg-slate-800/60 print:hidden">
              <button
                type="button"
                onClick={() => setSelectedSlip(null)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-none hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-primary text-white text-xs sm:text-sm font-semibold rounded-none hover:opacity-90 transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Print Voucher Slip
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
