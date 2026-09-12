"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import { CATEGORY_META, RecurringConfig } from "./ExpensesRecurringView";
import {
  DollarSign,
  Receipt,
  Building2,
  Calendar,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  FileText,
  Sliders,
  Check,
  Layers,
  Info,
} from "lucide-react";

interface ExpensesMonthlyViewProps {
  selectedBranchId?: string;
  onNavigate?: (module: OwnerModule) => void;
  preSelectedBill?: RecurringConfig | null;
}

interface ExpenseRecord {
  id: string;
  branchId: string;
  financialAccountId: string;
  recurringConfigId?: string | null;
  category: "SHOP_RENT" | "ELECTRICITY_BILL" | "INTERNET_BILL" | "SECURITY_GUARD" | "MAINTENANCE" | "EMPLOYEE_SALARY" | "OTHER";
  title: string;
  expenseMonth: string;
  amount: number;
  voucherNo?: string | null;
  reference?: string | null;
  notes?: string | null;
  paymentDate: string;
  branch?: { id: string; name: string };
  financialAccount?: { id: string; name: string; type: string; accountNumber?: string; bankName?: string };
  recordedBy?: { id: string; name?: string; username: string };
  recurringConfig?: { id: string; title: string; estimatedAmount: number };
}

interface FinancialAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  isActive: boolean;
  accountNumber?: string | null;
  bankName?: string | null;
}

