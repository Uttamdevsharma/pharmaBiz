"use client";

import React, { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import {
  Wallet,
  Building2,
  Smartphone,
  CreditCard,
  ArrowRightLeft,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  DollarSign,
  AlertCircle,
  FileText,
  Calendar,
  CheckCircle2,
  Loader2,
  X,
  History,
  ShieldCheck,
} from "lucide-react";

interface FinancialAccount {
  id: string;
  name: string;
  type: "CASH" | "BANK" | "MOBILE" | "CARD_SETTLEMENT" | "OTHER";
  balance: number;
  branchId: string;
  branch?: { id: string; name: string };
}

interface FinancialTransaction {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER" | "SALE_PAYMENT" | "PURCHASE_PAYMENT" | "REFUND";
  reference?: string;
  note?: string;
  createdAt: string;
  sourceAccount?: { id: string; name: string; type: string };
  destinationAccount?: { id: string; name: string; type: string };
  user?: { id: string; name: string; username: string };
  branch?: { id: string; name: string };
}

export function AccountsModule() {
  const [overview, setOverview] = useState<any>(null);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"accounts" | "ledger" | "reconciliation">("accounts");

  // Filter state
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Modals
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Transfer Form State
  const [transferData, setTransferData] = useState({
    sourceAccountId: "",
    destinationAccountId: "",
    amount: "",
    reference: "",
    note: "",
  });

  // Income/Expense Form State
  const [recordData, setRecordData] = useState({
    accountId: "",
    amount: "",
    type: "EXPENSE",
    reference: "",
    note: "",
  });

  // Create Account State
  const [accountData, setAccountData] = useState({
    name: "",
    type: "BANK",
    initialBalance: "0",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [ovRes, accRes, txRes] = await Promise.all([
        fetchApi<any>("/accounting/overview"),
        fetchApi<any>("/accounting/accounts"),
        fetchApi<any>("/accounting/transactions?limit=50"),
      ]);

      if (ovRes.success) setOverview(ovRes.data);
      if (accRes.success) setAccounts(accRes.data || []);
      if (txRes.success) setTransactions(txRes.data || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load financial data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferData.sourceAccountId || !transferData.destinationAccountId || !transferData.amount) {
      setErrorMsg("Please fill in all required transfer fields.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const sourceAcc = accounts.find((a) => a.id === transferData.sourceAccountId);

      const res = await fetchApi<any>("/accounting/transfer", {
        method: "POST",
        body: JSON.stringify({
          branchId: sourceAcc?.branchId,
          sourceAccountId: transferData.sourceAccountId,
          destinationAccountId: transferData.destinationAccountId,
          amount: parseFloat(transferData.amount),
          reference: transferData.reference || undefined,
          note: transferData.note || undefined,
        }),
      });

      if (res.success) {
        setSuccessMsg(`৳${transferData.amount} transferred successfully!`);
        setIsTransferModalOpen(false);
        setTransferData({ sourceAccountId: "", destinationAccountId: "", amount: "", reference: "", note: "" });
        loadData();
      } else {
        setErrorMsg(res.message || "Transfer failed");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error processing transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordData.accountId || !recordData.amount) {
      setErrorMsg("Please select an account and amount.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const acc = accounts.find((a) => a.id === recordData.accountId);

      const res = await fetchApi<any>("/accounting/transactions", {
        method: "POST",
        body: JSON.stringify({
          branchId: acc?.branchId,
          accountId: recordData.accountId,
          amount: parseFloat(recordData.amount),
          type: recordData.type,
          reference: recordData.reference || undefined,
          note: recordData.note || undefined,
        }),
      });

      if (res.success) {
        setSuccessMsg(`Transaction recorded successfully!`);
        setIsRecordModalOpen(false);
        setRecordData({ accountId: "", amount: "", type: "EXPENSE", reference: "", note: "" });
        loadData();
      } else {
        setErrorMsg(res.message || "Failed to record transaction");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error recording transaction");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountData.name) {
      setErrorMsg("Please provide an account name.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const defaultBranchId = accounts[0]?.branchId;

      const res = await fetchApi<any>("/accounting/accounts", {
        method: "POST",
        body: JSON.stringify({
          branchId: defaultBranchId,
          name: accountData.name,
          type: accountData.type,
          initialBalance: parseFloat(accountData.initialBalance) || 0,
        }),
      });

      if (res.success) {
        setSuccessMsg(`Account "${accountData.name}" created successfully!`);
        setIsNewAccountModalOpen(false);
        setAccountData({ name: "", type: "BANK", initialBalance: "0" });
        loadData();
      } else {
        setErrorMsg(res.message || "Failed to create account");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error creating account");
    } finally {
      setSubmitting(false);
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "CASH":
        return <Wallet className="h-5 w-5 text-emerald-500" />;
      case "BANK":
        return <Building2 className="h-5 w-5 text-blue-500" />;
      case "MOBILE":
        return <Smartphone className="h-5 w-5 text-pink-500" />;
      case "CARD_SETTLEMENT":
        return <CreditCard className="h-5 w-5 text-purple-500" />;
      default:
        return <DollarSign className="h-5 w-5 text-amber-500" />;
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    if (typeFilter && t.type !== typeFilter) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const refMatch = t.reference?.toLowerCase().includes(q);
      const noteMatch = t.note?.toLowerCase().includes(q);
      const userMatch = t.user?.name?.toLowerCase().includes(q);
      return refMatch || noteMatch || userMatch;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Wallet className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Financial Accounts & Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage pharmacy cash drawers, bank accounts, digital mobile wallets, and double-entry transaction ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setErrorMsg(null);
              setIsTransferModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-2 active:scale-95"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Transfer Money
          </button>
          <button
            onClick={() => {
              setErrorMsg(null);
              setIsRecordModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-2 active:scale-95"
          >
            <PlusCircle className="h-4 w-4" />
            Record Income / Expense
          </button>
          <button
            onClick={() => {
              setErrorMsg(null);
              setIsNewAccountModalOpen(true);
            }}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs sm:text-sm transition flex items-center gap-1.5"
          >
            <PlusCircle className="h-4 w-4" />
            Add Account
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 dark:text-emerald-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-600 dark:text-red-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Liquidity */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg space-y-1">
          <div className="flex items-center justify-between opacity-80 text-xs font-bold uppercase tracking-wider">
            <span>Total Liquidity</span>
            <Wallet className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black">
            ৳{Number(overview?.totalLiquidity || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] opacity-90">All active accounts combined</div>
        </div>

        {/* Cash in Hand */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Cash in Hand</span>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            ৳{Number(overview?.totalCash || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400">Main Drawer & Register</div>
        </div>

        {/* Bank Balances */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Bank Accounts</span>
            <Building2 className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            ৳{Number(overview?.totalBank || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400">Institutional Bank Holdings</div>
        </div>

        {/* Digital Mobile Wallets */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Mobile Wallets</span>
            <Smartphone className="h-4 w-4 text-pink-500" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            ৳{Number(overview?.totalMobile || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400">bKash, Nagad & Rocket</div>
        </div>

        {/* Supplier Dues */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-950 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-red-500 uppercase tracking-wider">
            <span>Supplier Dues</span>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-xl font-extrabold text-red-600 dark:text-red-400">
            ৳{Number(overview?.totalSupplierDues || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400">Outstanding Payables</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("accounts")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
            activeTab === "accounts"
              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Accounts & Wallets ({accounts.length})
        </button>
        <button
          onClick={() => setActiveTab("ledger")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
            activeTab === "ledger"
              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Transaction Ledger & Audit Trail
        </button>
      </div>

      {/* TAB 1: ACCOUNTS LIST */}
      {activeTab === "accounts" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                    {getAccountIcon(acc.type)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{acc.name}</h3>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {acc.type}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-end justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-medium">Current Balance</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    ৳{Number(acc.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setTransferData((prev) => ({ ...prev, sourceAccountId: acc.id }));
                    setIsTransferModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-1"
                >
                  <ArrowRightLeft className="h-3 w-3" />
                  Transfer Out
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: TRANSACTION LEDGER */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search reference, note, user..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Transaction Types</option>
                <option value="TRANSFER">Transfers</option>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
                <option value="SALE_PAYMENT">POS Sales</option>
                <option value="PURCHASE_PAYMENT">Supplier Purchases</option>
              </select>

              <button
                onClick={loadData}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                title="Refresh Ledger"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800 uppercase font-bold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Reference & Note</th>
                    <th className="py-3 px-4">Source Account</th>
                    <th className="py-3 px-4">Destination Account</th>
                    <th className="py-3 px-4">Authorized User</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No financial transactions found.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const isTransfer = tx.type === "TRANSFER";
                      const isExpense = tx.type === "EXPENSE" || tx.type === "PURCHASE_PAYMENT";
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-xs">
                            {new Date(tx.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isTransfer
                                  ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                                  : isExpense
                                  ? "bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
                                  : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {tx.reference || "N/A"}
                            </div>
                            <div className="text-xs text-slate-400">{tx.note || "—"}</div>
                          </td>
                          <td className="py-3 px-4">
                            {tx.sourceAccount ? (
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {tx.sourceAccount.name}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {tx.destinationAccount ? (
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {tx.destinationAccount.name}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            {tx.user?.name || tx.user?.username || "System"}
                          </td>
                          <td className={`py-3 px-4 text-right font-black text-sm ${isExpense ? "text-red-600" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {isExpense ? "-" : "+"}৳{Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: TRANSFER FUNDS */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Transfer Funds</h3>
                  <p className="text-xs text-slate-400">Double-entry ledger transfer between accounts</p>
                </div>
              </div>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Source Account (From)
                </label>
                <select
                  value={transferData.sourceAccountId}
                  onChange={(e) => setTransferData({ ...transferData, sourceAccountId: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select source account...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (Balance: ৳{Number(a.balance).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Destination Account (To)
                </label>
                <select
                  value={transferData.destinationAccountId}
                  onChange={(e) => setTransferData({ ...transferData, destinationAccountId: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select destination account...</option>
                  {accounts
                    .filter((a) => a.id !== transferData.sourceAccountId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} (Balance: ৳{Number(a.balance).toFixed(2)})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Transfer Amount (৳)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 50000"
                  value={transferData.amount}
                  onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                  required
                  min="1"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Reference / Deposit Slip #
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bank Deposit Slip #4928"
                  value={transferData.reference}
                  onChange={(e) => setTransferData({ ...transferData, reference: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Note / Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Transfer excess cash to City Bank"
                  value={transferData.note}
                  onChange={(e) => setTransferData({ ...transferData, note: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD INCOME / EXPENSE */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Record Income / Expense</h3>
                  <p className="text-xs text-slate-400">Direct manual ledger entry</p>
                </div>
              </div>
              <button onClick={() => setIsRecordModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRecordData({ ...recordData, type: "EXPENSE" })}
                    className={`py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
                      recordData.type === "EXPENSE"
                        ? "bg-red-600 text-white shadow-md"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Expense (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecordData({ ...recordData, type: "INCOME" })}
                    className={`py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
                      recordData.type === "INCOME"
                        ? "bg-emerald-600 text-white shadow-md"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Income (+)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Target Financial Account
                </label>
                <select
                  value={recordData.accountId}
                  onChange={(e) => setRecordData({ ...recordData, accountId: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:ring-2 focus:ring-slate-500"
                >
                  <option value="">Select account...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (Balance: ৳{Number(a.balance).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Amount (৳)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 2500"
                  value={recordData.amount}
                  onChange={(e) => setRecordData({ ...recordData, amount: e.target.value })}
                  required
                  min="1"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Reference / Voucher #
                </label>
                <input
                  type="text"
                  placeholder="e.g. Utility Bill / Voucher #104"
                  value={recordData.reference}
                  onChange={(e) => setRecordData({ ...recordData, reference: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Note / Category Details
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shop Electricity Bill for July"
                  value={recordData.note}
                  onChange={(e) => setRecordData({ ...recordData, note: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-bold shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD NEW FINANCIAL ACCOUNT */}
      {isNewAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Add Financial Account</h3>
                  <p className="text-xs text-slate-400">New bank, wallet, or till</p>
                </div>
              </div>
              <button onClick={() => setIsNewAccountModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccountSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. BRAC Bank Main A/C, bKash Personal Till"
                  value={accountData.name}
                  onChange={(e) => setAccountData({ ...accountData, name: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Account Type
                </label>
                <select
                  value={accountData.type}
                  onChange={(e) => setAccountData({ ...accountData, type: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:ring-2 focus:ring-purple-500"
                >
                  <option value="BANK">Bank Account</option>
                  <option value="MOBILE">Mobile Wallet (bKash/Nagad/Rocket)</option>
                  <option value="CASH">Cash Drawer / Register</option>
                  <option value="CARD_SETTLEMENT">Card / POS Settlement</option>
                  <option value="OTHER">Other Financial Asset</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Initial Opening Balance (৳)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={accountData.initialBalance}
                  onChange={(e) => setAccountData({ ...accountData, initialBalance: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewAccountModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
