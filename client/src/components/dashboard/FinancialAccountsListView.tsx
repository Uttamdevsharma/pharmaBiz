"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import {
  Wallet,
  Building2,
  Smartphone,
  Banknote,
  PlusCircle,
  ArrowLeftRight,
  Search,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle2,
} from "lucide-react";

interface FinancialAccount {
  id: string;
  name: string;
  type: string;
  bankName?: string | null;
  accountNumber?: string | null;
  branchName?: string | null;
  routingNumber?: string | null;
  balance: number;
  isDefault: boolean;
  isActive: boolean;
  description?: string | null;
  createdAt?: string;
}

interface FinancialAccountsListViewProps {
  onNavigate?: (module: OwnerModule) => void;
}

function TableSkeleton() {
  return (
    <div className="space-y-4 w-full animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="h-7 w-48 bg-slate-200 dark:bg-slate-800 rounded-none" />
        <div className="flex gap-2">
          <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 rounded-none" />
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-none" />
        </div>
      </div>

      {/* Filter Bar Skeleton */}
      <div className="h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none" />

      {/* Table Skeleton */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-none space-y-2">
        <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-none" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-11 bg-slate-50 dark:bg-slate-800/60 rounded-none" />
        ))}
      </div>
    </div>
  );
}

export function FinancialAccountsListView({ onNavigate }: FinancialAccountsListViewProps) {
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "CASH" | "BANK" | "MFS">("ALL");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadAccounts = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const res = await fetchApi<FinancialAccount[]>("/accounting/accounts?branchId=all", { skipCache: true });
      if (res.success && Array.isArray(res.data)) {
        setAccounts(res.data);
      }
    } catch (err) {
      console.error("Failed to load financial accounts", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        (acc.name || "").toLowerCase().includes(q) ||
        (acc.bankName || "").toLowerCase().includes(q) ||
        (acc.accountNumber || "").toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (typeFilter === "ALL") return true;
      if (typeFilter === "CASH") return acc.type === "CASH";
      if (typeFilter === "BANK") return acc.type === "BANK" || acc.type === "CARD_SETTLEMENT";
      if (typeFilter === "MFS") {
        return (
          acc.type === "BKASH" ||
          acc.type === "NAGAD" ||
          acc.type === "ROCKET" ||
          acc.type === "UPAY" ||
          acc.type === "MOBILE"
        );
      }
      return true;
    });
  }, [accounts, search, typeFilter]);

  // Paginated accounts
  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / pageSize));
  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, currentPage, pageSize]);

  const getAccountBadge = (type: string) => {
    const t = String(type).toUpperCase();
    if (t === "CASH") {
      return {
        label: "Cash",
        icon: Banknote,
        color: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      };
    }
    if (t === "BKASH") {
      return {
        label: "bKash",
        icon: Smartphone,
        color: "bg-pink-50 text-pink-700 border-pink-300 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800",
      };
    }
    if (t === "NAGAD") {
      return {
        label: "Nagad",
        icon: Smartphone,
        color: "bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
      };
    }
    if (t === "ROCKET" || t === "UPAY" || t === "MOBILE") {
      return {
        label: "MFS",
        icon: Smartphone,
        color: "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
      };
    }
    return {
      label: "Bank",
      icon: Building2,
      color: "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    };
  };

  if (loading && accounts.length === 0) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-4 w-full mx-auto">
      {/* Header - Clean, Compact & Product List Style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Wallet className="h-5 w-5 text-brand-primary" />
          Financial Accounts
        </h1>

        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate("acc_fund_transfer")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-brand-primary" />
              Fund Transfer
            </button>
          )}

          {onNavigate && (
            <button
              onClick={() => onNavigate("acc_create_account")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white text-xs sm:text-sm font-semibold hover:opacity-90 transition rounded-none"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Create Account
            </button>
          )}

          <button
            onClick={() => loadAccounts(true)}
            disabled={refreshing}
            className="p-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none disabled:opacity-50"
            title="Refresh Account Balances"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar - Matching Product List Screenshot */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 rounded-none space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Enter ID/Name/Account to search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 pl-9 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm outline-none focus:border-brand-primary dark:text-white"
            />
          </div>

          {/* Type Filter Tabs */}
          <div className="flex items-center gap-1">
            {(
              [
                { id: "ALL", label: "All" },
                { id: "BANK", label: "Banks" },
                { id: "CASH", label: "Cash" },
                { id: "MFS", label: "MFS" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setTypeFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-none border transition ${
                  typeFilter === tab.id
                    ? "bg-brand-primary text-white border-brand-primary"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Total No. of Accounts Note */}
        <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
          Total No. of accounts: <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredAccounts.length}</span>
        </div>
      </div>

      {/* Accounts Table - Exact Product List Style & Font Sizes */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-xs sm:text-sm">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-brand-primary" />
            Loading accounts...
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs sm:text-sm">
            No financial accounts found matching your query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/75 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">SL</th>
                  <th className="py-3 px-4">Account Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Account / Bank Details</th>
                  <th className="py-3 px-4 text-right">Current Balance</th>
                  <th className="py-3 px-4 text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
                {paginatedAccounts.map((acc, index) => {
                  const sl = (currentPage - 1) * pageSize + index + 1;
                  const badge = getAccountBadge(acc.type);
                  const Icon = badge.icon;
                  return (
                    <tr
                      key={acc.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-center text-xs text-slate-400">
                        {sl}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {acc.name}
                          </span>
                          {acc.isDefault && (
                            <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 rounded-none">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        {acc.description && (
                          <div className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                            {acc.description}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold border rounded-none ${badge.color}`}
                        >
                          <Icon className="h-3 w-3" />
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
                        {acc.type === "BANK" ? (
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {acc.bankName || "Commercial Bank"}
                            </span>
                            <span className="text-slate-400 font-mono ml-1.5">
                              (A/C: {acc.accountNumber || "—"})
                            </span>
                          </div>
                        ) : acc.accountNumber ? (
                          <span className="font-mono text-slate-800 dark:text-slate-200">
                            {acc.accountNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Internal Drawer</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-bold font-mono text-slate-900 dark:text-white whitespace-nowrap">
                        ৳{Number(acc.balance).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Active
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination Footer - Exactly Matching Product List Style */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/75 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-xs sm:text-sm">
          <div className="text-slate-500">
            Page <span className="font-semibold text-slate-800 dark:text-slate-200">{currentPage}</span> of{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
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
                onClick={() => setCurrentPage(1)}
                disabled={currentPage <= 1}
                className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none"
                title="First Page"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none"
                title="Previous Page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none"
                title="Next Page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none"
                title="Last Page"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