export function ExpensesMonthlyView({
  selectedBranchId,
  onNavigate,
  preSelectedBill,
}: ExpensesMonthlyViewProps) {
  const [currentMonth, setCurrentMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Data
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [recurringBills, setRecurringBills] = useState<RecurringConfig[]>([]);
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);

  // Record Payment Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedRecurringId, setSelectedRecurringId] = useState<string>("");
  const [recordCategory, setRecordCategory] = useState<RecurringConfig["category"]>("SHOP_RENT");
  const [recordTitle, setRecordTitle] = useState("");
  const [recordMonth, setRecordMonth] = useState(currentMonth);
  const [recordAmount, setRecordAmount] = useState<number | "">("");
  const [recordAccountId, setRecordAccountId] = useState("");
  const [recordVoucher, setRecordVoucher] = useState("");
  const [recordRef, setRecordRef] = useState("");
  const [recordNotes, setRecordNotes] = useState("");

  // Load Real Financial Accounts for branch
  const loadAccounts = async () => {
    if (!selectedBranchId) return;
    try {
      const res = await fetchApi<FinancialAccount[]>(`/accounting/accounts?branchId=${selectedBranchId}`);
      if (res.success && res.data) {
        const activeAccounts = res.data.filter((a) => a.isActive);
        setFinancialAccounts(activeAccounts);
        if (activeAccounts.length > 0 && !recordAccountId) {
          setRecordAccountId(activeAccounts[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load branch financial accounts", e);
    }
  };

  // Load Recurring Bill Templates
  const loadRecurringBills = async () => {
    if (!selectedBranchId) return;
    try {
      const res = await fetchApi<RecurringConfig[]>(
        `/accounting/recurring-expenses?branchId=${selectedBranchId}&includeInactive=false`
      );
      if (res.success && res.data) {
        setRecurringBills(res.data);
      }
    } catch (e) {
      console.error("Failed to load recurring bills", e);
    }
  };

  // Load Recorded Monthly Expenses
  const loadExpenses = async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      setError(null);
      let url = `/accounting/expenses?branchId=${selectedBranchId}&expenseMonth=${currentMonth}&limit=100`;
      if (categoryFilter !== "ALL") {
        url += `&category=${categoryFilter}`;
      }
      const res = await fetchApi<{ items: ExpenseRecord[]; pagination: any }>(url);
      if (res.success && res.data) {
        setExpenses(res.data.items || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load monthly expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    loadRecurringBills();
  }, [selectedBranchId]);

  useEffect(() => {
    loadExpenses();
  }, [selectedBranchId, currentMonth, categoryFilter]);

  // Handle preSelectedBill if passed
  useEffect(() => {
    if (preSelectedBill) {
      handleOpenRecordModal(preSelectedBill);
    }
  }, [preSelectedBill]);

  const handleOpenRecordModal = (bill?: RecurringConfig) => {
    if (bill) {
      setSelectedRecurringId(bill.id);
      setRecordCategory(bill.category);
      setRecordTitle(bill.title);
      setRecordAmount(bill.estimatedAmount);
      setRecordNotes(bill.notes || "");
    } else {
      setSelectedRecurringId("");
      setRecordCategory("SHOP_RENT");
      setRecordTitle("");
      setRecordAmount("");
      setRecordNotes("");
    }
    setRecordMonth(currentMonth);
    setRecordVoucher("");
    setRecordRef("");
    if (financialAccounts.length > 0 && !recordAccountId) {
      setRecordAccountId(financialAccounts[0].id);
    }
    setIsRecordModalOpen(true);
  };

  const handleRecurringSelectChange = (configId: string) => {
    setSelectedRecurringId(configId);
    if (!configId) return;
    const found = recurringBills.find((b) => b.id === configId);
    if (found) {
      setRecordCategory(found.category);
      setRecordTitle(found.title);
      setRecordAmount(found.estimatedAmount);
      if (found.notes) setRecordNotes(found.notes);
    }
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) {
      setError("Please select a branch first");
      return;
    }
    if (!recordAccountId) {
      setError("Please select an active branch financial account for payment");
      return;
    }
    if (!recordTitle.trim()) {
      setError("Expense title is required");
      return;
    }
    if (!recordAmount || Number(recordAmount) <= 0) {
      setError("Please enter a valid expense amount");
      return;
    }

    const chosenAccount = financialAccounts.find((a) => a.id === recordAccountId);
    if (!chosenAccount) {
      setError("Invalid branch financial account selected");
      return;
    }

    if (chosenAccount.balance < Number(recordAmount)) {
      setError(
        `Insufficient balance in ${chosenAccount.name}. Available: ৳${Number(chosenAccount.balance).toLocaleString()}, Required: ৳${Number(recordAmount).toLocaleString()}`
      );
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetchApi("/accounting/expenses", {
        method: "POST",
        body: JSON.stringify({
          branchId: selectedBranchId,
          financialAccountId: recordAccountId,
          recurringConfigId: selectedRecurringId || null,
          category: recordCategory,
          title: recordTitle.trim(),
          expenseMonth: recordMonth,
          amount: Number(recordAmount),
          voucherNo: recordVoucher.trim() || null,
          reference: recordRef.trim() || null,
          notes: recordNotes.trim() || null,
        }),
      });

      if (res.success) {
        setSuccessMsg(`Paid ৳${Number(recordAmount).toLocaleString()} for "${recordTitle}" from ${chosenAccount.name}!`);
        setIsRecordModalOpen(false);
        loadExpenses();
        loadAccounts(); // refresh account balance
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        setError(res.message || "Failed to record expense payment");
      }
    } catch (err: any) {
      setError(err.message || "Failed to record expense payment");
    } finally {
      setSubmitting(false);
    }
  };

  const totalMonthlyPaid = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.voucherNo && e.voucherNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.financialAccount?.name && e.financialAccount.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const selectedAccountDetails = financialAccounts.find((a) => a.id === recordAccountId);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Monthly Expenses</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Select recurring bills, set the actual month's amount, choose the branch financial account, and record payment.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-sm font-semibold">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="month"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              className="bg-transparent border-none text-sm font-semibold focus:outline-none dark:text-white cursor-pointer"
            />
          </div>

          <button
            onClick={() => handleOpenRecordModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            Record Payment
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* History Integrity & Account Safety Callout */}
      <div className="flex items-start gap-3 p-4 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
        <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Immutable Historical Payments & Real Accounts:</span> Payments are debited only from real financial accounts configured for this branch. Previous payment records <span className="font-bold underline">never change</span> when recurring bill templates are edited or deleted in the future.
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Expenses Paid ({currentMonth})
            </span>
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              ৳{totalMonthlyPaid.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">debited</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Recorded Payments
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{expenses.length}</span>
            <span className="text-xs text-slate-500">vouchers</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Branch Accounts
            </span>
            <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {financialAccounts.length}
            </span>
            <span className="text-xs text-slate-500">real active accounts</span>
          </div>
        </div>
      </div>

      {/* Quick Pay Recurring Bills Strip */}
      {recurringBills.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Quick Select Recurring Bill for {currentMonth}
              </h3>
            </div>
            <button
              onClick={() => onNavigate?.("exp_recurring")}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              Manage Recurring Bills
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {recurringBills.map((bill) => {
              const meta = CATEGORY_META[bill.category] || CATEGORY_META.OTHER;
              const Icon = meta.icon;
              // Check if already paid this month
              const isPaidThisMonth = expenses.some(
                (e) => e.recurringConfigId === bill.id || e.title.toLowerCase() === bill.title.toLowerCase()
              );

              return (
                <button
                  key={bill.id}
                  onClick={() => handleOpenRecordModal(bill)}
                  className={`flex items-start justify-between p-3 rounded-xl border text-left transition hover:shadow-md ${
                    isPaidThisMonth
                      ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10"
                      : "border-slate-200 dark:border-slate-800 hover:border-blue-500/40 bg-slate-50 dark:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${meta.bg} ${meta.text}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {bill.title}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        Est: ৳{Number(bill.estimatedAmount).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {isPaidThisMonth ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      <Check className="w-3 h-3" /> Paid
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded">
                      Pay
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, voucher #, or account..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setCategoryFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              categoryFilter === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            All Categories
          </button>
          {Object.entries(CATEGORY_META).map(([catKey, meta]) => (
            <button
              key={catKey}
              onClick={() => setCategoryFilter(catKey)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                categoryFilter === catKey
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <meta.icon className="w-3.5 h-3.5" />
              {meta.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Recorded Expense Ledger for {currentMonth}
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {filteredExpenses.length} payment records
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="mt-3 text-sm text-slate-500">Loading monthly expenses...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="p-4 bg-blue-500/10 text-blue-600 rounded-2xl mb-4">
              <DollarSign className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No expenses recorded for this month</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-md">
              Record payments for recurring bills (Shop Rent, Electricity, Internet, Guard, etc.) debited from your branch accounts.
            </p>
            <button
              onClick={() => handleOpenRecordModal()}
              className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shadow-md shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              Record First Payment
            </button>
          </div>
        ) : (
          <div className="table-responsive-container">
            <table className="w-full min-w-[750px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Date / Voucher</th>
                  <th className="py-3.5 px-4">Expense Title & Category</th>
                  <th className="py-3.5 px-4">Month</th>
                  <th className="py-3.5 px-4">Paid From Account</th>
                  <th className="py-3.5 px-4">Recorded By</th>
                  <th className="py-3.5 px-4 text-right">Actual Paid Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredExpenses.map((exp) => {
                  const meta = CATEGORY_META[exp.category] || CATEGORY_META.OTHER;
                  const Icon = meta.icon;

                  return (
                    <tr
                      key={exp.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white text-xs">
                          {new Date(exp.paymentDate).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {exp.voucherNo || `EXP-${exp.id.slice(0, 6).toUpperCase()}`}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg ${meta.bg} ${meta.text}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {exp.title}
                            </div>
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${meta.text}`}>
                              {meta.label}
                            </span>
                            {exp.notes && (
                              <p className="text-[11px] text-slate-400 italic line-clamp-1 mt-0.5">
                                {exp.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded">
                          {exp.expenseMonth}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {exp.financialAccount ? (
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Wallet className="w-3.5 h-3.5 text-blue-500" />
                              {exp.financialAccount.name}
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {exp.financialAccount.type} {exp.financialAccount.bankName ? `• ${exp.financialAccount.bankName}` : ""}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          {exp.recordedBy?.name || exp.recordedBy?.username || "Manager"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="text-base font-extrabold text-slate-900 dark:text-white">
                          ৳{Number(exp.amount).toLocaleString()}
                        </span>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          Debited & Settled
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Monthly Payment Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Record Monthly Expense Payment</h3>
                  <p className="text-xs text-slate-500">Debits the real branch account and records permanent payment</p>
                </div>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordSubmit} className="space-y-4">
              {/* Step 1: Select Recurring Bill or Custom */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Select Recurring Bill (or Custom)
                </label>
                <select
                  value={selectedRecurringId}
                  onChange={(e) => handleRecurringSelectChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-medium"
                >
                  <option value="">-- Custom Expense (One-off / Not recurring) --</option>
                  {recurringBills.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({CATEGORY_META[b.category]?.label || b.category}) — Est: ৳{Number(b.estimatedAmount).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                    Expense Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shop Rent, DESCO Electric Bill"
                    value={recordTitle}
                    onChange={(e) => setRecordTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                    Category *
                  </label>
                  <select
                    value={recordCategory}
                    onChange={(e) => setRecordCategory(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-medium"
                  >
                    {Object.entries(CATEGORY_META).map(([key, meta]) => (
                      <option key={key} value={key}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Month & Actual Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                    Expense Month *
                  </label>
                  <input
                    type="month"
                    required
                    value={recordMonth}
                    onChange={(e) => setRecordMonth(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                    Actual Amount for this Month (৳) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="0.00"
                      value={recordAmount}
                      onChange={(e) =>
                        setRecordAmount(e.target.value === "" ? "" : parseFloat(e.target.value))
                      }
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold dark:text-white"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    You can enter the exact billed amount for this specific month.
                  </span>
                </div>
              </div>

              {/* Step 3: Choose Real Branch Financial Account */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Payment Account (Real Branch Financial Account) *
                </label>
                {financialAccounts.length === 0 ? (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-600 font-semibold">
                    No active financial account exists for this branch! Please create a financial account first under Accounts & Finance.
                  </div>
                ) : (
                  <>
                    <select
                      required
                      value={recordAccountId}
                      onChange={(e) => setRecordAccountId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {financialAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type}) — Balance: ৳{Number(acc.balance).toLocaleString()}
                        </option>
                      ))}
                    </select>

                    {selectedAccountDetails && (
                      <div className="flex items-center justify-between text-xs px-2 pt-1">
                        <span className="text-slate-500">Available Balance:</span>
                        <span
                          className={`font-bold ${
                            Number(recordAmount || 0) > selectedAccountDetails.balance
                              ? "text-rose-600"
                              : "text-emerald-600"
                          }`}
                        >
                          ৳{Number(selectedAccountDetails.balance).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Voucher & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                    Voucher / Receipt No (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VCH-0012, Bank Txn ID"
                    value={recordVoucher}
                    onChange={(e) => setRecordVoucher(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                    Reference / Cheque (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cheque #, bKash TrxID"
                    value={recordRef}
                    onChange={(e) => setRecordRef(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Payment Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes or additional remarks regarding this payment"
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || financialAccounts.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm & Debit Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
