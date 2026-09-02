"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import {
  ArrowLeftRight,
  Wallet,
  Building2,
  Smartphone,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  History,
  Calendar,
  User,
  FileText,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

interface FinancialAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  bankName?: string | null;
  accountNumber?: string | null;
  branchName?: string | null;
  branchId: string;
}

interface FundTransferViewProps {
  onNavigate?: (module: OwnerModule) => void;
}

export function FundTransferView({ onNavigate }: FundTransferViewProps) {
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Transfer Form State
  const [sourceAccountId, setSourceAccountId] = useState<string>("");
  const [destinationAccountId, setDestinationAccountId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [transferring, setTransferring] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Transfer History State
  const [recentTransfers, setRecentTransfers] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = selectedBranchId
        ? `/accounting/accounts?branchId=${selectedBranchId}`
        : "/accounting/accounts";
      const res = await fetchApi<FinancialAccount[]>(url);
      if (res.success && res.data) {
        setAccounts(res.data);
        if (res.data.length >= 2) {
          if (!sourceAccountId) setSourceAccountId(res.data[0].id);
          if (!destinationAccountId) setDestinationAccountId(res.data[1].id);
        } else if (res.data.length === 1) {
          if (!sourceAccountId) setSourceAccountId(res.data[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const loadTransferHistory = async () => {
    try {
      setLoadingHistory(true);
      const params = new URLSearchParams();
      params.append("type", "TRANSFER");
      if (selectedBranchId) params.append("branchId", selectedBranchId);
      params.append("limit", "15");

      const res = await fetchApi<any>(`/accounting/transactions?${params.toString()}`);
      if (res.success && res.data) {
        setRecentTransfers(res.data);
      }
    } catch (err) {
      console.error("Failed to load transfer history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const bRes = await fetchApi<any[]>("/branches");
        if (bRes.success && bRes.data && bRes.data.length > 0) {
          setBranches(bRes.data);
          if (!selectedBranchId) setSelectedBranchId(bRes.data[0].id);
        }
      } catch (err) {
        console.error("Failed to load branches", err);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      loadData();
      loadTransferHistory();
    }
  }, [selectedBranchId]);

  const sourceAccount = accounts.find((a) => a.id === sourceAccountId);
  const destinationAccount = accounts.find((a) => a.id === destinationAccountId);

  const transferNum = parseFloat(amount) || 0;
  const sourceBalance = Number(sourceAccount?.balance || 0);
  const destBalance = Number(destinationAccount?.balance || 0);

  const isInsufficient = transferNum > sourceBalance;
  const isSameAccount = sourceAccountId === destinationAccountId;

  const handleSwap = () => {
    const temp = sourceAccountId;
    setSourceAccountId(destinationAccountId);
    setDestinationAccountId(temp);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceAccountId || !destinationAccountId) {
      setError("Please select both source and destination accounts");
      return;
    }
    if (isSameAccount) {
      setError("Source and destination accounts must be different");
      return;
    }
    if (transferNum <= 0) {
      setError("Please enter a valid transfer amount greater than 0");
      return;
    }
    if (isInsufficient) {
      setError(`Insufficient funds in ${sourceAccount?.name}. Maximum available: ৳${sourceBalance.toFixed(2)}`);
      return;
    }

    try {
      setTransferring(true);
      setError(null);
      setSuccessMsg(null);

      const res = await fetchApi<any>("/accounting/transfer", {
        method: "POST",
        body: JSON.stringify({
          branchId: selectedBranchId,
          sourceAccountId,
          destinationAccountId,
          amount: transferNum,
          reference: reference.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });

      if (!res.success) throw new Error(res.message || "Fund transfer failed");

      setSuccessMsg(
        `Successfully transferred ৳${transferNum.toFixed(2)} from "${sourceAccount?.name}" to "${destinationAccount?.name}".`
      );
      setAmount("");
      setReference("");
      setNote("");

      // Refresh accounts balances and ledger
      loadData();
      loadTransferHistory();
    } catch (err: any) {
      setError(err.message || "Failed to execute fund transfer");
    } finally {
      setTransferring(false);
    }
  };

  const getAccountIcon = (type: string) => {
    const t = String(type).toUpperCase();
    if (t === "CASH") return Banknote;
    if (t === "BKASH" || t === "NAGAD" || t === "MOBILE") return Smartphone;
    return Building2;
  };

  return (
    <div className="space-y-6 2xl:space-y-8 w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 2xl:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl xl:text-2xl 2xl:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowLeftRight className="h-6 w-6 xl:h-7 xl:w-7 text-brand-primary" />
              Fund Transfer & Rebalancing
            </h1>
            <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-xs xl:text-sm px-2.5 py-0.5 rounded-full font-bold">
              Atomic Double-Entry
            </span>
          </div>
          <p className="text-xs xl:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Instantly transfer funds between Cash Drawers, bKash, Nagad, and named Bank Accounts (Cash ↔ Bank, Wallet ↔ Bank).
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

          {onNavigate && (
            <button
              onClick={() => onNavigate("acc_financial_accounts")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 xl:px-4 xl:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs xl:text-sm font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700/60 transition"
            >
              <Wallet className="h-4 w-4 text-brand-primary" />
              View Accounts
            </button>
          )}
        </div>
      </div>

      {/* Main Transfer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 2xl:grid-cols-12 gap-6 2xl:gap-8">
        {/* Left Form: Transfer Controls */}
        <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-brand-primary" />
              Transfer Funds Between Accounts
            </h2>

            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleTransfer} className="space-y-5">
              {/* From & To Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-9 gap-3 items-center">
                {/* Source Account */}
                <div className="sm:col-span-4 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                    From Account (Source) *
                  </label>
                  <select
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                    required
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} (৳{Number(a.balance).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Swap Button */}
                <div className="sm:col-span-1 flex justify-center pt-5">
                  <button
                    type="button"
                    onClick={handleSwap}
                    className="p-2.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-brand-primary transition"
                    title="Swap Source and Destination"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Destination Account */}
                <div className="sm:col-span-4 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                    To Account (Destination) *
                  </label>
                  <select
                    value={destinationAccountId}
                    onChange={(e) => setDestinationAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                    required
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} (৳{Number(a.balance).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Transfer Amount (৳) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-base">
                    ৳
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-2xl text-lg font-black font-mono outline-none dark:text-white ${
                      isInsufficient
                        ? "border-rose-300 text-rose-600 focus:border-rose-500"
                        : "border-slate-200 dark:border-slate-700 focus:border-brand-primary"
                    }`}
                    required
                  />
                </div>
                {isInsufficient && (
                  <p className="text-[11px] text-rose-500 font-bold mt-1">
                    Amount exceeds available source balance (৳{sourceBalance.toFixed(2)})
                  </p>
                )}
              </div>

              {/* Reference & Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reference / Slip No (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DEPOSIT-1029 / BKASH-TRX"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Transfer Purpose / Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Daily Cash deposit to DBBL"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={transferring || isInsufficient || isSameAccount || transferNum <= 0}
                className="w-full py-3.5 rounded-2xl bg-brand-primary text-white text-sm font-bold shadow-md hover:opacity-90 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {transferring ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Executing Double-Entry Transfer...
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="h-4 w-4" />
                    Confirm & Execute Transfer
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Live Balance Simulation Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Live Balance Simulation
            </h3>

            {/* Source Account Preview */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Source: {sourceAccount?.name || "Select Account"}
                </span>
                <span className="text-[10px] text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                  Debit (-)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Current Balance:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  ৳{sourceBalance.toFixed(2)}
                </span>
              </div>
              {transferNum > 0 && (
                <div className="flex items-center justify-between text-xs text-rose-600 font-bold pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Balance After Transfer:</span>
                  <span className="font-mono">
                    ৳{Math.max(0, sourceBalance - transferNum).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Destination Account Preview */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Destination: {destinationAccount?.name || "Select Account"}
                </span>
                <span className="text-[10px] text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                  Credit (+)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Current Balance:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  ৳{destBalance.toFixed(2)}
                </span>
              </div>
              {transferNum > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-600 font-bold pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Balance After Transfer:</span>
                  <span className="font-mono">
                    ৳{(destBalance + transferNum).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Helpful Transfer Types Hint */}
            <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-blue-600" />
                Supported Direct Transfer Flows
              </div>
              <p className="text-[11px] text-blue-700/80 dark:text-blue-400">
                • Cash Drawer ➔ Bank (End of day settlement)<br />
                • bKash / Nagad ➔ Bank (Wallet payout)<br />
                • Bank ➔ Cash Drawer (Petty cash refill)<br />
                • Bank ➔ Bank (Interbank liquidity)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transfer Audit History */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="h-5 w-5 text-brand-primary" />
              Recent Fund Transfers Audit Ledger
            </h3>
            <p className="text-xs text-slate-500">Real-time record of all transfers performed across accounts</p>
          </div>

          <button
            onClick={loadTransferHistory}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Refresh History"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loadingHistory ? (
          <div className="p-8 text-center text-slate-400 text-xs font-bold">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-primary" />
            Loading transfer transactions...
          </div>
        ) : recentTransfers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No fund transfers recorded yet for this branch.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Source (From)</th>
                  <th className="py-3 px-4">Destination (To)</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentTransfers.map((trx) => (
                  <tr key={trx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(trx.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 font-bold font-mono text-slate-800 dark:text-slate-200">
                      {trx.reference || "TRF-DIRECT"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        {trx.sourceAccount?.name || "External / Source"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {trx.destinationAccount?.name || "Destination"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black font-mono text-slate-900 dark:text-white">
                      ৳{Number(trx.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] truncate max-w-[200px]">
                      {trx.note || "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-[11px]">
                      {trx.user?.name || trx.user?.username || "System"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
