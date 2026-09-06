"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { OwnerModule } from "./DashboardSidebar";
import {
  Users,
  DollarSign,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  RefreshCw,
  Plus,
  ArrowRight,
  Shield,
  Briefcase,
  Layers,
  ChevronRight,
  Loader2,
  Calendar,
  CreditCard,
  Building,
  Check,
  CalendarCheck,
  Lock,
  Sparkles,
} from "lucide-react";

interface SalaryManagementViewProps {
  selectedBranchId?: string;
  onSelectEmployee: (employeeId: string) => void;
  onNavigate?: (module: OwnerModule) => void;
}

interface SalaryConfig {
  id?: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  paymentMethod?: string | null;
  paymentDetails?: string | null;
  effectiveDate?: string | null;
  notes?: string | null;
}

interface MonthStatus {
  month: string;
  baseSalary?: number;
  workingDays?: number;
  offDays?: number;
  totalDays?: number;
  presentDays?: number;
  absentDays?: number;
  unpaidLeaveDays?: number;
  paidLeaveDays?: number;
  dailyRate?: number;
  attendanceDeduction?: number;
  totalAllowances?: number;
  allowancesList?: any[];
  netSalary: number;
  paidAmount: number;
  dueAmount: number;
  status: "PAID" | "PARTIAL" | "DUE";
  disbursements: any[];
}

interface EmployeeItem {
  id: string;
  name?: string;
  username: string;
  email?: string;
  phone?: string;
  role: string;
  customRoleName?: string;
  pharmacyRoleName?: string;
  avatarUrl?: string;
  branchId?: string;
  branchName?: string;
  createdAt: string;
  salaryConfig?: SalaryConfig | null;
  monthStatus: MonthStatus;
}

interface FinancialAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  isActive: boolean;
}

