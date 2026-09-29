"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import { BillTypeConfig } from "./BillListView";
import {
  CreditCard,
  Building2,
  Smartphone,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Wallet,
  ArrowRight,
  PlusCircle,
  Receipt,
  X,
  History,
} from "lucide-react";

interface RealFinancialAccount {
  id: string;
  name: string;
  type: string;
  accountNumber?: string | null;
  bankName?: string | null;
  balance: number;
  isDefault: boolean;
  isActive: boolean;
}

interface PayBillViewProps {
  selectedBranchId?: string;
  onNavigate?: (module: OwnerModule) => void;
  preSelectedBill?: BillTypeConfig | null;
}

export function PayBillView({
  selectedBranchId,
  onNavigate,
  preSelectedBill,
}: PayBillViewProps) {
  const [billTypes, setBillTypes] = useState<BillTypeConfig[]>([]);
  const [accounts, setAccounts] = useState<RealFinancialAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    billTitle: string;
    amount: number;
    accountName: string;
    month: string;
    paymentDate: string;
  } | null>(null);

  // Helper for current month format YYYY-MM
  const getCurrentMonthStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  // Helper for today's date format YYYY-MM-DD
  const getTodayDateStr = () => {
    return new Date().toISOString().split("T")[0];
  };

  // Form State
  const [selectedBillId, setSelectedBillId] = useState<string>("");
  const [expenseMonth, setExpenseMonth] = useState<string>(getCurrentMonthStr());
  const [amount, setAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(getTodayDateStr());
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const loadData = async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      setError(null);

      const [billsRes, accountsRes] = await Promise.all([
        fetchApi<BillTypeConfig[]>(
          `/accounting/recurring-expenses?branchId=${selectedBranchId}&includeInactive=false`
        ),
        fetchApi<RealFinancialAccount[]>(`/accounting/accounts?branchId=${selectedBranchId}`),
      ]);

      if (billsRes.success && billsRes.data) {
        setBillTypes(billsRes.data);
        if (preSelectedBill) {
          const matched = billsRes.data.find((b) => b.id === preSelectedBill.id);
          if (matched) setSelectedBillId(matched.id);
          else if (billsRes.data.length > 0) setSelectedBillId(billsRes.data[0].id);
        } else if (billsRes.data.length > 0) {
          setSelectedBillId(billsRes.data[0].id);
        }
      }

      if (accountsRes.success && accountsRes.data) {
        const realAccs = accountsRes.data.filter((acc) => acc.isActive);
        setAccounts(realAccs);
        const def = realAccs.find((a) => a.isDefault) || realAccs[0];
        if (def) setSelectedAccountId(def.id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load payment options");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId]);

  const activeBill = billTypes.find((b) => b.id === selectedBillId);
  const activeAccount = accounts.find((a) => a.id === selectedAccountId);
  const availableBalance = Number(activeAccount?.balance || 0);
  const numericAmount = Number(amount || 0);

  const handlePayBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) {
      setError("Please select a branch first");
      return;
    }
    if (!selectedBillId || !activeBill) {
      setError("Please select a bill type");
      return;
    }
    if (!selectedAccountId || !activeAccount) {
      setError("Please select a payment account (Cash, bKash, Bank, etc.)");
      return;
    }
    if (!expenseMonth) {
      setError("Please select the bill month");
      return;
    }
    if (!amount || numericAmount <= 0) {
      setError("Please enter the bill amount to pay");
      return;
    }
    if (numericAmount > availableBalance) {
      setError(
        `Insufficient balance in ${activeAccount.name}. Available: ৳${availableBalance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}, Required: ৳${numericAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}`
      );
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetchApi<any>("/accounting/expenses", {
        method: "POST",
        body: JSON.stringify({
          branchId: selectedBranchId,
          financialAccountId: selectedAccountId,
          recurringConfigId: activeBill.id,
          category: activeBill.category || "OTHER",
          title: activeBill.title,
          expenseMonth,
          amount: numericAmount,
          reference: reference.trim() || null,
          voucherNo: reference.trim() || null,
          notes: notes.trim() || null,
          paymentDate,
        }),
      });

      if (res.success) {
        setSuccessData({
          billTitle: activeBill.title,
          amount: numericAmount,
          accountName: activeAccount.name,
          month: expenseMonth,
          paymentDate,
        });

        // Reset inputs
        setAmount("");
        setReference("");
        setNotes("");
        // Reload accounts for live balance deduction
        loadData();
      } else {
        setError(res.message || "Failed to record bill payment");
      }
    } catch (err: any) {
      setError(err.message || "Failed to record bill payment");
    } finally {
      setSubmitting(false);
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "MOBILE_BANKING":
        return <Smartphone className="h-4 w-4 text-pink-500" />;
      case "BANK":
        return <Building2 className="h-4 w-4 text-blue-500" />;
      default:
        return <Banknote className="h-4 w-4 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-4 w-full mx-auto">
      {/* Top Header - Compact Typography */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-brand-primary" />
            Pay Bill
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Record actual variable bill payments from cash drawer, bKash, or bank accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate("exp_history")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none cursor-pointer"
            >
              <History className="h-3.5 w-3.5 text-brand-primary" />
              Bill History
            </button>
          )}

          {onNavigate && (
            <button
              onClick={() => onNavigate("exp_list")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none cursor-pointer"
            >
              Bill List
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-medium flex items-center gap-2 rounded-none">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Payment Form Card */}
      <div className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-none space-y-5">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-xs sm:text-sm">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-brand-primary" />
            Loading payment options...
          </div>
        ) : (
          <form onSubmit={handlePayBillSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Field 1: Bill Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Bill Type <span className="text-rose-500">*</span>
                </label>
                {billTypes.length === 0 ? (
                  <div className="space-y-1.5">
                    <div className="text-xs text-rose-500 font-medium">No bill types created yet.</div>
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => onNavigate("exp_create")}
                        className="inline-flex items-center gap-1 text-xs text-brand-primary font-bold hover:underline cursor-pointer"
                      >
                        <PlusCircle className="h-3 w-3" />
                        Create Bill Type First
                      </button>
                    )}
                  </div>
                ) : (
                  <select
                    value={selectedBillId}
                    onChange={(e) => setSelectedBillId(e.target.value)}
                    required
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-medium outline-none focus:border-brand-primary dark:text-white"
                  >
                    {billTypes.map((bill) => (
                      <option key={bill.id} value={bill.id}>
                        {bill.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Field 2: Bill Month */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Bill Month <span className="text-rose-500">*</span>
                </label>
                <input
                  type="month"
                  required
                  value={expenseMonth}
                  onChange={(e) => setExpenseMonth(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-medium outline-none focus:border-brand-primary dark:text-white"
                />
              </div>

              {/* Field 3: Dynamic Amount (৳) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Actual Amount (৳) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-bold outline-none focus:border-brand-primary dark:text-white font-mono"
                />
              </div>

              {/* Field 4: Paid From Account (Cash / bKash / Bank) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Payment Account <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  required
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-medium outline-none focus:border-brand-primary dark:text-white"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (৳{Number(acc.balance || 0).toLocaleString("en-BD")})
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 5: Payment Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-medium outline-none focus:border-brand-primary dark:text-white"
                />
              </div>

              {/* Field 6: Voucher / Reference */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Voucher / Slip / Meter No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. SLIP-8841, Meter #92314"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-medium outline-none focus:border-brand-primary dark:text-white"
                />
              </div>
            </div>

            {/* Field 7: Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Remarks / Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="Optional remarks about this payment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-medium outline-none focus:border-brand-primary dark:text-white"
              />
            </div>

            {/* Account Balance Summary Bar */}
            {activeAccount && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-none flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  {getAccountIcon(activeAccount.type)}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {activeAccount.name}
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-500">Available:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    ৳{availableBalance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {numericAmount > 0 && (
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-slate-500">Remaining after pay:</span>
                    <span
                      className={`font-bold ${
                        availableBalance - numericAmount < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      ৳{(availableBalance - numericAmount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || !activeBill || !activeAccount}
                className="px-5 py-2.5 bg-brand-primary text-white text-xs sm:text-sm font-bold rounded-none hover:opacity-90 disabled:opacity-50 transition flex items-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    <span>
                      Pay Bill {numericAmount > 0 ? `(৳${numericAmount.toLocaleString("en-BD")})` : ""}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Payment Success Modal */}
      {successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSuccessData(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Payment Recorded Successfully
                </h3>
                <p className="text-xs text-slate-500">
                  Account balance has been automatically debited.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 text-xs">
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-500">Bill Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{successData.billTitle}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  ৳{successData.amount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-500">Paid From:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{successData.accountName}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-500">Month:</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{successData.month}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{successData.paymentDate}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setSuccessData(null)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold rounded-none hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Pay Another Bill
              </button>

              {onNavigate && (
                <button
                  onClick={() => {
                    setSuccessData(null);
                    onNavigate("exp_history");
                  }}
                  className="flex-1 px-4 py-2 bg-brand-primary text-white text-xs sm:text-sm font-bold rounded-none hover:opacity-90 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>View in History</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
