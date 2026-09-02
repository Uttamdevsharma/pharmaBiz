"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import {
  History,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Receipt,
  Printer,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface TransactionItem {
  id: string;
  tenantId: string;
  branchId: string;
  sourceAccountId?: string | null;
  destinationAccountId?: string | null;
  amount: number;
  type: string;
  reference?: string | null;
  note?: string | null;
  userId?: string | null;
  createdAt: string;
  sourceAccount?: { id: string; name: string; type: string; bankName?: string; accountNumber?: string };
  destinationAccount?: { id: string; name: string; type: string; bankName?: string; accountNumber?: string };
  user?: { id: string; name: string; username: string };
  branch?: { id: string; name: string };
}

interface TransactionHistoryViewProps {
  onNavigate?: (module: OwnerModule) => void;
}

export function TransactionHistoryView({ onNavigate: _onNavigate }: TransactionHistoryViewProps = {}) {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadAccounts = async (branchId?: string) => {
    try {
      const url = branchId ? `/accounting/accounts?branchId=${branchId}` : "/accounting/accounts";
      const res = await fetchApi<any[]>(url);
      if (res.success && res.data) {
        setAccounts(res.data);
      }
    } catch (err) {
      console.error("Failed to load accounts", err);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedBranchId) params.append("branchId", selectedBranchId);
      if (selectedAccountId) params.append("accountId", selectedAccountId);
      if (selectedType !== "ALL") params.append("type", selectedType);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      params.append("limit", "100");

      const res = await fetchApi<any>(`/accounting/transactions?${params.toString()}`);
      if (res.success && res.data) {
        setTransactions(res.data);
      }
    } catch (err) {
      console.error("Failed to load transactions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const bRes = await fetchApi<any[]>("/branches");
        if (bRes.success && bRes.data && bRes.data.length > 0) {
          setBranches(bRes.data);
          if (!selectedBranchId) {
            setSelectedBranchId(bRes.data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load branches", err);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      loadAccounts(selectedBranchId);
      loadTransactions();
    }
  }, [selectedBranchId, selectedAccountId, selectedType, startDate, endDate]);

  const filteredTransactions = transactions.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.reference?.toLowerCase().includes(q) ||
      t.note?.toLowerCase().includes(q) ||
      t.sourceAccount?.name.toLowerCase().includes(q) ||
      t.destinationAccount?.name.toLowerCase().includes(q) ||
      t.user?.name?.toLowerCase().includes(q)
    );
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "SALE_PAYMENT":
        return {
          label: "Sale Revenue",
          bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40",
          icon: ArrowDownLeft,
          color: "text-emerald-600 dark:text-emerald-400",
        };
      case "TRANSFER":
        return {
          label: "Fund Transfer",
          bg: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/40",
          icon: ArrowLeftRight,
          color: "text-blue-600 dark:text-blue-400",
        };
      case "EXPENSE":
        return {
          label: "Expense",
          bg: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/40",
          icon: ArrowUpRight,
          color: "text-rose-600 dark:text-rose-400",
        };
      case "PURCHASE_PAYMENT":
        return {
          label: "Supplier Pay",
          bg: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/40",
          icon: Receipt,
          color: "text-purple-600 dark:text-purple-400",
        };
      case "REFUND":
        return {
          label: "Sale Refund",
          bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/40",
          icon: ArrowUpRight,
          color: "text-amber-600 dark:text-amber-400",
        };
      case "INCOME":
      default:
        return {
          label: "Direct Income",
          bg: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800/40",
          icon: ArrowDownLeft,
          color: "text-teal-600 dark:text-teal-400",
        };
    }
  };

  return (
    <div className="space-y-6 2xl:space-y-8 w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 2xl:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl xl:text-2xl 2xl:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <History className="h-6 w-6 xl:h-7 xl:w-7 text-emerald-600 dark:text-emerald-400" />
              Financial Transaction Ledger
            </h1>
            <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs xl:text-sm px-2.5 py-0.5 rounded-full font-bold">
              Real-Time Audit
            </span>
          </div>
          <p className="text-xs xl:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete synchronized ledger of all sales deposits, inter-account transfers, and financial adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {branches.length > 1 && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="px-3 py-2 xl:px-3.5 xl:py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs xl:text-sm font-bold text-slate-700 dark:text-slate-200 outline-none"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={loadTransactions}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Refresh Ledger"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700/60 transition"
          >
            <Printer className="h-4 w-4" />
            Print Ledger
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference, receipt, account, performer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
            />
          </div>

          {/* Account Filter */}
          <div>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="">All Financial Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type})
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="ALL">All Transaction Types</option>
              <option value="SALE_PAYMENT">Sale Revenue</option>
              <option value="TRANSFER">Fund Transfers</option>
              <option value="EXPENSE">Expenses</option>
              <option value="PURCHASE_PAYMENT">Supplier Payments</option>
              <option value="INCOME">Direct Income</option>
              <option value="REFUND">Refunds</option>
            </select>
          </div>

          {/* Date Picker Range */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none dark:text-white"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-emerald-600" />
            <p className="text-xs font-bold">Loading transaction history...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <History className="h-10 w-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Transactions Found</h3>
            <p className="text-xs text-slate-400">No transaction records match the current filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Reference / Receipt</th>
                  <th className="py-3.5 px-4">Account (Involved)</th>
                  <th className="py-3.5 px-4 text-right">Amount (৳)</th>
                  <th className="py-3.5 px-4">Description / Note</th>
                  <th className="py-3.5 px-4">Authorized By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.map((trx) => {
                  const badge = getTypeBadge(trx.type);
                  const BadgeIcon = badge.icon;
                  const amt = Number(trx.amount || 0);

                  return (
                    <tr key={trx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(trx.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${badge.bg}`}>
                          <BadgeIcon className="h-3 w-3" />
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold font-mono text-slate-900 dark:text-white">
                        {trx.reference || "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        {trx.type === "TRANSFER" ? (
                          <div className="space-y-0.5">
                            <div className="text-rose-500 text-[11px]">
                              From: <strong>{trx.sourceAccount?.name}</strong>
                            </div>
                            <div className="text-emerald-500 text-[11px]">
                              To: <strong>{trx.destinationAccount?.name}</strong>
                            </div>
                          </div>
                        ) : (
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {trx.destinationAccount?.name || trx.sourceAccount?.name || "Cash Drawer"}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black font-mono whitespace-nowrap text-sm">
                        <span className={badge.color}>
                          {trx.type === "EXPENSE" || trx.type === "PURCHASE_PAYMENT" || trx.type === "REFUND"
                            ? `-৳${amt.toFixed(2)}`
                            : `+৳${amt.toFixed(2)}`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                        {trx.note || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-[11px]">
                        {trx.user?.name || trx.user?.username || "Automated"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
