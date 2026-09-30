"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { showAlert } from "@/lib/swal";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Calendar,
  CreditCard,
  Building,
  Shield,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  UserX,
  UserCheck,
  Coffee,
  Check,
  Sparkles,
  Eye,
  ExternalLink,
  X,
  FileCheck,
  Banknote,
  CalendarCheck,
  AlertTriangle,
  Lock,
} from "lucide-react";

interface EmployeeDetailsViewProps {
  employeeId: string;
  selectedBranchId?: string;
  onBack: () => void;
}

interface EmployeeData {
  id: string;
  name?: string;
  username: string;
  email?: string;
  phone?: string;
  role: string;
  customRoleName?: string;
  pharmacyRoleName?: string;
  avatarUrl?: string;
  createdAt: string;
  isActive: boolean;
  isPermanent?: boolean;
  paidLeavesUsedThisYear?: number;
  annualPaidLeaveAllowance?: number;
  nidNumber?: string | null;
  nidFrontUrl?: string | null;
  nidFrontPublicId?: string | null;
  nidBackUrl?: string | null;
  nidBackPublicId?: string | null;
  documentsSubmitted?: boolean;
  resignationDate?: string | null;
  resignationReason?: string | null;
  deactivatedAt?: string | null;
  branch?: { id: string; name: string };
  salaryConfig?: {
    id: string;
    baseSalary: number;
    allowances: number;
    deductions: number;
    netSalary: number;
    paymentMethod?: string | null;
    paymentDetails?: string | null;
    effectiveDate?: string | null;
    notes?: string | null;
  } | null;
}

interface FinancialAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface MonthlyAllowanceItem {
  id: string;
  title: string;
  amount: number;
  month: string;
  notes?: string | null;
  createdAt: string;
}

