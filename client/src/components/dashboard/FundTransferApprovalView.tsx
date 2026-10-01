"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import {
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Calendar,
  Building,
  User,
  Wallet,
  FileText,
  ShieldCheck,
  Check,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Swal from "sweetalert2";
import { OwnerModule } from "./DashboardSidebar";

interface AccountInfo {
  id: string;
  name: string;
  type: string;
}

interface UserInfo {
  id: string;
  name: string;
  username: string;
  role?: string;
}

export interface FundTransferRequestItem {
  id: string;
  tenantId: string;
  branchId?: string | null;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number | string;
  reference?: string | null;
  note?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedById: string;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  transactionId?: string | null;
  createdAt: string;
  updatedAt: string;
  sourceAccount?: AccountInfo;
  destinationAccount?: AccountInfo;
  requestedBy?: UserInfo;
  reviewedBy?: UserInfo;
}

interface FundTransferApprovalViewProps {
  onNavigate?: (module: OwnerModule) => void;
}

type PeriodFilter = "today" | "yesterday" | "month" | "year" | "custom";
type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

function FundTransferTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="w-full animate-pulse">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <th className="py-2.5 px-3">Date & Time</th>
              <th className="py-2.5 px-3">Requested By</th>
              <th className="py-2.5 px-3">From Account</th>
              <th className="py-2.5 px-3">To Account</th>
              <th className="py-2.5 px-3 text-right">Amount (৳)</th>
              <th className="py-2.5 px-3">Slip / Reference</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {Array.from({ length: rows }).map((_, rIdx) => (
              <tr key={rIdx} className="bg-white dark:bg-slate-900">
                <td className="py-3 px-3">
                  <div className="space-y-1.5">
                    <div className="h-3.5 bg-slate-200 dark:bg-slate-800 w-24 rounded-none" />
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-850 w-16 rounded-none" />
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="space-y-1.5">
                    <div className="h-3.5 bg-slate-200 dark:bg-slate-800 w-24 rounded-none" />
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-850 w-14 rounded-none" />
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="space-y-1.5">
                    <div className="h-3.5 bg-slate-200 dark:bg-slate-800 w-28 rounded-none" />
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-850 w-12 rounded-none" />
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="space-y-1.5">
                    <div className="h-3.5 bg-slate-200 dark:bg-slate-800 w-28 rounded-none" />
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-850 w-12 rounded-none" />
                  </div>
                </td>
                <td className="py-3 px-3 text-right">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 w-20 ml-auto rounded-none" />
                </td>
                <td className="py-3 px-3">
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-800 w-20 rounded-none" />
                </td>
                <td className="py-3 px-3">
                  <div className="h-5 bg-slate-100 dark:bg-slate-800 w-16 rounded-none" />
                </td>
                <td className="py-3 px-3 text-center">
                  <div className="h-7 bg-slate-200 dark:bg-slate-800 w-24 mx-auto rounded-none" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FundTransferApprovalView({ onNavigate }: FundTransferApprovalViewProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<FundTransferRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [period, setPeriod] = useState<PeriodFilter>("today");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      params.append("period", period);
      if (period === "custom") {
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
      }

      const res = await fetchApi<FundTransferRequestItem[]>(
        `/accounting/transfer-requests?${params.toString()}`,
        { skipCache: true }
      );

      if (res.success && res.data) {
        setRequests(res.data);
      } else {
        setRequests([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load transfer approval requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [period, statusFilter, startDate, endDate]);

  const handleApprove = async (req: FundTransferRequestItem) => {
    const amountFormatted = Number(req.amount).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
    });

    const confirm = await Swal.fire({
      title: "Approve Fund Transfer?",
      html: `
        <div class="text-left text-xs sm:text-sm space-y-2 text-slate-700 dark:text-slate-300">
          <p>Are you sure you want to approve this transfer request?</p>
          <div class="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 space-y-1">
            <p><strong>Amount:</strong> ৳${amountFormatted}</p>
            <p><strong>From:</strong> ${req.sourceAccount?.name || "Source"}</p>
            <p><strong>To:</strong> ${req.destinationAccount?.name || "Destination"}</p>
            <p><strong>Requested By:</strong> ${req.requestedBy?.name || "Staff"}</p>
            ${req.reference ? `<p><strong>Deposit Ref:</strong> ${req.reference}</p>` : ""}
          </div>
          <p class="text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
            ⚡ ৳${amountFormatted} will be deducted from <strong>${req.sourceAccount?.name}</strong> and added to <strong>${req.destinationAccount?.name}</strong>.
          </p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Approve Transfer",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#059669",
      cancelButtonColor: "#64748b",
      customClass: {
        popup: "rounded-none",
        confirmButton: "rounded-none",
        cancelButton: "rounded-none",
      },
    });

    if (!confirm.isConfirmed) return;

    try {
      setActionInProgress(req.id);
      const res = await fetchApi<{ message?: string }>(
        `/accounting/transfer-requests/${req.id}/approve`,
        { method: "POST" }
      );

      if (res.success) {
        Swal.fire({
          icon: "success",
          title: "Transfer Approved!",
          text: `৳${amountFormatted} has been successfully transferred to "${req.destinationAccount?.name}".`,
          confirmButtonColor: "#059669",
          customClass: {
            popup: "rounded-none",
            confirmButton: "rounded-none",
          },
        });
        loadRequests();
      } else {
        throw new Error(res.message || "Failed to approve transfer");
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Approval Failed",
        text: err.message || "Failed to approve transfer request",
        confirmButtonColor: "#ef4444",
        customClass: {
          popup: "rounded-none",
          confirmButton: "rounded-none",
        },
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (req: FundTransferRequestItem) => {
    const { value: reason, isConfirmed } = await Swal.fire({
      title: "Reject Transfer Request",
      input: "text",
      inputLabel: "Rejection Reason (optional)",
      inputPlaceholder: "e.g. Deposit slip could not be verified / Incorrect amount",
      showCancelButton: true,
      confirmButtonText: "Reject Request",
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b",
      customClass: {
        popup: "rounded-none",
        confirmButton: "rounded-none",
        cancelButton: "rounded-none",
        input: "rounded-none text-sm",
      },
    });

    if (!isConfirmed) return;

    try {
      setActionInProgress(req.id);
      const res = await fetchApi<{ message?: string }>(
        `/accounting/transfer-requests/${req.id}/reject`,
        {
          method: "POST",
          body: JSON.stringify({ reason: reason?.trim() || undefined }),
        }
      );

      if (res.success) {
        Swal.fire({
          icon: "info",
          title: "Transfer Rejected",
          text: "The transfer request has been marked as rejected.",
          confirmButtonColor: "#64748b",
          customClass: {
            popup: "rounded-none",
            confirmButton: "rounded-none",
          },
        });
        loadRequests();
      } else {
        throw new Error(res.message || "Failed to reject transfer request");
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Action Failed",
        text: err.message || "Failed to reject transfer request",
        confirmButtonColor: "#ef4444",
        customClass: {
          popup: "rounded-none",
          confirmButton: "rounded-none",
        },
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // Filtered by search text
  const filteredRequests = requests.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const sourceName = r.sourceAccount?.name?.toLowerCase() || "";
    const destName = r.destinationAccount?.name?.toLowerCase() || "";
    const staffName = r.requestedBy?.name?.toLowerCase() || "";
    const ref = r.reference?.toLowerCase() || "";
    const note = r.note?.toLowerCase() || "";
    return (
      sourceName.includes(q) ||
      destName.includes(q) ||
      staffName.includes(q) ||
      ref.includes(q) ||
      note.includes(q)
    );
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [period, statusFilter, startDate, endDate, searchQuery, pageSize]);

  // Calculate totals
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  // Pagination calculation
  const totalItems = filteredRequests.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getAccountBadge = (type?: string) => {
    const t = String(type || "").toUpperCase();
    if (t === "CASH") return "Cash";
    if (t === "BKASH") return "bKash";
    if (t === "NAGAD") return "Nagad";
    if (t === "ROCKET") return "Rocket";
    if (t === "MOBILE" || t === "MFS") return "MFS";
    return "Bank";
  };

  return (
    <div className="space-y-4 w-full">
      {/* 1. Header (Clean, without short description) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-brand-primary" />
          <span>Fund Transfer Approvals</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-black bg-amber-500 text-white rounded-none">
              {pendingCount} Pending
            </span>
          )}
        </h1>

        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate("acc_fund_transfer")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-brand-primary" />
              <span>Fund Transfer Form</span>
            </button>
          )}

          <button
            onClick={loadRequests}
            disabled={loading}
            className="p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none disabled:opacity-50"
            title="Refresh List"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 3. Filters Bar */}
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Period Tabs */}
          <div className="flex items-center flex-wrap gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-none border border-slate-200 dark:border-slate-700">
            {(
              [
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "month", label: "This Month" },
                { id: "year", label: "This Year" },
                { id: "custom", label: "Custom Date" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-none transition cursor-pointer ${
                  period === p.id
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-none border border-slate-200 dark:border-slate-700">
            {(
              [
                { id: "ALL", label: "All" },
                { id: "PENDING", label: "Pending" },
                { id: "APPROVED", label: "Approved" },
                { id: "REJECTED", label: "Rejected" },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-none transition cursor-pointer ${
                  statusFilter === s.id
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Pickers (if Custom Date selected) */}
        {period === "custom" && (
          <div className="flex flex-wrap items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-brand-primary" />
              <span>Date Range:</span>
            </span>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 px-2.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-none text-slate-800 dark:text-white outline-none focus:border-brand-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 px-2.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-none text-slate-800 dark:text-white outline-none focus:border-brand-primary"
              />
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-xs font-semibold text-rose-500 hover:underline cursor-pointer"
              >
                Clear Dates
              </button>
            )}
          </div>
        )}

        {/* Enhanced Modern Search Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="relative flex items-center">
            <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4 text-brand-primary" />
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by account (Cash, bKash, DBBL), staff name, slip ref..."
              className="w-full h-10 sm:h-11 pl-10 pr-24 text-xs sm:text-sm font-semibold bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-none text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-brand-primary focus:bg-white dark:focus:bg-slate-900 transition-all shadow-2xs"
            />

            <div className="absolute right-3 flex items-center gap-2">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                  title="Clear Search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {searchQuery ? (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/30 rounded-none">
                  {filteredRequests.length} found
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Type to filter
                </span>
              )}
            </div>
          </div>

          {searchQuery.trim() && (
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-1">
              <span>
                Filtering by &ldquo;<strong className="text-slate-800 dark:text-slate-200">{searchQuery}</strong>&rdquo; — found{" "}
                <strong className="text-brand-primary font-mono font-black">{filteredRequests.length}</strong> matching request{filteredRequests.length !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-brand-primary hover:underline text-[11px] font-bold cursor-pointer"
              >
                Reset Search
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Requests Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden">
        {loading ? (
          <FundTransferTableSkeleton rows={pageSize} />
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No Transfer Requests Found
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are no transfer requests matching your selected period and status filter.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Requested By</th>
                    <th className="py-2.5 px-3">From Account</th>
                    <th className="py-2.5 px-3">To Account</th>
                    <th className="py-2.5 px-3 text-right">Amount (৳)</th>
                    <th className="py-2.5 px-3">Slip / Reference</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {paginatedRequests.map((r) => {
                    const isPending = r.status === "PENDING";
                    const isApproved = r.status === "APPROVED";
                    const isRejected = r.status === "REJECTED";
                    const isProcessing = actionInProgress === r.id;

                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                      >
                        {/* Date & Time */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {new Date(r.createdAt).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {new Date(r.createdAt).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </div>
                        </td>

                        {/* Requested By */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{r.requestedBy?.name || "Staff"}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {r.requestedBy?.role || "Staff"}
                          </div>
                        </td>

                        {/* From Account */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {r.sourceAccount?.name || "—"}
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-none">
                            {getAccountBadge(r.sourceAccount?.type)}
                          </span>
                        </td>

                        {/* To Account */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {r.destinationAccount?.name || "—"}
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 border bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 rounded-none">
                            {getAccountBadge(r.destinationAccount?.type)}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          ৳{Number(r.amount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                        </td>

                        {/* Slip / Reference (Concise, without note description) */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {r.reference ? (
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                              {r.reference}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-none">
                              <Clock className="h-3 w-3" />
                              Pending
                            </span>
                          )}
                          {isApproved && (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-none">
                                <Check className="h-3 w-3" />
                                Approved
                              </span>
                              {r.reviewedBy && (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  by {r.reviewedBy.name}
                                </div>
                              )}
                            </div>
                          )}
                          {isRejected && (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-none">
                                <X className="h-3 w-3" />
                                Rejected
                              </span>
                              {r.rejectionReason && (
                                <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 truncate max-w-[140px]" title={r.rejectionReason}>
                                  {r.rejectionReason}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {isPending ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleApprove(r)}
                                disabled={isProcessing}
                                className="px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-none transition flex items-center gap-1 disabled:opacity-50 cursor-pointer shadow-none"
                                title="Verify & Approve this fund transfer"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Approve</span>
                              </button>

                              <button
                                onClick={() => handleReject(r)}
                                disabled={isProcessing}
                                className="px-2.5 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-none transition flex items-center gap-1 disabled:opacity-50 cursor-pointer shadow-none"
                                title="Reject this transfer request"
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : isApproved ? (
                            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Executed</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1">
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Cancelled</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900">
              {/* Left: Records summary & page size */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-slate-600 dark:text-slate-300 font-bold">
                  Showing{" "}
                  <span className="text-slate-900 dark:text-white font-black font-mono">
                    {totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0}
                  </span>{" "}
                  to{" "}
                  <span className="text-slate-900 dark:text-white font-black font-mono">
                    {Math.min(currentPage * pageSize, totalItems)}
                  </span>{" "}
                  of{" "}
                  <span className="text-slate-900 dark:text-white font-black font-mono">
                    {totalItems}
                  </span>{" "}
                  requests
                </span>

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

                <div className="flex items-center gap-1.5">
                  <span>Per Page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="h-7 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand-primary cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {/* Right: Page Buttons */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold transition flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed rounded-none text-xs cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Prev</span>
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      if (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        Math.abs(pageNum - currentPage) <= 1
                      ) {
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`min-w-7 h-7 px-2 text-xs font-bold transition cursor-pointer rounded-none border ${
                              currentPage === pageNum
                                ? "bg-brand-primary text-white border-brand-primary"
                                : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      if (
                        pageNum === currentPage - 2 ||
                        pageNum === currentPage + 2
                      ) {
                        return (
                          <span key={pageNum} className="px-1 text-slate-400">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold transition flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed rounded-none text-xs cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
