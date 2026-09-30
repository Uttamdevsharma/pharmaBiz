"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { showAlert, showToast } from "@/lib/swal";
import { useAuth } from "@/context/AuthContext";
import { useBranchContext } from "@/context/BranchContext";
import { OwnerModule } from "./DashboardSidebar";
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  RefreshCw,
  Shield,
  Loader2,
  Calendar,
  CalendarCheck,
  Store,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
  monthlyAllowances?: any[];
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
  nidNumber?: string | null;
  nidFrontUrl?: string | null;
  nidBackUrl?: string | null;
  documentsSubmitted?: boolean;
  salaryConfig?: SalaryConfig | null;
  monthStatus?: MonthStatus | null;
}

interface FinancialAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  isDefault: boolean;
  isActive: boolean;
  bankName?: string;
  accountNumber?: string;
  branchId?: string;
  branchName?: string;
}

// Persistent module cache
let cachedSalaryEmployees: EmployeeItem[] = [];
let cachedSalaryAccounts: FinancialAccount[] = [];


export function SalaryManagementView({
  selectedBranchId: propBranchId,
  onSelectEmployee,
  onNavigate,
}: SalaryManagementViewProps) {
  const { user, hasPermission } = useAuth();
  const {
    branches,
    selectedBranchId: contextBranchId,
    currentBranch,
    isAllBranches,
  } = useBranchContext();

  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;

  const [currentMonth, setCurrentMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [employees, setEmployees] = useState<EmployeeItem[]>(() => cachedSalaryEmployees);
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>(() => cachedSalaryAccounts);
  const [loading, setLoading] = useState(() => cachedSalaryEmployees.length === 0);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

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

  // Load Financial Accounts
  const loadAccounts = async () => {
    try {
      const url = (effectiveBranchId && effectiveBranchId !== "all")
        ? `/accounting/accounts?branchId=${effectiveBranchId}`
        : "/accounting/accounts";
      const res = await fetchApi<FinancialAccount[]>(url);
      if (res.success && res.data) {
        setFinancialAccounts(res.data.filter((a) => a.isActive));
        cachedSalaryAccounts = res.data.filter((a) => a.isActive);
        if (res.data.length > 0 && !payAccountId) {
          setPayAccountId(res.data[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load financial accounts", e);
    }
  };

  // Load Staff with Salary Status for currentMonth
  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();
      if (effectiveBranchId && effectiveBranchId !== "all") {
        queryParams.append("branchId", effectiveBranchId);
      }
      queryParams.append("month", currentMonth);
      const res = await fetchApi<EmployeeItem[]>(
        `/accounting/salaries/employees?${queryParams.toString()}`
      );
      if (res.success && res.data) {
        setEmployees(res.data);
        cachedSalaryEmployees = res.data;
      }
    } catch (err: any) {
      setError(err.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    loadEmployees();
  }, [effectiveBranchId, currentMonth]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, currentMonth, effectiveBranchId]);

  // Open Quick Pay Modal
  const openPayModal = (emp: EmployeeItem) => {
    if (!emp.documentsSubmitted) {
      showAlert.warning(
        "Documents Pending",
        `"${emp.name || emp.username}" has not submitted the required certificates & documents. Salary disbursement is blocked until verified.`
      );
      return;
    }
    setPayEmployee(emp);
    if (emp.monthStatus?.monthlyAllowances && Array.isArray(emp.monthStatus.monthlyAllowances)) {
      setExistingAllowances(emp.monthStatus.monthlyAllowances);
    } else {
      setExistingAllowances([]);
    }
    const due = emp.monthStatus?.dueAmount ?? 0;
    setPayAmount(due > 0 ? due : (emp.monthStatus?.netSalary || ""));
    setPayRef("");
    setPayNotes("");
    setIsPayModalOpen(true);
    fetchAllowances(emp.id);
  };

  // Open Adjust / Edit Modal (allows additional salary payment if mistakenly underpaid)
  const openAdjustModal = (emp: EmployeeItem) => {
    setPayEmployee(emp);
    if (emp.monthStatus?.monthlyAllowances && Array.isArray(emp.monthStatus.monthlyAllowances)) {
      setExistingAllowances(emp.monthStatus.monthlyAllowances);
    } else {
      setExistingAllowances([]);
    }
    const due = emp.monthStatus?.dueAmount ?? 0;
    setPayAmount(due > 0 ? due : "");
    setPayRef("");
    setPayNotes("Salary adjustment / additional payment");
    setIsPayModalOpen(true);
    fetchAllowances(emp.id);
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
    try {
      setLoadingAllowances(true);
      const branchParam = effectiveBranchId && effectiveBranchId !== "all" ? `&branchId=${effectiveBranchId}` : "";
      const res = await fetchApi<any[]>(`/attendance/allowances?userId=${userId}&month=${currentMonth}${branchParam}`);
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
    const targetBranch = allowanceEmployee?.branchId || (effectiveBranchId && effectiveBranchId !== "all" ? effectiveBranchId : branches[0]?.id);
    if (!allowanceEmployee || !targetBranch) return;
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
          branchId: targetBranch,
          userId: allowanceEmployee.id,
          month: currentMonth,
          title: allowanceTitle.trim(),
          amount: Number(allowanceAmount),
        }),
      });

      if (res.success) {
        showToast(`Allowance added for ${allowanceEmployee.name || allowanceEmployee.username}!`, "success");
        setAllowanceTitle("");
        setAllowanceAmount("");
        await Promise.all([loadEmployees(), fetchAllowances(allowanceEmployee.id)]);
      } else {
        const msg = res.message || "Failed to add allowance";
        setError(msg);
        showToast(msg, "error");
      }
    } catch (err: any) {
      const msg = err.message || "Failed to add allowance";
      setError(msg);
      showToast(msg, "error");
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
        showToast("Allowance removed.", "success");
        await Promise.all([loadEmployees(), fetchAllowances(allowanceEmployee.id)]);
      } else {
        const msg = res.message || "Failed to remove allowance";
        setError(msg);
        showToast(msg, "error");
      }
    } catch (err: any) {
      const msg = err.message || "Failed to remove allowance";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Pay Submit
  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBranch = payEmployee?.branchId || (effectiveBranchId && effectiveBranchId !== "all" ? effectiveBranchId : branches[0]?.id);
    if (!payEmployee || !targetBranch) return;
    if (!payEmployee.documentsSubmitted) {
      setError("Employee has not submitted the required certificates/documents. Salary disbursement blocked.");
      showAlert.warning(
        "Documents Pending",
        "This employee has not submitted the required certificates and documents. Salary disbursement is blocked."
      );
      return;
    }
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
          branchId: targetBranch,
          userId: payEmployee.id,
          financialAccountId: payAccountId,
          month: currentMonth,
          paidAmount: Number(payAmount),
          paymentRef: payRef.trim() || null,
          notes: payNotes.trim() || null,
        }),
      });

      if (res.success) {
        showToast(`Salary paid to ${payEmployee.name || payEmployee.username}! Financial account debited.`, "success");
        setIsPayModalOpen(false);
        await Promise.all([loadEmployees(), loadAccounts()]);
      } else {
        const msg = res.message || "Failed to process salary payment";
        setError(msg);
        showToast(msg, "error");
      }
    } catch (err: any) {
      const msg = err.message || "Failed to disburse salary";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    // Exclude Company Owner and Super Admin from branch salary management
    if (emp.role === "COMPANY_OWNER" || emp.role === "SUPER_ADMIN") return false;
    if (effectiveBranchId && effectiveBranchId !== "all" && emp.branchId && emp.branchId !== effectiveBranchId) return false;

    const matchesSearch =
      !searchQuery ||
      (emp.name && emp.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      emp.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.phone && emp.phone.includes(searchQuery));

    const matchesStatus =
      statusFilter === "ALL" || emp.monthStatus?.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate status counts for inline summary
  const paidCount = filteredEmployees.filter((e) => e.monthStatus?.status === "PAID").length;
  const unpaidCount = filteredEmployees.filter((e) => e.monthStatus?.status !== "PAID").length;

  // Pagination calculation
  const totalEmployees = filteredEmployees.length;
  const totalPages = Math.max(1, Math.ceil(totalEmployees / limit));
  const paginatedEmployees = filteredEmployees.slice((page - 1) * limit, page * limit);

  const selectedAccount = financialAccounts.find((a) => a.id === payAccountId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-primary" />
            Branch Staff Salary Management
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-none border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-600 dark:text-slate-300">
            <Store className="h-3.5 w-3.5 text-brand-primary" />
            <span>Scope:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {isAllBranches ? "All Branches (Company-Wide)" : (currentBranch?.name || "Selected Branch")}
            </span>
          </div>

          <button
            onClick={() => onNavigate?.("sal_attendance")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-none border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
          >
            <CalendarCheck className="h-3.5 w-3.5 text-blue-500" />
            Attendance & Off-Days
          </button>

          <button
            onClick={() => onNavigate?.("sal_employees")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-none border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
          >
            <Users className="h-3.5 w-3.5 text-emerald-500" />
            Employee List
          </button>

          <button
            onClick={() => onNavigate?.("sal_history")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-none border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
          >
            <Clock className="h-3.5 w-3.5 text-purple-500" />
            Salary History
          </button>

          {/* Month Selector */}
          <div className="relative flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-none border border-slate-200 dark:border-slate-800">
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
            className="p-2 rounded-none border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Monthly Status Summary (Compact Text, Not State Card) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            Month {currentMonth} Status:
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 bg-emerald-500 inline-block"></span>
            {paidCount} Paid
          </span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="inline-flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
            <span className="h-2 w-2 bg-rose-500 inline-block"></span>
            {unpaidCount} Due / Unpaid
          </span>
          <span className="text-slate-400">
            (Total Staff: {totalEmployees})
          </span>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          Showing {paginatedEmployees.length} of {totalEmployees} employees
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3.5 rounded-none bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-between gap-3 text-xs sm:text-sm text-red-600 dark:text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold">×</button>
        </div>
      )}


      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee by name, username, or phone..."
            className="w-full pl-9 pr-4 py-2 rounded-none text-xs sm:text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-100 dark:bg-slate-800/80 rounded-none">
          {[
            { id: "ALL", label: "All Staff" },
            { id: "DUE", label: "Due" },
            { id: "PARTIAL", label: "Partial" },
            { id: "PAID", label: "Paid" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs sm:text-sm font-semibold transition whitespace-nowrap rounded-none ${
                statusFilter === tab.id
                  ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Salary Table */}
      <div className="rounded-none border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="table-responsive-container">
          <table className="w-full min-w-[850px] text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/75 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Gross Salary</th>
                <th className="py-3 px-4">Net Payable</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
              {loading ? (
                [...Array(6)].map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3.5 px-4">
                      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-none" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-none" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-none" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-none" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-none" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded-none" />
                        <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded-none" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      No staff members found
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mt-1">
                      Add staff members to this branch in Staff Management to configure their payroll.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => {
                  const roleName = emp.pharmacyRoleName || emp.customRoleName || emp.role?.replace(/_/g, " ");
                  const status = emp.monthStatus?.status || "UNCONFIGURED";
                  const config = emp.salaryConfig;
                  const mStatus = emp.monthStatus;
                  const isPaid = status === "PAID" || (mStatus && mStatus.dueAmount <= 0 && mStatus.paidAmount > 0);

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition cursor-pointer group"
                      onClick={() => onSelectEmployee(emp.id)}
                    >
                      {/* Employee Name Only */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white group-hover:text-brand-primary transition text-sm">
                          {emp.name || emp.username}
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                          <Shield className="h-3 w-3 text-brand-primary" />
                          {roleName}
                        </span>
                      </td>

                      {/* Gross Salary */}
                      <td className="py-3.5 px-4">
                        {config ? (
                          <div className="font-bold text-slate-900 dark:text-white text-sm font-mono">
                            ৳{config.baseSalary.toLocaleString()}
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium">Not Configured</span>
                        )}
                      </td>

                      {/* Net Payable */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm font-mono">
                          ৳{(mStatus?.netSalary || 0).toLocaleString()}
                        </div>
                      </td>

                      {/* Status Badge (Paid / Partial / Due) */}
                      <td className="py-3.5 px-4">
                        {status === "PAID" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Paid
                          </span>
                        )}
                        {status === "PARTIAL" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="h-3.5 w-3.5" />
                            Partial
                          </span>
                        )}
                        {status === "DUE" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Due
                          </span>
                        )}
                        {status === "UNCONFIGURED" && (
                          <span className="text-xs text-slate-400 font-medium">Unconfigured</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Pay Salary / Already Paid Button */}
                          {isPaid ? (
                            <button
                              disabled
                              className="px-2.5 py-1.5 rounded-none text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed"
                              title="Salary already paid for this month"
                            >
                              Already Paid
                            </button>
                          ) : (
                            <button
                              onClick={() => openPayModal(emp)}
                              className={`px-3 py-1.5 rounded-none text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                emp.documentsSubmitted
                                  ? "bg-brand-primary hover:bg-brand-primary/90 text-white"
                                  : "bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                              }`}
                              title={
                                emp.documentsSubmitted
                                  ? status === "PARTIAL"
                                    ? `Pay Remaining Due: ৳${(mStatus?.dueAmount || 0).toLocaleString()}`
                                    : "Pay Salary"
                                  : "Documents pending — salary disbursement blocked"
                              }
                            >
                              {!emp.documentsSubmitted && <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
                              <span>
                                {emp.documentsSubmitted
                                  ? status === "PARTIAL"
                                    ? `Pay Due (৳${(mStatus?.dueAmount || 0).toLocaleString()})`
                                    : "Pay Salary"
                                  : "Docs Pending"}
                              </span>
                            </button>
                          )}

                          {/* Edit / Adjust Option (allows additional payment or correction if paid less by mistake) */}
                          <button
                            onClick={() => openAdjustModal(emp)}
                            className="px-2.5 py-1.5 rounded-none text-xs sm:text-sm font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                            title="Adjust disbursed salary or add additional payment if mistakenly underpaid"
                          >
                            Edit / Adjust
                          </button>

                          {/* Details Button */}
                          <button
                            onClick={() => onSelectEmployee(emp.id)}
                            className="px-2.5 py-1.5 rounded-none text-xs sm:text-sm font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                            title="View Employee Attendance & Details"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }))}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer - Always Visible */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/75 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-xs sm:text-sm">
          <div className="text-slate-500">
            Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredEmployees.length === 0 ? 0 : (page - 1) * limit + 1}</span> to{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(page * limit, filteredEmployees.length)}</span> of{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredEmployees.length}</span> staff
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs rounded-none outline-none text-slate-700 dark:text-slate-200"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none"
                title="First Page"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none"
                title="Previous Page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-xs text-slate-600 dark:text-slate-300">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none"
                title="Next Page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none"
                title="Last Page"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Pay Salary (Clean, sharp form, detailed allowances, no decorative icons) */}
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

        const activeAllowances = existingAllowances.length > 0
          ? existingAllowances
          : (mStatus?.monthlyAllowances || []);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-none bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
              {/* Clean Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    Disburse Salary: {payEmployee.name || payEmployee.username}
                  </h2>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    Target Month: {currentMonth}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-lg font-bold p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handlePaySubmit} className="space-y-4">
                {/* Clear Salary & Allowance Breakdown */}
                <div className="p-3.5 rounded-none bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Base Salary:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      ৳{baseSalary.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Attendance:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {presentDays} Present / {workingDays} Working Days ({offDays} off)
                    </span>
                  </div>

                  {absentDays > 0 && (
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-rose-600 font-medium">Absent Days:</span>
                      <span className="font-mono font-semibold text-rose-600">
                        {absentDays} Days
                      </span>
                    </div>
                  )}

                  {autoDeduction > 0 && (
                    <div className="flex justify-between items-center text-[11px] bg-rose-50 dark:bg-rose-950/40 p-1.5 border border-rose-200/50 text-rose-700 dark:text-rose-300 font-semibold rounded-none">
                      <span>Attendance Deduction:</span>
                      <span className="font-bold font-mono">-৳{autoDeduction.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Itemized Allowance Section */}
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-2 space-y-1">
                    <div className="flex justify-between items-center font-semibold text-slate-700 dark:text-slate-300">
                      <span>Allowances Included:</span>
                      <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        +৳{allowance.toLocaleString()}
                      </span>
                    </div>

                    {/* Breakdown of what allowances are given */}
                    {Number(config?.allowances || 0) > 0 && (
                      <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 pl-2">
                        <span>• Fixed Package Allowance:</span>
                        <span className="font-mono text-emerald-600 font-medium">+৳{Number(config?.allowances).toLocaleString()}</span>
                      </div>
                    )}

                    {activeAllowances.length > 0 ? (
                      activeAllowances.map((item: any, idx: number) => (
                        <div key={item.id || idx} className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 pl-2">
                          <span>• {item.title}:</span>
                          <span className="font-mono text-emerald-600 font-medium">+৳{Number(item.amount).toLocaleString()}</span>
                        </div>
                      ))
                    ) : Number(config?.allowances || 0) === 0 ? (
                      <div className="text-[11px] text-slate-400 italic pl-2">
                        No allowances for this month
                      </div>
                    ) : null}
                  </div>

                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-bold">
                    <span className="text-slate-800 dark:text-slate-200">Final Net Payable:</span>
                    <span className="font-black text-slate-900 dark:text-white text-sm font-mono">
                      ৳{netSalary.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                    <span>Already Paid:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                      ৳{paidAmount.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1.5 font-bold">
                    <span className="text-slate-700 dark:text-slate-300">Remaining Due:</span>
                    <span className="font-black text-rose-600 dark:text-rose-400 text-sm font-mono">
                      ৳{dueAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Amount to Pay */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Disbursement Amount (৳) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-none text-base font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-brand-primary focus:outline-none"
                  />
                </div>

                {/* Branch Financial Account */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Pay From Branch Account *</span>
                    {selectedAccount && (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        Avail: ৳{Number(selectedAccount.balance).toLocaleString()}
                      </span>
                    )}
                  </label>

                  {financialAccounts.length === 0 ? (
                    <div className="p-2.5 rounded-none bg-red-50 text-xs text-red-600 border border-red-200">
                      No active financial account exists for this branch.
                    </div>
                  ) : (
                    <select
                      value={payAccountId}
                      onChange={(e) => setPayAccountId(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-none text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Ref / Voucher No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SAL-VCH-9012"
                      value={payRef}
                      onChange={(e) => setPayRef(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-none text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Notes / Remarks
                    </label>
                    <input
                      type="text"
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      placeholder="Optional remarks"
                      className="w-full px-3 py-1.5 rounded-none text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsPayModalOpen(false)}
                    className="px-4 py-2 rounded-none text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || financialAccounts.length === 0}
                    className="px-5 py-2 rounded-none text-xs font-bold bg-brand-primary hover:bg-brand-primary/90 text-white shadow-xs flex items-center gap-2 transition disabled:opacity-50"
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

      {/* MODAL: Add Allowance (Simple clean form, no decorative icons, rounded-none) */}
      {isAllowanceModalOpen && allowanceEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-none bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Add Allowance
                </h2>
                <div className="text-xs text-slate-500 mt-0.5">
                  {allowanceEmployee.name || allowanceEmployee.username} • {currentMonth}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAllowanceModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Form to add allowance */}
            <form onSubmit={handleAddAllowance} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Allowance Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Overtime, Bonus, Performance"
                  value={allowanceTitle}
                  onChange={(e) => setAllowanceTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-none text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
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
                  placeholder="e.g. 1500"
                  value={allowanceAmount}
                  onChange={(e) => setAllowanceAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-none text-sm font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-emerald-600 focus:outline-none font-mono"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAllowanceModalOpen(false)}
                  className="px-4 py-2 rounded-none text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-none text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Allowance
                </button>
              </div>
            </form>

            {/* List of active allowances for this month */}
            {existingAllowances.length > 0 && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Allowances Added for {currentMonth}
                </h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {existingAllowances.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-none bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{item.title}</div>
                        <div className="text-[10px] text-emerald-600 font-bold font-mono">+৳{Number(item.amount).toLocaleString()}</div>
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