export function SalaryManagementView({
  selectedBranchId,
  onSelectEmployee,
  onNavigate,
}: SalaryManagementViewProps) {
  const { user, hasPermission } = useAuth();
  const isOwner = user?.role === "COMPANY_OWNER" || user?.role === "SUPER_ADMIN";
  const isBranchManager = user?.role === "BRANCH_MANAGER" || user?.pharmacyRoleName?.toLowerCase().includes("branch manager");
  const canSetBaseSalary = isOwner || isBranchManager || (hasPermission ? hasPermission("salaries.base_salary.edit") : false);

  const [currentMonth, setCurrentMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick Pay Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payEmployee, setPayEmployee] = useState<EmployeeItem | null>(null);
  const [payAccountId, setPayAccountId] = useState("");
  const [payAmount, setPayAmount] = useState<number | "">("");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");

  // Allowance Modal State
  const [isAllowanceModalOpen, setIsAllowanceModalOpen] = useState(false);
  const [allowanceEmployee, setAllowanceEmployee] = useState<EmployeeItem | null>(null);
  const [allowanceTitle, setAllowanceTitle] = useState("");
  const [allowanceAmount, setAllowanceAmount] = useState<number | "">("");
  const [existingAllowances, setExistingAllowances] = useState<any[]>([]);
  const [loadingAllowances, setLoadingAllowances] = useState(false);


  // Load Branch Financial Accounts
  const loadAccounts = async () => {
    if (!selectedBranchId) return;
    try {
      const res = await fetchApi<FinancialAccount[]>(`/accounting/accounts?branchId=${selectedBranchId}`);
      if (res.success && res.data) {
        setFinancialAccounts(res.data.filter((a) => a.isActive));
        if (res.data.length > 0 && !payAccountId) {
          setPayAccountId(res.data[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load financial accounts", e);
    }
  };

  // Load Branch Staff with Salary Status for currentMonth
  const loadEmployees = async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<EmployeeItem[]>(
        `/accounting/salaries/employees?branchId=${selectedBranchId}&month=${currentMonth}`
      );
      if (res.success && res.data) {
        setEmployees(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load branch employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    loadEmployees();
  }, [selectedBranchId, currentMonth]);

  // Open Quick Pay Modal
  const openPayModal = (emp: EmployeeItem) => {
    setPayEmployee(emp);
    const due = emp.monthStatus.dueAmount;
    setPayAmount(due > 0 ? due : emp.monthStatus.netSalary || "");
    setPayRef("");
    setPayNotes("");
    setIsPayModalOpen(true);
  };

  // Open Allowance Modal
  const openAllowanceModal = (emp: EmployeeItem) => {
    setAllowanceEmployee(emp);
    setAllowanceTitle("");
    setAllowanceAmount("");
    setIsAllowanceModalOpen(true);
    fetchAllowances(emp.id);
  };

  const fetchAllowances = async (userId: string) => {
    if (!selectedBranchId) return;
    try {
      setLoadingAllowances(true);
      const res = await fetchApi<any[]>(`/attendance/allowances?branchId=${selectedBranchId}&userId=${userId}&month=${currentMonth}`);
      if (res.success && res.data) {
        setExistingAllowances(res.data);
      }
    } catch (e) {
      console.error("Failed to load employee allowances", e);
    } finally {
      setLoadingAllowances(false);
    }
  };

  const handleAddAllowance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowanceEmployee || !selectedBranchId) return;
    if (!allowanceTitle.trim()) {
      setError("Please enter an allowance title.");
      return;
    }
    if (!allowanceAmount || Number(allowanceAmount) <= 0) {
      setError("Please enter a valid allowance amount.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetchApi<{ success: boolean; message: string }>("/attendance/allowances", {
        method: "POST",
        body: JSON.stringify({
          branchId: selectedBranchId,
          userId: allowanceEmployee.id,
          month: currentMonth,
          title: allowanceTitle.trim(),
          amount: Number(allowanceAmount),
        }),
      });

      if (res.success) {
        setSuccessMsg(`Allowance added for ${allowanceEmployee.name || allowanceEmployee.username}!`);
        setAllowanceTitle("");
        setAllowanceAmount("");
        await Promise.all([loadEmployees(), fetchAllowances(allowanceEmployee.id)]);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(res.message || "Failed to add allowance");
      }
    } catch (err: any) {
      setError(err.message || "Failed to add allowance");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAllowance = async (allowanceId: string) => {
    if (!allowanceEmployee) return;
    try {
      setSubmitting(true);
      setError(null);
      const res = await fetchApi<{ success: boolean; message: string }>(`/attendance/allowances/${allowanceId}`, {
        method: "DELETE",
      });

      if (res.success) {
        setSuccessMsg("Allowance removed.");
        await Promise.all([loadEmployees(), fetchAllowances(allowanceEmployee.id)]);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(res.message || "Failed to remove allowance");
      }
    } catch (err: any) {
      setError(err.message || "Failed to remove allowance");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Pay Submit
  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payEmployee || !selectedBranchId) return;
    if (!payAccountId) {
      setError("Please select a valid financial account to disburse salary.");
      return;
    }
    if (!payAmount || Number(payAmount) <= 0) {
      setError("Please enter a valid disbursement amount.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetchApi<{ success: boolean; message: string }>("/accounting/salaries/disburse", {
        method: "POST",
        body: JSON.stringify({
          branchId: selectedBranchId,
          userId: payEmployee.id,
          financialAccountId: payAccountId,
          month: currentMonth,
          paidAmount: Number(payAmount),
          paymentRef: payRef.trim() || null,
          notes: payNotes.trim() || null,
        }),
      });

      if (res.success) {
        setSuccessMsg(`Salary paid to ${payEmployee.name || payEmployee.username}! Financial account debited.`);
        setIsPayModalOpen(false);
        await Promise.all([loadEmployees(), loadAccounts()]);
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        setError(res.message || "Failed to process salary payment");
      }
    } catch (err: any) {
      setError(err.message || "Failed to disburse salary");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    // Exclude Company Owner and Super Admin from branch salary management
    if (emp.role === "COMPANY_OWNER" || emp.role === "SUPER_ADMIN") return false;
    if (selectedBranchId && emp.branchId && emp.branchId !== selectedBranchId) return false;

    const matchesSearch =
      !searchQuery ||
      (emp.name && emp.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      emp.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.phone && emp.phone.includes(searchQuery));

    const matchesStatus =
      statusFilter === "ALL" || emp.monthStatus.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const selectedAccount = financialAccounts.find((a) => a.id === payAccountId);

  // Avatar Initials
  const getInitials = (emp: EmployeeItem) => {
    if (emp.name) {
      const parts = emp.name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return emp.name.slice(0, 2).toUpperCase();
    }
    return emp.username.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Users className="h-6 w-6 text-brand-primary" />
            Branch Staff Salary Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure salary packages, monitor monthly disbursement status, and pay salaries directly from branch financial accounts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate?.("sal_attendance")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-xs"
          >
            <CalendarCheck className="h-3.5 w-3.5 text-blue-500" />
            Attendance & Off-Days
          </button>

          <button
            onClick={() => onNavigate?.("sal_employees")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-xs"
          >
            <Users className="h-3.5 w-3.5 text-emerald-500" />
            Employee List
          </button>

          <button
            onClick={() => onNavigate?.("sal_history")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-xs"
          >
            <Clock className="h-3.5 w-3.5 text-purple-500" />
            Salary History
          </button>

          {/* Month Selector */}
          <div className="relative flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="month"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={loadEmployees}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition shadow-xs"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Alerts */}
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

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee by name, username, or phone..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          {[
            { id: "ALL", label: "All Staff" },
            { id: "DUE", label: "Due" },
            { id: "PARTIAL", label: "Partial" },
            { id: "PAID", label: "Paid" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Salary Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
            <span className="text-xs">Loading branch staff and salary records...</span>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="h-6 w-6" />
            </div>
            <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              No staff members found
            </div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Add staff members to this branch in Staff Management to configure their payroll.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Base Package</th>
                  <th className="py-3 px-4">Attendance ({currentMonth})</th>
                  <th className="py-3 px-4">Net Payable</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Paid / Due</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
                {filteredEmployees.map((emp) => {
                  const roleName = emp.pharmacyRoleName || emp.customRoleName || emp.role?.replace(/_/g, " ");
                  const status = emp.monthStatus.status;
                  const config = emp.salaryConfig;
                  const mStatus = emp.monthStatus;
                  const absentOrUnpaid = (mStatus.absentDays || 0) + (mStatus.unpaidLeaveDays || 0);

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition cursor-pointer group"
                      onClick={() => onSelectEmployee(emp.id)}
                    >
                      {/* Employee Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {emp.avatarUrl ? (
                            <img
                              src={emp.avatarUrl}
                              alt={emp.name || "Avatar"}
                              className="h-10 w-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-primary to-teal-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                              {getInitials(emp)}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white group-hover:text-brand-primary transition">
                              {emp.name || emp.username}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {emp.phone || `@${emp.username}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                          <Shield className="h-2.5 w-2.5 text-brand-primary" />
                          {roleName}
                        </span>
                      </td>

                      {/* Base Package */}
                      <td className="py-3.5 px-4">
                        {config ? (
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">
                              ৳{config.baseSalary.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Daily Rate: ৳{(mStatus.dailyRate || 0).toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-600 font-medium">Not Configured</span>
                        )}
                      </td>

                      {/* Attendance Breakdown */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {mStatus.workingDays ?? 0} Working Days
                            </span>
                            <span className="text-slate-400">({mStatus.offDays ?? 0} off)</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-emerald-600 font-bold">
                              ✓ {mStatus.presentDays ?? 0} Present
                            </span>
                            {absentOrUnpaid > 0 && (
                              <span className="text-rose-600 font-bold">
                                ✗ {absentOrUnpaid} Absent
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Net Payable & Adjustments */}
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="font-black text-slate-900 dark:text-white text-sm">
                            ৳{mStatus.netSalary.toLocaleString()}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            {(mStatus.attendanceDeduction || 0) > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-rose-600 font-semibold" title="System attendance deduction (locked)">
                                <Lock className="h-2.5 w-2.5" />
                                -৳{mStatus.attendanceDeduction?.toLocaleString()}
                              </span>
                            )}
                            {(mStatus.totalAllowances || 0) > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold" title="Dynamic allowances">
                                <Sparkles className="h-2.5 w-2.5" />
                                +৳{mStatus.totalAllowances?.toLocaleString()}
                              </span>
                            )}
                            {(!mStatus.attendanceDeduction && !mStatus.totalAllowances) && (
                              <span className="text-slate-400">No deductions</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {status === "PAID" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            Paid
                          </span>
                        )}
                        {status === "PARTIAL" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="h-3 w-3" />
                            Partial
                          </span>
                        )}
                        {status === "DUE" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <AlertCircle className="h-3 w-3" />
                            Due
                          </span>
                        )}
                      </td>

                      {/* Paid vs Due */}
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                            Paid: ৳{emp.monthStatus.paidAmount.toLocaleString()}
                          </div>
                          {emp.monthStatus.dueAmount > 0 && (
                            <div className="font-bold text-rose-600 dark:text-rose-400 text-[11px]">
                              Due: ৳{emp.monthStatus.dueAmount.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openPayModal(emp)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-primary hover:bg-brand-primary/90 text-white shadow-xs transition"
                          >
                            Pay Salary
                          </button>
                          <button
                            onClick={() => openAllowanceModal(emp)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 transition"
                            title="Add monthly allowance (e.g. bonus, overtime)"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Add Allowance (Optional)
                          </button>
                          <button
                            onClick={() => onSelectEmployee(emp.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-primary transition"
                            title="View Employee Full Details"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
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

      {/* MODAL: Pay Salary */}
      {isPayModalOpen && payEmployee && (() => {
        const mStatus = payEmployee.monthStatus;
        const attMetrics = (payEmployee as any).attendanceMetrics;
        const config = payEmployee.salaryConfig;

        const baseSalary = mStatus?.baseSalary ?? attMetrics?.baseSalary ?? config?.baseSalary ?? 0;
        const workingDays = mStatus?.workingDays ?? attMetrics?.totalWorkingDays ?? 0;
        const presentDays = mStatus?.presentDays ?? attMetrics?.presentDays ?? 0;
        const offDays = mStatus?.offDays ?? attMetrics?.offDays ?? 0;
        const absentDays = (mStatus?.absentDays ?? attMetrics?.absentDays ?? 0) + (mStatus?.unpaidLeaveDays ?? attMetrics?.unpaidLeaveDays ?? 0);
        const allowance = mStatus?.totalAllowances ?? attMetrics?.totalAllowances ?? 0;
        const netSalary = mStatus?.netSalary ?? attMetrics?.finalPayable ?? 0;
        const paidAmount = mStatus?.paidAmount ?? 0;
        const dueAmount = mStatus?.dueAmount ?? 0;

        const autoDeduction = (mStatus?.attendanceDeduction && mStatus.attendanceDeduction > 0)
          ? mStatus.attendanceDeduction
          : (attMetrics?.attendanceDeduction && attMetrics.attendanceDeduction > 0)
            ? attMetrics.attendanceDeduction
            : Math.max(0, Number((baseSalary + allowance - netSalary).toFixed(2)));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center border border-brand-primary/20">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                      Disburse Salary: {payEmployee.name || payEmployee.username}
                    </h2>
                    <p className="text-xs text-slate-500">Month: {currentMonth}</p>
                  </div>
                </div>
                <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 font-bold p-1">×</button>
              </div>

              <form onSubmit={handlePaySubmit} className="space-y-4">
                {/* Payment Summary Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  {/* 1. Base Salary */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Base Salary:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      ৳{baseSalary.toLocaleString()}
                    </span>
                  </div>

                  {/* 2. Attendance / Working Days */}
                  <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-medium">Attendance / Working Days:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                      {presentDays} Present / {workingDays} Working Days ({offDays} off)
                    </span>
                  </div>

                  {/* 3. Absent Days */}
                  <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-medium">Absent Days:</span>
                    <span className={`font-semibold font-mono ${absentDays > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"}`}>
                      {absentDays} Days
                    </span>
                  </div>

                  {/* 4. Auto Deduction (read-only) */}
                  <div className="flex justify-between items-center bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl text-rose-700 dark:text-rose-300 font-semibold border border-rose-200/50">
                    <span className="flex items-center gap-1.5">
                      <Lock className="h-3 w-3 shrink-0 text-rose-600 dark:text-rose-400" />
                      Auto Deduction (read-only):
                    </span>
                    <span className="font-bold font-mono">
                      -৳{autoDeduction.toLocaleString()}
                    </span>
                  </div>

                  {/* 5. Allowance */}
                  <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200/50">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      Allowance:
                    </span>
                    <span className="font-bold font-mono">
                      +৳{allowance.toLocaleString()}
                    </span>
                  </div>

                  {/* 6. Final Payable */}
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-bold">
                    <span className="text-slate-800 dark:text-slate-200">Final Payable:</span>
                    <span className="font-black text-slate-900 dark:text-white text-sm font-mono">
                      ৳{netSalary.toLocaleString()}
                    </span>
                  </div>

                  {/* 7. Already Paid */}
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Already Paid:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                      ৳{paidAmount.toLocaleString()}
                    </span>
                  </div>

                  {/* 8. Remaining Due */}
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1.5">
                    <span className="text-slate-700 dark:text-slate-300 font-bold">Remaining Due:</span>
                    <span className="font-black text-rose-600 dark:text-rose-400 text-sm font-mono">
                      ৳{dueAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Amount to Pay */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Disbursement Amount (৳)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl text-base font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-brand-primary focus:outline-none"
                  />
                </div>

                {/* Branch Financial Account */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Pay From Branch Financial Account</span>
                    {selectedAccount && (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        Balance: ৳{Number(selectedAccount.balance).toLocaleString()}
                      </span>
                    )}
                  </label>

                  {financialAccounts.length === 0 ? (
                    <div className="p-3 rounded-xl bg-red-50 text-xs text-red-600 border border-red-200">
                      No active financial account exists for this branch.
                    </div>
                  ) : (
                    <select
                      value={payAccountId}
                      onChange={(e) => setPayAccountId(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                    >
                      {financialAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type}) — Avail: ৳{Number(acc.balance).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Ref & Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Reference / Voucher No. (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SAL-VCH-9012"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="Remarks..."
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none resize-none"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsPayModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || financialAccounts.length === 0}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-primary hover:bg-brand-primary/90 text-white shadow-sm flex items-center gap-2 transition disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Confirm Salary Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL: Add Allowance (Optional) */}
      {isAllowanceModalOpen && allowanceEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    Add Allowance (Optional)
                  </h2>
                  <p className="text-xs text-slate-500">{allowanceEmployee.name || allowanceEmployee.username} • {currentMonth}</p>
                </div>
              </div>
              <button onClick={() => setIsAllowanceModalOpen(false)} className="text-slate-400 font-bold p-1">✕</button>
            </div>

            {/* Form to add allowance */}
            <form onSubmit={handleAddAllowance} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Allowance Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Performance Bonus, Overtime"
                  value={allowanceTitle}
                  onChange={(e) => setAllowanceTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Allowance Amount (৳) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="e.g. 1000"
                  value={allowanceAmount}
                  onChange={(e) => setAllowanceAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-emerald-600 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAllowanceModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2 transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Allowance
                </button>
              </div>
            </form>

            {/* List of active allowances for this month */}
            {existingAllowances.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Allowances Added for {currentMonth}
                </h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {existingAllowances.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{item.title}</div>
                        <div className="text-[10px] text-emerald-600 font-bold">+৳{Number(item.amount).toLocaleString()}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAllowance(item.id)}
                        disabled={submitting}
                        className="text-xs text-rose-500 hover:text-rose-700 font-semibold p-1"
                        title="Remove Allowance"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
