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
  DollarSign,
  FileText,
  Wallet,
  ArrowRight,
  PlusCircle,
  Receipt,
  Info,
  Sparkles,
  Check,
  X,
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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

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
        fetchApi<BillTypeConfig[]>(`/accounting/recurring-expenses?branchId=${selectedBranchId}&includeInactive=false`),
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
        // Filter to active financial accounts created for this branch
        const realAccs = accountsRes.data.filter((acc) => acc.isActive);
        setAccounts(realAccs);

        // Pre-select default account or first available account
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
      setError("Branch is required");
      return;
    }
    if (!selectedBillId || !activeBill) {
      setError("Please select a valid bill type");
      return;
    }
    if (!selectedAccountId || !activeAccount) {
      setError("Please select a real payment account");
      return;
    }
    if (!expenseMonth) {
      setError("Please select the bill month");
      return;
    }
    if (!amount || numericAmount <= 0) {
      setError("Please enter the actual bill amount paid");
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
          category: activeBill.category,
          title: activeBill.title,
          expenseMonth,
          amount: numericAmount,
          reference: reference.trim() || null,
          voucherNo: reference.trim() || null,
          notes: notes.trim() || null,
          paymentDate,
        }),
      });

      if (res.success && res.data) {
        setSuccessData({
          billTitle: activeBill.title,
          amount: numericAmount,
          accountName: activeAccount.name,
          month: expenseMonth,
          paymentDate,
          id: res.data.id,
        });

        // Reset form
        setAmount("");
        setReference("");
        setNotes("");
        // Reload financial accounts so balance is updated live
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

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Pay Bill</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Record actual bill payments for your pharmacy. Select your account and enter the exact cost.
            </p>
          </div>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate("exp_history")}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <span>View Bill History</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Centered Success Confirmation Modal Popup */}
      {successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-center relative">
            {/* Close X Button */}
            <button
              onClick={() => setSuccessData(null)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Animated Checkmark */}
            <div className="pt-2">
              <div className="w-14 h-14 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto ring-8 ring-emerald-500/10 animate-bounce">
                <CheckCircle2 className="w-7 h-7" />
              </div>
            </div>

            {/* Main Heading & Paid Amount Message */}
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Payment Successful
              </h3>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                ৳{Number(successData.amount).toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} paid from {successData.accountName}
              </p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl text-xs text-left border border-slate-100 dark:border-slate-800 font-medium">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-0.5">Bill Name</span>
                <span className="font-bold text-slate-900 dark:text-white truncate block">{successData.billTitle}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-0.5">Bill Month</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{successData.month}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-0.5">Paid From Account</span>
                <span className="font-bold text-slate-900 dark:text-white truncate block">{successData.accountName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-0.5">Payment Date</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{successData.paymentDate}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                onClick={() => setSuccessData(null)}
                className="w-full sm:w-auto flex-1 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                Done
              </button>
              {onNavigate && (
                <button
                  onClick={() => {
                    setSuccessData(null);
                    onNavigate("exp_history");
                  }}
                  className="w-full sm:w-auto flex-1 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  View Bill History
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400 text-xs font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-xs font-bold">Loading payment accounts & bill options...</span>
        </div>
      ) : billTypes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">No bill types configured yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You must configure at least one bill type in your Bill List before recording payments.
            </p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate("exp_list")}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-emerald-600/20"
            >
              + Configure Bill List First
            </button>
          )}
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">No financial accounts found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No active payment account (Cash, Bank, bKash) was found for this branch. Please create a financial account first.
            </p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate("acc_financial_accounts")}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-emerald-600/20"
            >
              + Create Financial Account
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handlePayBillSubmit} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-base font-black text-slate-900 dark:text-white">Record Bill Payment</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Check your actual paper or digital bill statement and enter exact payment details.
              </p>
            </div>

            {/* Field 1: Select Bill */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                1. Select Bill *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {billTypes.map((bill) => {
                  const isSelected = bill.id === selectedBillId;

                  return (
                    <div
                      key={bill.id}
                      onClick={() => setSelectedBillId(bill.id)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-2xs"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-slate-900 dark:text-white">{bill.title}</div>
                          <div className="text-[10px] text-slate-400 font-medium">Branch Bill</div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Field 2 & 3: Bill Month & Payment Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  2. Bill Month *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="month"
                    required
                    value={expenseMonth}
                    onChange={(e) => setExpenseMonth(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Which month this bill is for (e.g. 2026-09)</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  3. Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <p className="text-[10px] text-slate-400">Date payment was executed</p>
              </div>
            </div>

            {/* Field 4: Actual Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                4. Actual Bill Amount (৳) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-emerald-600">৳</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="Enter exact actual bill amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-base font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Check paper/digital document and enter exact cost. No system estimates used.
              </p>
            </div>

            {/* Field 5: Payment Account (Real Financial Accounts Only) */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                5. Payment Account (Deducted From) *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {accounts.map((acc) => {
                  const isBank = acc.type === "BANK" || acc.type === "CARD_SETTLEMENT";
                  const isBkash = acc.type === "BKASH" || acc.name.toLowerCase().includes("bkash");
                  const isNagad = acc.type === "NAGAD" || acc.name.toLowerCase().includes("nagad");
                  const isSelected = acc.id === selectedAccountId;
                  const bal = Number(acc.balance || 0);

                  return (
                    <div
                      key={acc.id}
                      onClick={() => setSelectedAccountId(acc.id)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-2xs"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-2 rounded-xl ${
                              isBank
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                                : isBkash
                                ? "bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-400"
                                : isNagad
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                            }`}
                          >
                            {isBank ? (
                              <Building2 className="w-4 h-4" />
                            ) : isBkash || isNagad ? (
                              <Smartphone className="w-4 h-4" />
                            ) : (
                              <Banknote className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate max-w-[130px]">
                              {acc.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {acc.accountNumber || acc.bankName || acc.type}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${
                            isSelected ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Live Balance</span>
                        <span className="font-black text-xs font-mono text-slate-900 dark:text-white">
                          ৳{bal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Insufficient funds warning */}
              {numericAmount > availableBalance && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Warning: Insufficient balance in {activeAccount?.name}. Available ৳{availableBalance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}, required ৳{numericAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}.
                  </span>
                </div>
              )}
            </div>

            {/* Field 6: Reference / Note */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  6. Reference / Voucher No. (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. VOUCHER-9042, Txn #81923"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Meter reading, cashier notes, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={submitting || numericAmount > availableBalance}
              className="flex items-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Complete Bill Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
