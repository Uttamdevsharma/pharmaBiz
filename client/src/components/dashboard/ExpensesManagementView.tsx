"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import {
  DollarSign,
  Receipt,
  Home,
  Zap,
  Users,
  Layers,
  Plus,
  Calendar,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  CreditCard,
  Building2,
  Check,
  CalendarDays,
  FileText,
  Clock,
  ArrowUpRight,
} from "lucide-react";

interface ExpensesManagementViewProps {
  selectedBranchId?: string;
  onNavigate?: (module: OwnerModule) => void;
}

interface RecurringConfig {
  id: string;
  branchId: string;
  category: "SHOP_RENT" | "ELECTRICITY_BILL" | "EMPLOYEE_SALARY" | "OTHER";
  title: string;
  estimatedAmount: number;
  dueDay?: number | null;
  notes?: string | null;
  isActive: boolean;
  branch?: { id: string; name: string };
}

interface ExpenseRecord {
  id: string;
  branchId: string;
  financialAccountId: string;
  recurringConfigId?: string | null;
  category: "SHOP_RENT" | "ELECTRICITY_BILL" | "EMPLOYEE_SALARY" | "OTHER";
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

interface ExpenseSummary {
  shopRent: number;
  electricityBill: number;
  employeeSalary: number;
  otherExpenses: number;
  totalExpenses: number;
  count: number;
}

const CATEGORY_META = {
  SHOP_RENT: { label: "Shop Rent", icon: Home, bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  ELECTRICITY_BILL: { label: "Electricity Bill", icon: Zap, bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  EMPLOYEE_SALARY: { label: "Employee Salary", icon: Users, bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  OTHER: { label: "Other Expenses", icon: Layers, bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/20" },
};

export function ExpensesManagementView({ selectedBranchId, onNavigate }: ExpensesManagementViewProps) {
  const [activeTab, setActiveTab] = useState<"monthly" | "recurring">("monthly");
  const [currentMonth, setCurrentMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Data
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [recurringConfigs, setRecurringConfigs] = useState<RecurringConfig[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({
    shopRent: 0,
    electricityBill: 0,
    employeeSalary: 0,
    otherExpenses: 0,
    totalExpenses: 0,
    count: 0,
  });
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);

  // Record Form State
  const [recordCategory, setRecordCategory] = useState<"SHOP_RENT" | "ELECTRICITY_BILL" | "EMPLOYEE_SALARY" | "OTHER">("SHOP_RENT");
  const [recordTitle, setRecordTitle] = useState("");
  const [recordMonth, setRecordMonth] = useState(currentMonth);
  const [recordAmount, setRecordAmount] = useState<number | "">("");
  const [recordAccountId, setRecordAccountId] = useState("");
  const [recordVoucher, setRecordVoucher] = useState("");
  const [recordRef, setRecordRef] = useState("");
  const [recordNotes, setRecordNotes] = useState("");
  const [recordRecurringId, setRecordRecurringId] = useState<string | null>(null);

  // Recurring Form State
  const [recCategory, setRecCategory] = useState<"SHOP_RENT" | "ELECTRICITY_BILL" | "EMPLOYEE_SALARY" | "OTHER">("SHOP_RENT");
  const [recTitle, setRecTitle] = useState("");
  const [recAmount, setRecAmount] = useState<number | "">("");
  const [recDueDay, setRecDueDay] = useState<number | "">("");
  const [recNotes, setRecNotes] = useState("");

  // Load Financial Accounts for selected branch
  const loadAccounts = async () => {
    if (!selectedBranchId) return;
    try {
      const res = await fetchApi<FinancialAccount[]>(`/accounting/accounts?branchId=${selectedBranchId}`);
      if (res.success && res.data) {
        setFinancialAccounts(res.data.filter((a) => a.isActive));
        if (res.data.length > 0 && !recordAccountId) {
          setRecordAccountId(res.data[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load accounts", e);
    }
  };

  // Load Expenses, Recurring Configs, and Summary
  const loadData = async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      setError(null);

      const [expRes, recRes, sumRes] = await Promise.all([
        fetchApi<{ items: ExpenseRecord[] }>(
          `/accounting/expenses?branchId=${selectedBranchId}&expenseMonth=${currentMonth}${categoryFilter !== "ALL" ? `&category=${categoryFilter}` : ""}`
        ),
        fetchApi<RecurringConfig[]>(`/accounting/recurring-expenses?branchId=${selectedBranchId}`),
        fetchApi<ExpenseSummary>(`/accounting/expenses/summary?branchId=${selectedBranchId}&month=${currentMonth}`),
      ]);

      if (expRes.success && expRes.data) {
        setExpenses(expRes.data.items || (expRes.data as any) || []);
      }
      if (recRes.success && recRes.data) {
        setRecurringConfigs(recRes.data);
      }
      if (sumRes.success && sumRes.data) {
        setSummary(sumRes.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load branch expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    loadData();
  }, [selectedBranchId, currentMonth, categoryFilter]);

  // Quick action: Pay Recurring Bill
  const handlePayRecurring = (config: RecurringConfig) => {
    setRecordCategory(config.category);
    setRecordTitle(config.title);
    setRecordMonth(currentMonth);
    setRecordAmount(config.estimatedAmount);
    setRecordRecurringId(config.id);
    setRecordNotes(config.notes || "");
    setRecordVoucher("");
    setRecordRef("");
    setIsRecordModalOpen(true);
  };

  // Submit Expense Payment
  const handleRecordExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;
    if (!recordAccountId) {
      setError("Please select a financial account for payment.");
      return;
    }
    if (!recordAmount || Number(recordAmount) <= 0) {
      setError("Please enter a valid expense amount.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetchApi<{ success: boolean; message: string }>("/accounting/expenses", {
        method: "POST",
        body: JSON.stringify({
          branchId: selectedBranchId,
          financialAccountId: recordAccountId,
          recurringConfigId: recordRecurringId || null,
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
        setSuccessMsg("Expense payment recorded successfully! Financial account debited.");
        setIsRecordModalOpen(false);
        // Reset form
        setRecordTitle("");
        setRecordAmount("");
        setRecordVoucher("");
        setRecordRef("");
        setRecordNotes("");
        setRecordRecurringId(null);
        await Promise.all([loadData(), loadAccounts()]);
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        setError(res.message || "Failed to record expense");
      }
    } catch (err: any) {
      setError(err.message || "Failed to record expense");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Recurring Bill Template
  const handleRecurringSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;
    if (!recAmount || Number(recAmount) <= 0) {
      setError("Please enter an estimated amount.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetchApi<{ success: boolean; message: string }>("/accounting/recurring-expenses", {
        method: "POST",
        body: JSON.stringify({
          branchId: selectedBranchId,
          category: recCategory,
          title: recTitle.trim(),
          estimatedAmount: Number(recAmount),
          dueDay: recDueDay ? Number(recDueDay) : null,
          notes: recNotes.trim() || null,
        }),
      });

      if (res.success) {
        setSuccessMsg("Recurring bill configured successfully!");
        setIsRecurringModalOpen(false);
        setRecTitle("");
        setRecAmount("");
        setRecDueDay("");
        setRecNotes("");
        await loadData();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(res.message || "Failed to configure recurring bill");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save recurring bill");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredExpenses = expenses.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.voucherNo && item.voucherNo.toLowerCase().includes(q)) ||
      (item.financialAccount?.name && item.financialAccount.name.toLowerCase().includes(q))
    );
  });

  const selectedAccount = financialAccounts.find((a) => a.id === recordAccountId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Receipt className="h-6 w-6 text-brand-primary" />
            Branch Expenses & Bills
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage recurring monthly obligations (Shop Rent, Electricity, Salaries) and debit payments directly from branch financial accounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setRecordCategory("SHOP_RENT");
              setRecordTitle("");
              setRecordAmount("");
              setRecordRecurringId(null);
              setIsRecordModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-brand-primary hover:bg-brand-primary/90 text-white shadow-sm flex items-center gap-2 transition"
          >
            <Plus className="h-4 w-4" />
            Record Payment
          </button>
          <button
            onClick={() => setIsRecurringModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs flex items-center gap-2 transition"
          >
            <CalendarDays className="h-4 w-4 text-slate-500" />
            Set Recurring Bill
          </button>
        </div>
      </div>

      {/* Status Banners */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-between gap-3 text-xs text-red-600 dark:text-red-400">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold">×</button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Monthly KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Expenses</span>
            <DollarSign className="h-4 w-4 text-brand-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            ৳{summary.totalExpenses.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            {currentMonth} • {summary.count} payments
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-blue-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Shop Rent</span>
            <Home className="h-4 w-4" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            ৳{summary.shopRent.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400">Monthly lease</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Electricity</span>
            <Zap className="h-4 w-4" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            ৳{summary.electricityBill.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400">Utilities bill</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-emerald-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Staff Salaries</span>
            <Users className="h-4 w-4" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            ৳{summary.employeeSalary.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400">Payroll paid</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-purple-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Other Regular</span>
            <Layers className="h-4 w-4" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            ৳{summary.otherExpenses.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400">Misc operations</div>
        </div>
      </div>

      {/* Tabs Navigation & Month Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("monthly")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === "monthly"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Receipt className="h-4 w-4" />
            Monthly Expenses ({expenses.length})
          </button>
          <button
            onClick={() => setActiveTab("recurring")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === "recurring"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            Recurring Bills Setup ({recurringConfigs.length})
          </button>
        </div>

        {/* Month Selector & Category Filter */}
        {activeTab === "monthly" && (
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative">
              <input
                type="month"
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-xs focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="SHOP_RENT">Shop Rent</option>
              <option value="ELECTRICITY_BILL">Electricity Bill</option>
              <option value="EMPLOYEE_SALARY">Employee Salary</option>
              <option value="OTHER">Other Expenses</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: Monthly Expenses Table */}
      {activeTab === "monthly" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, voucher #, or account..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
            <button
              onClick={loadData}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
                <span className="text-xs">Loading monthly expense records...</span>
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Receipt className="h-6 w-6" />
                </div>
                <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  No expense payments recorded for {currentMonth}
                </div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Record monthly shop rent, electricity bills, or regular expenses using the button above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Date / Voucher</th>
                      <th className="py-3 px-4">Expense Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Paid From Account</th>
                      <th className="py-3 px-4">Recorded By</th>
                      <th className="py-3 px-4 text-right">Amount Debited</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
                    {filteredExpenses.map((exp) => {
                      const meta = CATEGORY_META[exp.category] || CATEGORY_META.OTHER;
                      const Icon = meta.icon;
                      return (
                        <tr key={exp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 font-mono">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {new Date(exp.paymentDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {exp.voucherNo ? `Voucher: ${exp.voucherNo}` : exp.id.slice(0, 8)}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">{exp.title}</div>
                            {exp.notes && <div className="text-[11px] text-slate-400 italic truncate max-w-xs">{exp.notes}</div>}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${meta.bg} ${meta.text} ${meta.border}`}>
                              <Icon className="h-3 w-3" />
                              {meta.label}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <Wallet className="h-3.5 w-3.5 text-brand-primary" />
                              <div>
                                <div className="font-bold text-slate-800 dark:text-slate-200">
                                  {exp.financialAccount?.name || "Branch Account"}
                                </div>
                                <div className="text-[10px] text-slate-400 uppercase">
                                  {exp.financialAccount?.type} {exp.financialAccount?.accountNumber ? `(•${exp.financialAccount.accountNumber.slice(-4)})` : ""}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-500">
                            {exp.recordedBy?.name || exp.recordedBy?.username || "System"}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <span className="font-black text-sm text-red-600 dark:text-red-400 font-mono">
                              -৳{Number(exp.amount).toLocaleString()}
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
      )}

      {/* TAB 2: Recurring Bills Configuration */}
      {activeTab === "recurring" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs leading-relaxed flex items-start gap-3">
            <Clock className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <strong>Recurring Expenses:</strong> Set up your monthly branch commitments like Shop Rent, estimated DESCO/NESCO Electricity, Internet, or Guard fees. Each month you can record actual payments from an active financial account with a single click.
            </div>
          </div>

          {recurringConfigs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                No recurring bills configured yet
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Configure your shop rent, electricity, and recurring costs to keep monthly branch operations organized.
              </p>
              <button
                onClick={() => setIsRecurringModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-primary text-white hover:bg-brand-primary/90 transition inline-flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Configure First Recurring Bill
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recurringConfigs.map((item) => {
                const meta = CATEGORY_META[item.category] || CATEGORY_META.OTHER;
                const Icon = meta.icon;

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-brand-primary/40 transition"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${meta.bg} ${meta.text} ${meta.border}`}>
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                        {item.dueDay && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            Due: Day {item.dueDay} of month
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                          {item.title}
                        </h3>
                        {item.notes && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {item.notes}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                        <span className="text-xs text-slate-400 font-medium">Estimated Amount</span>
                        <span className="text-xl font-black text-brand-primary">
                          ৳{Number(item.estimatedAmount).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePayRecurring(item)}
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white border border-brand-primary/20 transition flex items-center justify-center gap-1.5"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      Pay This Month's Bill
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Record Expense Payment */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center border border-brand-primary/20">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Record Expense Payment</h2>
                  <p className="text-xs text-slate-500">Debits the selected financial account immediately</p>
                </div>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleRecordExpenseSubmit} className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Expense Category
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(["SHOP_RENT", "ELECTRICITY_BILL", "EMPLOYEE_SALARY", "OTHER"] as const).map((cat) => {
                    const isSelected = recordCategory === cat;
                    const meta = CATEGORY_META[cat];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setRecordCategory(cat)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                          isSelected
                            ? "bg-brand-primary text-white border-brand-primary shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[10px] text-center leading-tight">{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title & Month */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expense Title / Description
                  </label>
                  <input
                    type="text"
                    required
                    value={recordTitle}
                    onChange={(e) => setRecordTitle(e.target.value)}
                    placeholder="e.g. Shop Rent Level 1 - Sept 2026"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expense Month
                  </label>
                  <input
                    type="month"
                    required
                    value={recordMonth}
                    onChange={(e) => setRecordMonth(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount to Pay (৳)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={recordAmount}
                    onChange={(e) => setRecordAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
              </div>

              {/* CRITICAL: Branch Financial Account Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Debit From Branch Financial Account</span>
                  {selectedAccount && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      Balance: ৳{Number(selectedAccount.balance).toLocaleString()}
                    </span>
                  )}
                </label>

                {financialAccounts.length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400">
                    No active financial account exists for this branch. Please create a Cash, Bank, or Mobile account in Accounts & Finance before recording payments.
                  </div>
                ) : (
                  <select
                    value={recordAccountId}
                    onChange={(e) => setRecordAccountId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  >
                    {financialAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type}) — Avail: ৳{Number(acc.balance).toLocaleString()}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Voucher / Txn Ref */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Voucher / Bill No (optional)
                  </label>
                  <input
                    type="text"
                    value={recordVoucher}
                    onChange={(e) => setRecordVoucher(e.target.value)}
                    placeholder="e.g. VCH-2026-09"
                    className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bank / Txn Ref (optional)
                  </label>
                  <input
                    type="text"
                    value={recordRef}
                    onChange={(e) => setRecordRef(e.target.value)}
                    placeholder="e.g. TR-83921"
                    className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Notes (optional)
                </label>
                <textarea
                  rows={2}
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  placeholder="Additional payment details..."
                  className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || financialAccounts.length === 0}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-primary hover:bg-brand-primary/90 text-white shadow-sm flex items-center gap-2 transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirm & Debit Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Configure Recurring Bill */}
      {isRecurringModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Configure Recurring Bill</h2>
                  <p className="text-xs text-slate-500">Rent, electricity, or regular monthly obligations</p>
                </div>
              </div>
              <button
                onClick={() => setIsRecurringModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleRecurringSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={recCategory}
                  onChange={(e) => setRecCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="SHOP_RENT">Shop Rent</option>
                  <option value="ELECTRICITY_BILL">Electricity Bill</option>
                  <option value="EMPLOYEE_SALARY">Employee Salary (Fixed)</option>
                  <option value="OTHER">Other Expenses</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bill Title
                </label>
                <input
                  type="text"
                  required
                  value={recTitle}
                  onChange={(e) => setRecTitle(e.target.value)}
                  placeholder="e.g. Shop Rent - Main Road Branch"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Amount (৳)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-brand-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Due Day of Month
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={recDueDay}
                    onChange={(e) => setRecDueDay(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 5"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Billing Account info (optional)
                </label>
                <textarea
                  rows={2}
                  value={recNotes}
                  onChange={(e) => setRecNotes(e.target.value)}
                  placeholder="Landlord contact, DESCO customer ID, etc."
                  className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRecurringModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-primary hover:bg-brand-primary/90 text-white shadow-sm flex items-center gap-2 transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Recurring Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
