"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import {
  History,
  Search,
  Printer,
  RefreshCw,
  Loader2,
  Calendar,
  Wallet,
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
  
  // Simple Date Preset state: "today" | "yesterday" | "7days" | "thisMonth" | "thisYear" | "custom"
  const [datePreset, setDatePreset] = useState<"today" | "yesterday" | "7days" | "thisMonth" | "thisYear" | "custom">("thisMonth");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Set default dates based on "thisMonth" on mount
  useEffect(() => {
    handleDatePresetChange("thisMonth");
  }, []);

  const handleDatePresetChange = (preset: "today" | "yesterday" | "7days" | "thisMonth" | "thisYear" | "custom") => {
    setDatePreset(preset);
    const now = new Date();
    let s = "";
    let e = "";

    if (preset === "today") {
      s = now.toISOString().split("T")[0];
      e = now.toISOString().split("T")[0];
    } else if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      s = y.toISOString().split("T")[0];
      e = y.toISOString().split("T")[0];
    } else if (preset === "7days") {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 6);
      s = d7.toISOString().split("T")[0];
      e = now.toISOString().split("T")[0];
    } else if (preset === "thisMonth") {
      s = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      e = now.toISOString().split("T")[0];
    } else if (preset === "thisYear") {
      s = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
      e = new Date(now.getFullYear(), 11, 31).toISOString().split("T")[0];
    } else if (preset === "custom") {
      return;
    }
    setStartDate(s);
    setEndDate(e);
  };

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
    loadAccounts(selectedBranchId);
  }, [selectedBranchId]);

  useEffect(() => {
    loadTransactions();
  }, [selectedBranchId, selectedAccountId, startDate, endDate]);

  const filteredTransactions = transactions.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.reference?.toLowerCase().includes(q) ||
      t.note?.toLowerCase().includes(q) ||
      t.type?.toLowerCase().includes(q) ||
      t.sourceAccount?.name.toLowerCase().includes(q) ||
      t.destinationAccount?.name.toLowerCase().includes(q) ||
      t.user?.name?.toLowerCase().includes(q)
    );
  });

  const getTypeName = (type: string) => {
    switch (type) {
      case "SALE_PAYMENT":
        return "Sale Deposit";
      case "TRANSFER":
        return "Fund Transfer";
      case "EXPENSE":
        return "Expense Payment";
      case "PURCHASE_PAYMENT":
        return "Supplier Payment";
      case "REFUND":
        return "Sale Refund";
      case "INCOME":
      default:
        return "Direct Income";
    }
  };

  const getFromText = (trx: TransactionItem) => {
    if (trx.sourceAccount?.name) return trx.sourceAccount.name;
    if (trx.type === "SALE_PAYMENT" || trx.type === "INCOME") return "Customer / Till";
    return "Cash Drawer";
  };

  const getToText = (trx: TransactionItem) => {
    if (trx.destinationAccount?.name) return trx.destinationAccount.name;
    if (trx.type === "EXPENSE" || trx.type === "PURCHASE_PAYMENT") return "Supplier / Vendor";
    return "Pharmacy Main Account";
  };

  return (
    <div className="space-y-6 w-full max-w-[1920px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl xl:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <History className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              Transaction History
            </h1>
          </div>
          <p className="text-xs xl:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time financial transactions, sales deposits, transfers, and expense entries.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {branches.length > 1 && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="">All Branches</option>
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
            title="Refresh Transactions"
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
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Simple Date Presets & Account Filter */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Period:</span>
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "7days", label: "Last 7 Days" },
              { id: "thisMonth", label: "This Month" },
              { id: "thisYear", label: "This Year" },
              { id: "custom", label: "Custom Date Range" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handleDatePresetChange(p.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  datePreset === p.id
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Account Filter */}
          <div className="flex items-center gap-2 min-w-[240px]">
            <Wallet className="h-4 w-4 text-slate-400 shrink-0" />
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
        </div>

        {/* Search & Custom Date Range inputs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search description, reference, or user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
            />
          </div>

          {(datePreset === "custom" || startDate || endDate) && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset("custom");
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
                }}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Transaction Table (Strictly 6 Columns: Date & Time, Description, From, To, Amount, Status) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-emerald-600" />
            <p className="text-xs font-bold">Querying backend transaction history...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <History className="h-10 w-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Transactions Found</h3>
            <p className="text-xs text-slate-400">No transactions match the selected filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">From</th>
                  <th className="py-3.5 px-4">To</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.map((trx) => {
                  const amt = Number(trx.amount || 0);
                  const isNegative = trx.type === "EXPENSE" || trx.type === "PURCHASE_PAYMENT" || trx.type === "REFUND";

                  return (
                    <tr key={trx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      {/* 1. Date & Time */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono text-xs whitespace-nowrap">
                        {new Date(trx.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* 2. Description */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-white text-xs">
                            {trx.note || getTypeName(trx.type)}
                          </span>
                          {trx.reference && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              Ref: {trx.reference}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. From */}
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {getFromText(trx)}
                      </td>

                      {/* 4. To */}
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {getToText(trx)}
                      </td>

                      {/* 5. Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-sm whitespace-nowrap">
                        <span className={isNegative ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                          {isNegative ? `-৳${amt.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `+৳${amt.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </span>
                      </td>

                      {/* 6. Status */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          Completed
                        </span>
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
