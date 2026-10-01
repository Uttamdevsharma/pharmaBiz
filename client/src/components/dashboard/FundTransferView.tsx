"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
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
  Clock,
  Check,
  X,
  ShieldCheck,
} from "lucide-react";
import Swal from "sweetalert2";

interface FinancialAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  bankName?: string | null;
  accountNumber?: string | null;
  branchName?: string | null;
  branchId?: string;
}

interface FundTransferViewProps {
  onNavigate?: (module: OwnerModule) => void;
}

function FundTransferSkeleton() {
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

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4 rounded-none">
          <div className="grid grid-cols-1 sm:grid-cols-9 gap-3 items-center">
            <div className="sm:col-span-4 h-12 bg-slate-100 dark:bg-slate-800 rounded-none" />
            <div className="sm:col-span-1 h-8 bg-slate-100 dark:bg-slate-800 rounded-none" />
            <div className="sm:col-span-4 h-12 bg-slate-100 dark:bg-slate-800 rounded-none" />
          </div>
          <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-none" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-none" />
            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-none" />
          </div>
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-none" />
        </div>

        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4 rounded-none">
          <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded-none" />
          <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-none" />
          <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-none" />
        </div>
      </div>
    </div>
  );
}

export function FundTransferView({ onNavigate }: FundTransferViewProps) {
  const { user, isPharmacyOwner } = useAuth();
  const isOwner = isPharmacyOwner || user?.role === "COMPANY_OWNER" || user?.role === "SUPER_ADMIN";
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
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

  // Transfer requests tracking
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<FinancialAccount[]>("/accounting/accounts?branchId=all", { skipCache: true });
      if (res.success && res.data) {
        setAccounts(res.data);
        if (res.data.length >= 2) {
          if (!sourceAccountId) setSourceAccountId(res.data[0].id);
          if (!destinationAccountId) setDestinationAccountId(res.data[1].id);
        } else if (res.data.length === 1) {
          if (!sourceAccountId) setSourceAccountId(res.data[0].id);
        }
      }

      // Load recent transfer requests
      const reqRes = await fetchApi<any[]>("/accounting/transfer-requests?period=month", { skipCache: true });
      if (reqRes.success && reqRes.data) {
        setRecentRequests(reqRes.data.slice(0, 5));
      }

      // Load pending count for owner
      if (isOwner) {
        const countRes = await fetchApi<{ count: number }>("/accounting/transfer-requests/pending-count", { skipCache: true });
        if (countRes.success && countRes.data) {
          setPendingApprovalsCount(countRes.data.count || 0);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isOwner]);

  const sourceAccount = accounts.find((a) => a.id === sourceAccountId);
  const destinationAccount = accounts.find((a) => a.id === destinationAccountId);

  const transferNum = parseFloat(amount) || 0;
  const sourceBalance = Number(sourceAccount?.balance || 0);
  const destBalance = Number(destinationAccount?.balance || 0);

  const isInsufficient = transferNum > sourceBalance;
  const isSameAccount = Boolean(
    sourceAccountId && destinationAccountId && sourceAccountId === destinationAccountId
  );

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
      setError(
        `Insufficient balance in ${sourceAccount?.name}. Maximum available: ৳${sourceBalance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}`
      );
      return;
    }

    try {
      setTransferring(true);
      setError(null);
      setSuccessMsg(null);

      if (isOwner) {
        // Owner performs direct transfer
        const res = await fetchApi<any>("/accounting/transfer", {
          method: "POST",
          body: JSON.stringify({
            sourceAccountId,
            destinationAccountId,
            amount: transferNum,
            reference: reference.trim() || undefined,
            note: note.trim() || undefined,
          }),
        });

        if (!res.success) throw new Error(res.message || "Fund transfer failed");

        Swal.fire({
          icon: "success",
          title: "Transfer Completed",
          text: `৳${transferNum.toLocaleString("en-BD", { minimumFractionDigits: 2 })} directly transferred from "${sourceAccount?.name}" to "${destinationAccount?.name}".`,
          confirmButtonColor: "#10b981",
          customClass: {
            popup: "rounded-none",
            confirmButton: "rounded-none",
          },
        });

        setSuccessMsg(
          `Successfully transferred ৳${transferNum.toLocaleString("en-BD", { minimumFractionDigits: 2 })} from "${sourceAccount?.name}" to "${destinationAccount?.name}".`
        );
      } else {
        // Staff/Accounts submits transfer request for Owner Approval
        const res = await fetchApi<any>("/accounting/transfer-requests", {
          method: "POST",
          body: JSON.stringify({
            sourceAccountId,
            destinationAccountId,
            amount: transferNum,
            reference: reference.trim() || undefined,
            note: note.trim() || undefined,
          }),
        });

        if (!res.success) throw new Error(res.message || "Failed to submit transfer request");

        Swal.fire({
          icon: "success",
          title: "Submitted for Approval",
          text: `Transfer request for ৳${transferNum.toLocaleString("en-BD", { minimumFractionDigits: 2 })} has been submitted for Pharmacy Owner approval. Ledger will be updated once approved.`,
          confirmButtonColor: "#059669",
          customClass: {
            popup: "rounded-none",
            confirmButton: "rounded-none",
          },
        });

        setSuccessMsg(
          `Transfer request for ৳${transferNum.toLocaleString("en-BD", { minimumFractionDigits: 2 })} submitted for Owner Approval.`
        );
      }

      setAmount("");
      setReference("");
      setNote("");

      // Refresh accounts balances & requests
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to execute fund transfer");
      Swal.fire({
        icon: "error",
        title: "Transfer Failed",
        text: err.message || "Failed to execute fund transfer",
        confirmButtonColor: "#ef4444",
        customClass: {
          popup: "rounded-none",
          confirmButton: "rounded-none",
        },
      });
    } finally {
      setTransferring(false);
    }
  };

  const getAccountBadge = (type: string) => {
    const t = String(type).toUpperCase();
    if (t === "CASH") return "Cash";
    if (t === "BKASH") return "bKash";
    if (t === "NAGAD") return "Nagad";
    if (t === "ROCKET") return "Rocket";
    if (t === "MFS") return "MFS";
    return "Bank";
  };

  if (loading && accounts.length === 0) {
    return <FundTransferSkeleton />;
  }

  return (
    <div className="space-y-4 w-full mx-auto">
      {/* Page Header - Prominent Bold Heading, Balanced Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-brand-primary" />
          Fund Transfer
        </h1>

        <div className="flex items-center gap-2">
          {isOwner && onNavigate && (
            <button
              onClick={() => onNavigate("approvals_fund_transfer")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs sm:text-sm font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/50 transition rounded-none"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
              <span>Pending Approvals</span>
              {pendingApprovalsCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-600 text-white text-[11px] font-bold rounded-none">
                  {pendingApprovalsCount}
                </span>
              )}
            </button>
          )}

          {onNavigate && (
            <button
              onClick={() => onNavigate("acc_transfer_history")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none"
            >
              <History className="h-3.5 w-3.5 text-brand-primary" />
              Transfer History
            </button>
          )}

          {onNavigate && (
            <button
              onClick={() => onNavigate("acc_financial_accounts")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none"
            >
              <Wallet className="h-3.5 w-3.5 text-brand-primary" />
              Account List
            </button>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none disabled:opacity-50"
            title="Refresh Account Balances"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Transfer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Form: Pure Transfer Controls */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 rounded-none space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs sm:text-sm font-semibold flex items-center gap-2 rounded-none">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2 rounded-none">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleTransfer} className="space-y-4">
            {/* From & To Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-9 gap-3 items-center">
              {/* Source Account */}
              <div className="sm:col-span-4 space-y-1.5">
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                  From Account (Source) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  className="w-full h-9 sm:h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-brand-primary"
                  required
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({getAccountBadge(a.type)}) — ৳{Number(a.balance).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Swap Button */}
              <div className="sm:col-span-1 flex justify-center pt-4 sm:pt-6">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="p-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition rounded-none"
                  title="Swap Source and Destination"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </button>
              </div>

              {/* Destination Account */}
              <div className="sm:col-span-4 space-y-1.5">
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                  To Account (Destination) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  className="w-full h-9 sm:h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-brand-primary"
                  required
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({getAccountBadge(a.type)}) — ৳{Number(a.balance).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Transfer Amount Input */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Transfer Amount (৳) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                  ৳
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`w-full h-10 sm:h-11 pl-8 pr-3 bg-slate-50 dark:bg-slate-800 border rounded-none text-sm sm:text-base font-bold font-mono outline-none dark:text-white ${
                    isInsufficient
                      ? "border-rose-400 text-rose-600 focus:border-rose-500"
                      : "border-slate-300 dark:border-slate-700 focus:border-brand-primary"
                  }`}
                  required
                />
              </div>
              {isInsufficient && (
                <p className="text-xs text-rose-500 font-medium mt-1">
                  Amount exceeds source account balance (৳{sourceBalance.toLocaleString("en-BD", { minimumFractionDigits: 2 })})
                </p>
              )}
            </div>

            {/* Reference & Note */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Reference / Slip No <span className="text-xs font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. TRF-1029 / DBBL-DEP"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full h-9 sm:h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm outline-none focus:border-brand-primary dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Note / Purpose <span className="text-xs font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Daily Cash Deposit to DBBL"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full h-9 sm:h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm outline-none focus:border-brand-primary dark:text-white"
                />
              </div>
            </div>

            {/* Maker-Checker Notice for Non-Owner Staff */}
            {!isOwner && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 font-medium rounded-none flex items-start gap-2">
                <Clock className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  <strong>Approval Required:</strong> As a staff/accounts user, this transfer will be submitted as a pending request. Once the Pharmacy Owner verifies and approves it, the balances will be transferred.
                </span>
              </div>
            )}

            {/* Submit CTA */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={transferring || isInsufficient || isSameAccount || transferNum <= 0}
                className="w-full py-2.5 sm:py-3 bg-brand-primary text-white text-xs sm:text-sm font-bold hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded-none"
              >
                {transferring ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isOwner ? "Executing Transfer..." : "Submitting Request..."}
                  </>
                ) : isOwner ? (
                  <>
                    <ArrowLeftRight className="h-4 w-4" />
                    Execute Direct Transfer
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Submit Transfer for Owner Approval
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Balance Simulation Preview */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-none space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
            Real-Time Balance Preview
          </div>

          {/* Source Account Preview */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {sourceAccount ? sourceAccount.name : "Select Source Account"}
              </span>
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 border border-rose-200 dark:border-rose-900 rounded-none">
                Debit (-)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
              <span>Current:</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                ৳{sourceBalance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {transferNum > 0 && (
              <div className="flex items-center justify-between text-xs text-rose-600 font-bold pt-1.5 border-t border-slate-200 dark:border-slate-700">
                <span>After Transfer:</span>
                <span className="font-mono">
                  ৳{Math.max(0, sourceBalance - transferNum).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {/* Destination Account Preview */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {destinationAccount ? destinationAccount.name : "Select Destination Account"}
              </span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 border border-emerald-200 dark:border-emerald-900 rounded-none">
                Credit (+)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
              <span>Current:</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                ৳{destBalance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {transferNum > 0 && (
              <div className="flex items-center justify-between text-xs text-emerald-600 font-bold pt-1.5 border-t border-slate-200 dark:border-slate-700">
                <span>After Transfer:</span>
                <span className="font-mono">
                  ৳{(destBalance + transferNum).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transfer Requests & Approval Status */}
      {recentRequests.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-none space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-primary" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Recent Transfer Requests & Approval Status
              </h2>
            </div>
            {isOwner && onNavigate && (
              <button
                onClick={() => onNavigate("approvals_fund_transfer")}
                className="text-xs text-brand-primary font-semibold hover:underline"
              >
                View All in Approvals →
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">From Account</th>
                  <th className="py-2.5 px-3">To Account</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Requested By</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {new Date(req.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {req.sourceAccount?.name || "Source"}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {req.destinationAccount?.name || "Destination"}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ৳{Number(req.amount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                      {req.requestedBy?.name || "Staff"}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {req.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 rounded-none">
                          <Clock className="h-3 w-3" />
                          Pending Approval
                        </span>
                      )}
                      {req.status === "APPROVED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 rounded-none">
                          <Check className="h-3 w-3" />
                          Approved
                        </span>
                      )}
                      {req.status === "REJECTED" && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-none"
                          title={req.rejectionReason || "Rejected by owner"}
                        >
                          <X className="h-3 w-3" />
                          Rejected
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