export function EmployeeDetailsView({ employeeId, selectedBranchId, onBack }: EmployeeDetailsViewProps) {
  const { user, hasPermission } = useAuth();
  const isOwner = user?.role === "COMPANY_OWNER" || user?.role === "SUPER_ADMIN";
  const isBranchManager = user?.role === "BRANCH_MANAGER" || user?.pharmacyRoleName?.toLowerCase().includes("branch manager");
  const canManageAllowances = isOwner || isBranchManager || user?.role === "ACCOUNTS" || (hasPermission ? hasPermission("accounts.salaries") : false);
  const isManager = isOwner || isBranchManager || user?.role === "MANAGER";

  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  
  // Independent loading states for clear skeleton behavior
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [loadingCalc, setLoadingCalc] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Active view tab: 3 tabs requested by user (attendance_calc, allowances, documents)
  const [activeTab, setActiveTab] = useState<"attendance_calc" | "allowances" | "documents">("attendance_calc");

  // Selected Month for 1-month filter (default current month)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));

  // Attendance History & Salary Calculation State
  const [salaryCalc, setSalaryCalc] = useState<any | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any | null>(null);
  const [monthlyAllowances, setMonthlyAllowances] = useState<MonthlyAllowanceItem[]>([]);

  // Disburse Salary Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAccountId, setPayAccountId] = useState("");
  const [payAmount, setPayAmount] = useState<number | "">("");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");

  // Add Allowance Modal
  const [isAllowanceModalOpen, setIsAllowanceModalOpen] = useState(false);
  const [allowanceTitle, setAllowanceTitle] = useState("");
  const [allowanceAmount, setAllowanceAmount] = useState<number | "">("");
  const [allowanceNotes, setAllowanceNotes] = useState("");

  // Resignation / Deactivation Modal
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [resignationDate, setResignationDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [resignationReason, setResignationReason] = useState("");

  const loadDetails = async () => {
    try {
      setLoadingDetails(true);
      setError(null);
      const res = await fetchApi<{
        employee: EmployeeData;
        disbursements: any[];
        summary: { totalDisbursed: number; totalPayments: number };
      }>(`/accounting/salaries/history/${employeeId}`);

      if (res.success && res.data) {
        setEmployee(res.data.employee);
      } else {
        setError(res.message || "Failed to load employee profile");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load employee profile");
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadAccounts = async () => {
    const branch = selectedBranchId || employee?.branch?.id;
    if (!branch) return;
    try {
      const res = await fetchApi<FinancialAccount[]>(`/accounting/accounts?branchId=${branch}`);
      if (res.success && res.data) {
        setFinancialAccounts(res.data);
        if (res.data.length > 0 && !payAccountId) {
          setPayAccountId(res.data[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load financial accounts", e);
    }
  };

  const loadAttendanceAndCalc = async () => {
    const branch = selectedBranchId || employee?.branch?.id;
    if (!branch) return;

    try {
      setLoadingCalc(true);
      const [calcRes, attRes, allwRes] = await Promise.all([
        fetchApi<any>(`/attendance/salary-calc?branchId=${branch}&userId=${employeeId}&month=${selectedMonth}`),
        fetchApi<any>(`/attendance/employee-history?userId=${employeeId}&month=${selectedMonth}`),
        fetchApi<MonthlyAllowanceItem[]>(`/attendance/allowances?branchId=${branch}&userId=${employeeId}&month=${selectedMonth}`),
      ]);

      if (calcRes.success && calcRes.data) {
        setSalaryCalc(calcRes.data);
      }
      if (attRes.success && attRes.data) {
        setAttendanceHistory(attRes.data);
      }
      if (allwRes.success && allwRes.data) {
        setMonthlyAllowances(allwRes.data);
      }
    } catch (e) {
      console.error("Failed to load calculation metrics", e);
    } finally {
      setLoadingCalc(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [employeeId]);

  useEffect(() => {
    if (employee) {
      loadAccounts();
      loadAttendanceAndCalc();
    }
  }, [employee?.id, selectedBranchId, selectedMonth]);

  // Handle Disburse Salary Submit
  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const branch = selectedBranchId || employee?.branch?.id;
    if (!branch) return;
    if (!employee?.documentsSubmitted) {
      setError("Employee has not submitted the required certificates/documents. Salary disbursement blocked.");
      showAlert.warning(
        "Documents Pending",
        "This employee has not submitted the required certificates and documents. Salary disbursement is blocked."
      );
      return;
    }
    if (!payAccountId) {
      setError("Please select a financial account for payment.");
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
          branchId: branch,
          userId: employeeId,
          financialAccountId: payAccountId,
          month: selectedMonth,
          paidAmount: Number(payAmount),
          paymentRef: payRef.trim() || null,
          notes: payNotes.trim() || null,
        }),
      });

      if (res.success) {
        showAlert.success(
          "Salary Disbursed",
          `৳${Number(payAmount).toLocaleString()} disbursed successfully for ${selectedMonth}.`
        );
        setIsPayModalOpen(false);
        setPayAmount("");
        setPayRef("");
        setPayNotes("");
        await Promise.all([loadDetails(), loadAttendanceAndCalc()]);
      } else {
        setError(res.message || "Failed to disburse salary");
      }
    } catch (err: any) {
      setError(err.message || "Failed to disburse salary");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Add Allowance
  const handleAddAllowance = async (e: React.FormEvent) => {
    e.preventDefault();
    const branch = selectedBranchId || employee?.branch?.id;
    if (!branch) return;
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
          branchId: branch,
          userId: employeeId,
          month: selectedMonth,
          title: allowanceTitle.trim(),
          amount: Number(allowanceAmount),
          notes: allowanceNotes.trim() || null,
        }),
      });

      if (res.success) {
        setSuccessMsg("Allowance added successfully!");
        setIsAllowanceModalOpen(false);
        setAllowanceTitle("");
        setAllowanceAmount("");
        setAllowanceNotes("");
        await loadAttendanceAndCalc();
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

  // Handle Delete Allowance
  const handleDeleteAllowance = async (allowanceId: string) => {
    if (!confirm("Are you sure you want to remove this allowance?")) return;
    try {
      setSubmitting(true);
      setError(null);
      const res = await fetchApi<{ success: boolean; message: string }>(`/attendance/allowances/${allowanceId}`, {
        method: "DELETE",
      });

      if (res.success) {
        setSuccessMsg("Allowance removed.");
        await loadAttendanceAndCalc();
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

  // Handle Deactivate / Resign
  const handleDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const branch = selectedBranchId || employee?.branch?.id;
    if (!branch) return;

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetchApi<any>(`/attendance/employees/${employeeId}/deactivate`, {
        method: "POST",
        body: JSON.stringify({
          branchId: branch,
          resignationDate,
          resignationReason: resignationReason.trim() || null,
        }),
      });

      if (res.success) {
        setSuccessMsg("Employee status updated to Resigned/Deactivated.");
        setIsDeactivateModalOpen(false);
        await loadDetails();
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        setError(res.message || "Failed to deactivate employee");
      }
    } catch (err: any) {
      setError(err.message || "Failed to deactivate employee");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Reactivate
  const handleReactivate = async () => {
    const branch = selectedBranchId || employee?.branch?.id;
    if (!branch) return;
    if (!confirm("Reactivate this employee back to the active branch staff roster?")) return;

    try {
      setError(null);
      const res = await fetchApi<any>(`/attendance/employees/${employeeId}/reactivate`, {
        method: "POST",
        body: JSON.stringify({ branchId: branch }),
      });

      if (res.success) {
        setSuccessMsg("Employee successfully reactivated!");
        await loadDetails();
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        setError(res.message || "Failed to reactivate employee");
      }
    } catch (err: any) {
      setError(err.message || "Failed to reactivate employee");
    }
  };

  const roleName = employee?.customRoleName || employee?.pharmacyRoleName || employee?.role?.replace(/_/g, " ") || "Staff";
  const m = salaryCalc?.metrics || salaryCalc?.calculation;
  const isPaidThisMonth = m?.status === "PAID" || (m && m.dueAmount <= 0 && m.paidAmount > 0);

  return (
    <div className="space-y-4 w-full mx-auto">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER - CLEAN & PROMINENT (Fund Transfer Typography)             */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 text-brand-primary" />
            <span>Back to List</span>
          </button>

          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{employee?.name || employee?.username || "Employee Details"}</span>
              {employee && (
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase">
                  {roleName}
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-2 flex-wrap">
          {isManager && employee?.isActive && (
            <button
              onClick={() => {
                if (!employee.documentsSubmitted) {
                  showAlert.warning(
                    "Documents Pending",
                    `"${employee.name || employee.username}" has not submitted the required certificates & documents. Salary disbursement is blocked until verified.`
                  );
                  return;
                }
                const due = m?.dueAmount ?? 0;
                setPayAmount(due > 0 ? due : m?.finalPayable || "");
                setPayRef("");
                setPayNotes("");
                setIsPayModalOpen(true);
              }}
              disabled={isPaidThisMonth}
              className={`px-3 py-1.5 rounded-none text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer ${
                isPaidThisMonth
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>{isPaidThisMonth ? "Already Paid" : "Pay Salary"}</span>
            </button>
          )}

          {isManager && employee && (
            employee.isActive ? (
              <button
                onClick={() => setIsDeactivateModalOpen(true)}
                className="px-3 py-1.5 rounded-none text-xs sm:text-sm font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 flex items-center gap-1.5 transition cursor-pointer"
                title="Mark employee as resigned or deactivated"
              >
                <UserX className="h-3.5 w-3.5" />
                <span>Resign Staff</span>
              </button>
            ) : (
              <button
                onClick={handleReactivate}
                className="px-3 py-1.5 rounded-none text-xs sm:text-sm font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20 flex items-center gap-1.5 transition cursor-pointer"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Reactivate Staff</span>
              </button>
            )
          )}

          <button
            onClick={() => {
              loadDetails();
              loadAttendanceAndCalc();
            }}
            disabled={loadingDetails || loadingCalc}
            className="p-1.5 rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loadingDetails || loadingCalc ? "animate-spin text-brand-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 rounded-none bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-xs sm:text-sm text-rose-600 dark:text-rose-400 font-bold">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="cursor-pointer">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-none bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-bold">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TAB CONTROLS + 1-MONTH FILTER BAR                                      */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        {/* The 3 Clean Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("attendance_calc")}
            className={`px-3.5 py-2 rounded-none text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === "attendance_calc"
                ? "bg-brand-primary text-white shadow-xs"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Attendance & Monthly Calculation</span>
          </button>

          <button
            onClick={() => setActiveTab("allowances")}
            className={`px-3.5 py-2 rounded-none text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === "allowances"
                ? "bg-brand-primary text-white shadow-xs"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Allowances & Deduction</span>
          </button>

          <button
            onClick={() => setActiveTab("documents")}
            className={`px-3.5 py-2 rounded-none text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === "documents"
                ? "bg-brand-primary text-white shadow-xs"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Documents</span>
          </button>
        </div>

        {/* 1-Month Filter (Clean and Prominent) */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-none border border-slate-200 dark:border-slate-800 shadow-xs self-start sm:self-auto">
          <Calendar className="w-4 h-4 text-brand-primary" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Month:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs sm:text-sm font-bold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ATTENDANCE & MONTHLY CALCULATION                                  */}
      {/* ========================================================================= */}
      {activeTab === "attendance_calc" && (
        <div className="space-y-4">
          {/* Automated Salary Calculation Container */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-brand-primary" />
                <span>Monthly Salary Calculation ({selectedMonth})</span>
              </h3>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <Lock className="w-3.5 h-3.5 text-brand-primary" /> Locked System Calculation
                </span>
              </div>
            </div>

            {/* Calculation Metrics Cards (7 Cards without Daily Rate, Large & Spacious) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3">
              {/* 1. Gross Salary */}
              <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-none border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-h-[110px]">
                <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Gross Salary</span>
                {loadingCalc || !m ? (
                  <div className="h-7 w-24 bg-slate-200 dark:bg-slate-700 rounded-none animate-pulse my-1" />
                ) : (
                  <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white my-1 block">
                    ৳{Number(m.baseSalary || 0).toLocaleString()}
                  </span>
                )}
                <span className="text-xs text-slate-400 block font-medium">Base package</span>
              </div>

              {/* 2. Working Days */}
              <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-none border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-h-[110px]">
                <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Working Days</span>
                {loadingCalc || !m ? (
                  <div className="h-7 w-20 bg-slate-200 dark:bg-slate-700 rounded-none animate-pulse my-1" />
                ) : (
                  <span className="text-xl sm:text-2xl font-black font-mono text-purple-600 dark:text-purple-400 my-1 block">
                    {m.totalWorkingDays ?? 0} Days
                  </span>
                )}
                <span className="text-xs text-slate-400 block font-medium">({m?.offDays ?? 0} off-days)</span>
              </div>

              {/* 3. Absent / Unpaid */}
              <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-none border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-h-[110px]">
                <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Absent / Unpaid</span>
                {loadingCalc || !m ? (
                  <div className="h-7 w-20 bg-slate-200 dark:bg-slate-700 rounded-none animate-pulse my-1" />
                ) : (
                  <span className="text-xl sm:text-2xl font-black font-mono text-rose-600 my-1 block">
                    {(m.absentDays || 0) + (m.unpaidLeaveDays || 0)} Days
                  </span>
                )}
                <span className="text-xs text-rose-500 block font-medium">Unpaid time off</span>
              </div>

              {/* 4. Auto Deduction */}
              <div className="p-4 sm:p-5 bg-rose-500/5 dark:bg-rose-500/10 rounded-none border border-rose-500/20 flex flex-col justify-between min-h-[110px]">
                <span className="text-xs sm:text-sm text-rose-600 font-bold uppercase tracking-wider block">Auto Deduction</span>
                {loadingCalc || !m ? (
                  <div className="h-7 w-24 bg-rose-200 dark:bg-rose-900/40 rounded-none animate-pulse my-1" />
                ) : (
                  <span className="text-xl sm:text-2xl font-black font-mono text-rose-600 my-1 block">
                    -৳{Number(m.attendanceDeduction || 0).toLocaleString()}
                  </span>
                )}
                <span className="text-xs text-rose-500 block font-medium">Attendance loss</span>
              </div>

              {/* 5. Paid Leaves */}
              <div className="p-4 sm:p-5 bg-blue-500/5 dark:bg-blue-500/10 rounded-none border border-blue-500/20 flex flex-col justify-between min-h-[110px]">
                <span className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider block">Paid Leaves</span>
                {loadingCalc || !m ? (
                  <div className="h-7 w-20 bg-blue-200 dark:bg-blue-900/40 rounded-none animate-pulse my-1" />
                ) : (
                  <span className="text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-300 my-1 block">
                    {m.paidLeaveDays || 0} Days
                  </span>
                )}
                <span className="text-xs text-blue-500 block font-medium">0 Tk Deduction</span>
              </div>

              {/* 6. Allowances */}
              <div className="p-4 sm:p-5 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-none border border-emerald-500/20 flex flex-col justify-between min-h-[110px]">
                <span className="text-xs sm:text-sm text-emerald-600 font-bold uppercase tracking-wider block">Allowances</span>
                {loadingCalc || !m ? (
                  <div className="h-7 w-24 bg-emerald-200 dark:bg-emerald-900/40 rounded-none animate-pulse my-1" />
                ) : (
                  <span className="text-xl sm:text-2xl font-black font-mono text-emerald-600 my-1 block">
                    +৳{Number(m.totalAllowances || 0).toLocaleString()}
                  </span>
                )}
                <span className="text-xs text-emerald-600 block font-medium">Dynamic additions</span>
              </div>

              {/* 7. Final Payable */}
              <div className="p-4 sm:p-5 bg-emerald-600 text-white rounded-none shadow-xs flex flex-col justify-between min-h-[110px]">
                <span className="text-xs sm:text-sm text-emerald-100 font-bold uppercase tracking-wider block">Final Payable</span>
                {loadingCalc || !m ? (
                  <div className="h-7 w-24 bg-emerald-500 rounded-none animate-pulse my-1" />
                ) : (
                  <span className="text-xl sm:text-2xl font-black font-mono my-1 block">
                    ৳{Number(m.finalPayable || 0).toLocaleString()}
                  </span>
                )}
                <span className="text-xs text-emerald-200 block font-mono font-medium">
                  {m?.status || "DUE"}
                </span>
              </div>
            </div>

            {/* Formula Explanation Bar */}
            {m && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-mono text-slate-600 dark:text-slate-400 flex items-center justify-between flex-wrap gap-2 rounded-none">
                <div>
                  <strong>Formula:</strong> ৳{Number(m.baseSalary || 0).toLocaleString()} (Gross) − ৳{Number(m.attendanceDeduction || 0).toLocaleString()} ({Number((m.absentDays || 0) + (m.unpaidLeaveDays || 0))} days ded.) + ৳{Number(m.totalAllowances || 0).toLocaleString()} (Allowances) = <strong className="text-emerald-600 dark:text-emerald-400">৳{Number(m.finalPayable || 0).toLocaleString()}</strong>
                </div>
                <div className="font-bold text-slate-700 dark:text-slate-300">
                  Status: {m.status} (Paid: ৳{Number(m.paidAmount || 0).toLocaleString()} • Due: ৳{Number(m.dueAmount || 0).toLocaleString()})
                </div>
              </div>
            )}
          </div>

          {/* All 6 Month Attendance Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Working Days */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-4 shadow-xs">
              <span className="text-xs text-slate-400 uppercase font-bold block">Working Days</span>
              {loadingCalc || !attendanceHistory?.summary ? (
                <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded-none animate-pulse mt-1" />
              ) : (
                <span className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono mt-1 block">
                  {attendanceHistory.summary.totalWorkingDays ?? 0}
                </span>
              )}
            </div>

            {/* 2. Present Days */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-4 shadow-xs">
              <span className="text-xs text-slate-400 uppercase font-bold block">Present Days</span>
              {loadingCalc || !attendanceHistory?.summary ? (
                <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded-none animate-pulse mt-1" />
              ) : (
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
                  {attendanceHistory.summary.presentDays ?? 0}
                </span>
              )}
            </div>

            {/* 3. Absent Days */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-4 shadow-xs">
              <span className="text-xs text-slate-400 uppercase font-bold block">Absent Days</span>
              {loadingCalc || !attendanceHistory?.summary ? (
                <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded-none animate-pulse mt-1" />
              ) : (
                <span className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono mt-1 block">
                  {attendanceHistory.summary.absentDays ?? 0}
                </span>
              )}
            </div>

            {/* 4. Paid Leave */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-4 shadow-xs">
              <span className="text-xs text-slate-400 uppercase font-bold block">Paid Leave</span>
              {loadingCalc || !attendanceHistory?.summary ? (
                <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded-none animate-pulse mt-1" />
              ) : (
                <span className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono mt-1 block">
                  {attendanceHistory.summary.paidLeaveDays ?? 0}
                </span>
              )}
            </div>

            {/* 5. Unpaid Leave */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-4 shadow-xs">
              <span className="text-xs text-slate-400 uppercase font-bold block">Unpaid Leave</span>
              {loadingCalc || !attendanceHistory?.summary ? (
                <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded-none animate-pulse mt-1" />
              ) : (
                <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1 block">
                  {attendanceHistory.summary.unpaidLeaveDays ?? 0}
                </span>
              )}
            </div>

            {/* 6. Off Days */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-4 shadow-xs">
              <span className="text-xs text-slate-400 uppercase font-bold block">Off Days</span>
              {loadingCalc || !attendanceHistory?.summary ? (
                <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded-none animate-pulse mt-1" />
              ) : (
                <span className="text-xl font-black text-slate-700 dark:text-slate-300 font-mono mt-1 block">
                  {attendanceHistory.summary.offDays ?? 0}
                </span>
              )}
            </div>
          </div>

          {/* Daily Attendance Sheet Table (No Recorded By Column) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Daily Attendance Log ({selectedMonth})
              </h4>
              <span className="text-xs text-slate-400">
                Total Days: {attendanceHistory?.history?.length || 0}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Day of Week</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loadingCalc ? (
                    [1, 2, 3, 4, 5, 6].map((i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-3 px-4"><div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-none" /></td>
                        <td className="py-3 px-4"><div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-none" /></td>
                        <td className="py-3 px-4"><div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-none" /></td>
                        <td className="py-3 px-4"><div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-none" /></td>
                      </tr>
                    ))
                  ) : attendanceHistory?.history && attendanceHistory.history.length > 0 ? (
                    attendanceHistory.history.map((day: any) => (
                      <tr key={day.date} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {day.date}
                        </td>

                        <td className="py-3 px-4 text-slate-500 font-medium">{day.dayOfWeek}</td>

                        <td className="py-3 px-4">
                          {day.status === "PRESENT" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Present
                            </span>
                          )}
                          {day.status === "ABSENT" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              <XCircle className="w-3.5 h-3.5" /> Absent
                            </span>
                          )}
                          {day.status === "PAID_LEAVE" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              <Check className="w-3.5 h-3.5" /> Paid Leave
                            </span>
                          )}
                          {day.status === "UNPAID_LEAVE" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <Clock className="w-3.5 h-3.5" /> Unpaid Leave
                            </span>
                          )}
                          {day.status === "OFF_DAY" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              <Coffee className="w-3.5 h-3.5" /> Scheduled Off-Day
                            </span>
                          )}
                          {day.status === "NOT_MARKED" && (
                            <span className="text-slate-400 text-xs font-medium">— Not Marked</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-500 italic">{day.notes || "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-400">
                        No daily attendance records found for {selectedMonth}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ALLOWANCES & DEDUCTION                                             */}
      {/* ========================================================================= */}
      {activeTab === "allowances" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-4.5 h-4.5 text-brand-primary" />
                  <span>Monthly Allowances & Deductions ({selectedMonth})</span>
                </h3>
              </div>

              {canManageAllowances && (
                <button
                  onClick={() => {
                    setAllowanceTitle("");
                    setAllowanceAmount("");
                    setAllowanceNotes("");
                    setIsAllowanceModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-none text-xs sm:text-sm font-bold bg-brand-primary hover:brightness-95 text-white transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Allowance</span>
                </button>
              )}
            </div>

            {monthlyAllowances.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs sm:text-sm">
                No monthly allowances configured for this month. Click "Add Allowance" to create one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Notes</th>
                      <th className="py-3 px-4">Added On</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {monthlyAllowances.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {item.title}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-600 font-mono">
                          +৳{Number(item.amount).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{item.notes || "—"}</td>
                        <td className="py-3 px-4 text-slate-400 font-mono">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {canManageAllowances && (
                            <button
                              onClick={() => handleDeleteAllowance(item.id)}
                              className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-none transition cursor-pointer"
                              title="Delete allowance"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DOCUMENTS (National ID & Verification Documents)                   */}
      {/* ========================================================================= */}
      {activeTab === "documents" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4.5 h-4.5 text-brand-primary" />
                <span>National ID & Verification Documents</span>
              </h3>

              {employee?.nidNumber && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-none bg-slate-100 dark:bg-slate-800 font-mono text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                  <span className="text-slate-400 font-sans">NID No:</span>
                  <span>{employee.nidNumber}</span>
                </div>
              )}
            </div>

            {/* Verification Status Banner */}
            <div className={`p-3 rounded-none border flex items-center justify-between gap-3 ${
              employee?.documentsSubmitted
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
            }`}>
              <div className="flex items-center gap-2">
                {employee?.documentsSubmitted ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                )}
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {employee?.documentsSubmitted
                    ? "Certificates & Documents: Verified (Salary Enabled)"
                    : "Certificates & Documents: Pending (Salary Blocked)"}
                </span>
              </div>
            </div>

            {/* NID Images Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Front Side */}
              <div className="p-3.5 rounded-none border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                    NID Front Side
                  </span>
                  {employee?.nidFrontUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewImage({ url: employee.nidFrontUrl!, title: `${employee.name || employee.username} - NID Front Side` })}
                      className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>View Large</span>
                    </button>
                  )}
                </div>

                {loadingDetails ? (
                  <div className="h-48 rounded-none bg-slate-200 dark:bg-slate-800 animate-pulse" />
                ) : employee?.nidFrontUrl ? (
                  <div
                    onClick={() => setPreviewImage({ url: employee.nidFrontUrl!, title: `${employee.name || employee.username} - NID Front Side` })}
                    className="relative h-48 rounded-none overflow-hidden border border-slate-200 dark:border-slate-700 bg-white cursor-pointer group shadow-xs"
                  >
                    <img
                      src={employee.nidFrontUrl}
                      alt="NID Front"
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                      <Eye className="h-4 w-4" />
                      <span>Click to zoom in</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 rounded-none border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 gap-2 text-xs">
                    <CreditCard className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                    <span>NID Front side photo not uploaded</span>
                  </div>
                )}
              </div>

              {/* Back Side */}
              <div className="p-3.5 rounded-none border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                    NID Back Side
                  </span>
                  {employee?.nidBackUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewImage({ url: employee.nidBackUrl!, title: `${employee.name || employee.username} - NID Back Side` })}
                      className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>View Large</span>
                    </button>
                  )}
                </div>

                {loadingDetails ? (
                  <div className="h-48 rounded-none bg-slate-200 dark:bg-slate-800 animate-pulse" />
                ) : employee?.nidBackUrl ? (
                  <div
                    onClick={() => setPreviewImage({ url: employee.nidBackUrl!, title: `${employee.name || employee.username} - NID Back Side` })}
                    className="relative h-48 rounded-none overflow-hidden border border-slate-200 dark:border-slate-700 bg-white cursor-pointer group shadow-xs"
                  >
                    <img
                      src={employee.nidBackUrl}
                      alt="NID Back"
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                      <Eye className="h-4 w-4" />
                      <span>Click to zoom in</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 rounded-none border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 gap-2 text-xs">
                    <CreditCard className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                    <span>NID Back side photo not uploaded</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LIGHTBOX IMAGE PREVIEW MODAL                                              */}
      {/* ========================================================================= */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200">
          <div className="relative max-w-4xl w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xl rounded-none overflow-hidden">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                {previewImage.title}
              </span>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-950/20 max-h-[80vh] overflow-auto">
              <img
                src={previewImage.url}
                alt="Enlarged document preview"
                className="max-h-[75vh] w-auto object-contain shadow-md"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DISBURSE SALARY MODAL                                                     */}
      {/* ========================================================================= */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-xl p-5 sm:p-6 rounded-none space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Disburse Salary ({selectedMonth})
              </h2>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4 text-xs sm:text-sm">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Gross Salary:</span>
                  <span className="font-bold">৳{Number(m?.baseSalary || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Net Calculated:</span>
                  <span className="font-bold">৳{Number(m?.finalPayable || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Already Paid:</span>
                  <span className="font-bold">৳{Number(m?.paidAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-600 border-t border-slate-200 dark:border-slate-700 pt-1 font-bold">
                  <span>Remaining Due:</span>
                  <span>৳{Number(m?.dueAmount || 0).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount (৳) *
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pay From Financial Account *
                </label>
                <select
                  value={payAccountId}
                  onChange={(e) => setPayAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-none text-xs sm:text-sm font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  {financialAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type}) — Avail: ৳{Number(acc.balance).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Reference / Voucher
                </label>
                <input
                  type="text"
                  placeholder="e.g. SAL-VCH-001"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-none text-xs sm:text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional notes"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-none text-xs sm:text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 rounded-none text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-none text-xs font-bold bg-brand-primary hover:brightness-95 text-white transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Disbursement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD ALLOWANCE MODAL                                                       */}
      {/* ========================================================================= */}
      {isAllowanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-xl p-5 sm:p-6 rounded-none space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Add Monthly Allowance ({selectedMonth})
              </h2>
              <button
                onClick={() => setIsAllowanceModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAllowance} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Allowance Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eid Bonus, Performance Bonus, Travel"
                  value={allowanceTitle}
                  onChange={(e) => setAllowanceTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-none text-xs sm:text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Amount (৳) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="e.g. 2000"
                  value={allowanceAmount}
                  onChange={(e) => setAllowanceAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-none text-sm font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional remark"
                  value={allowanceNotes}
                  onChange={(e) => setAllowanceNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-none text-xs sm:text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAllowanceModalOpen(false)}
                  className="px-4 py-2 rounded-none text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-none text-xs font-bold bg-brand-primary hover:brightness-95 text-white transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Allowance</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESIGN / DEACTIVATE MODAL                                                 */}
      {/* ========================================================================= */}
      {isDeactivateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-xl p-5 sm:p-6 rounded-none space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-rose-600">
                <UserX className="w-4 h-4" />
                <span>Mark Employee as Resigned</span>
              </h2>
              <button
                onClick={() => setIsDeactivateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeactivate} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Resignation Effective Date *
                </label>
                <input
                  type="date"
                  required
                  value={resignationDate}
                  onChange={(e) => setResignationDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-none text-xs sm:text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Leaving
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Resigned for personal reasons / higher studies"
                  value={resignationReason}
                  onChange={(e) => setResignationReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-none text-xs sm:text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDeactivateModalOpen(false)}
                  className="px-4 py-2 rounded-none text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-none text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Resignation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
