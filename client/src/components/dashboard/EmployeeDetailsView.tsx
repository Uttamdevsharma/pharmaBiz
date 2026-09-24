"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft,
  Users,
  DollarSign,
  Wallet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Calendar,
  CreditCard,
  Mail,
  Phone,
  Building,
  Shield,
  Briefcase,
  Receipt,
  FileText,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  UserX,
  UserCheck,
  Coffee,
  Check,
  Lock,
  CalendarCheck,
  Sparkles,
} from "lucide-react";

interface EmployeeDetailsViewProps {
  employeeId: string;
  selectedBranchId?: string;
  onBack: () => void;
}

interface DisbursementItem {
  id: string;
  month: string;
  baseAmount: number;
  allowances: number;
  deductions: number;
  netPayable: number;
  paidAmount: number;
  dueAmount: number;
  status: "PAID" | "PARTIAL" | "DUE";
  paymentDate: string;
  paymentRef?: string | null;
  notes?: string | null;
  workingDays?: number | null;
  presentDays?: number | null;
  absentDays?: number | null;
  dailyRate?: number | null;
  attendanceDeduction?: number | null;
  financialAccount?: { id: string; name: string; type: string; accountNumber?: string; bankName?: string };
  disbursedBy?: { id: string; name?: string; username: string };
  branch?: { id: string; name: string };
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
  const canSetBaseSalary = isOwner || isBranchManager || (hasPermission ? hasPermission("salaries.base_salary.edit") : false);
  const canManageAllowances = isOwner || isBranchManager || user?.role === "ACCOUNTS" || (hasPermission ? hasPermission("accounts.salaries") : false);
  const isManager = canSetBaseSalary || user?.role === "MANAGER";

  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [disbursements, setDisbursements] = useState<DisbursementItem[]>([]);
  const [summary, setSummary] = useState<{ totalDisbursed: number; totalPayments: number }>({
    totalDisbursed: 0,
    totalPayments: 0,
  });
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<"attendance_calc" | "allowances" | "disbursements">("attendance_calc");

  // Selected Month for calculations & attendance
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));

  // Attendance History & Salary Calculation State
  const [salaryCalc, setSalaryCalc] = useState<any | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any | null>(null);
  const [monthlyAllowances, setMonthlyAllowances] = useState<MonthlyAllowanceItem[]>([]);

  // Base Salary Modal (Owner / Branch Manager only)
  const [isBaseSalaryModalOpen, setIsBaseSalaryModalOpen] = useState(false);
  const [newBaseSalary, setNewBaseSalary] = useState<number | "">("");

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
      setLoading(true);
      setError(null);
      const res = await fetchApi<{
        employee: EmployeeData;
        disbursements: DisbursementItem[];
        summary: { totalDisbursed: number; totalPayments: number };
      }>(`/accounting/salaries/history/${employeeId}`);

      if (res.success && res.data) {
        setEmployee(res.data.employee);
        setDisbursements(res.data.disbursements);
        setSummary(res.data.summary);
      } else {
        setError(res.message || "Failed to load employee profile");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load employee profile");
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    const branch = selectedBranchId || employee?.branch?.id;
    if (!branch) return;
    try {
      const res = await fetchApi<FinancialAccount[]>(`/accounting/accounts?branchId=${branch}`);
      if (res.success && res.data) {
        const active = res.data.filter((a: any) => a.isActive);
        setFinancialAccounts(active);
        if (active.length > 0 && !payAccountId) {
          setPayAccountId(active[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAttendanceAndCalc = async () => {
    const branch = selectedBranchId || employee?.branch?.id;
    if (!branch) return;

    try {
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
  }, [employee, selectedBranchId, selectedMonth]);

  // Handle Disburse Salary Submit
  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const branch = selectedBranchId || employee?.branch?.id;
    if (!branch) return;
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
        setSuccessMsg("Salary disbursed successfully! Financial account balance deducted.");
        setIsPayModalOpen(false);
        setPayRef("");
        setPayNotes("");
        await Promise.all([loadDetails(), loadAccounts(), loadAttendanceAndCalc()]);
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

  // Handle Add Monthly Allowance
  const handleAddAllowance = async (e: React.FormEvent) => {
    e.preventDefault();
    const branch = selectedBranchId || employee?.branch?.id;
    if (!branch) return;
    if (!allowanceTitle.trim() || !allowanceAmount || Number(allowanceAmount) <= 0) {
      setError("Please enter allowance title and valid amount.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetchApi<any>("/attendance/allowances", {
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
        setSuccessMsg("Monthly allowance added!");
        setIsAllowanceModalOpen(false);
        setAllowanceTitle("");
        setAllowanceAmount("");
        setAllowanceNotes("");
        await loadAttendanceAndCalc();
        setTimeout(() => setSuccessMsg(null), 3500);
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
      setError(null);
      const res = await fetchApi<any>(`/attendance/allowances/${allowanceId}`, {
        method: "DELETE",
      });
      if (res.success) {
        setSuccessMsg("Allowance removed.");
        await loadAttendanceAndCalc();
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        setError(res.message || "Failed to delete allowance");
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete allowance");
    }
  };

  // Handle Save Base Salary (Owner & Branch Manager only)
  const handleSaveBaseSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    const branch = selectedBranchId || employee?.branch?.id;
    if (!branch) return;
    if (newBaseSalary === "" || Number(newBaseSalary) < 0) {
      setError("Please enter a valid base salary amount.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetchApi<any>("/accounting/salaries/config", {
        method: "POST",
        body: JSON.stringify({
          branchId: branch,
          userId: employeeId,
          baseSalary: Number(newBaseSalary),
          allowances: employee?.salaryConfig?.allowances || 0,
          deductions: employee?.salaryConfig?.deductions || 0,
          paymentMethod: employee?.salaryConfig?.paymentMethod || "CASH",
          paymentDetails: employee?.salaryConfig?.paymentDetails || null,
          notes: employee?.salaryConfig?.notes || null,
        }),
      });

      if (res.success) {
        setSuccessMsg("Base Salary updated successfully!");
        setIsBaseSalaryModalOpen(false);
        await Promise.all([loadDetails(), loadAttendanceAndCalc()]);
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        setError(res.message || "Failed to update Base Salary");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update Base Salary");
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

  const getInitials = (name?: string, username?: string) => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    return (username || "ST").slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
        <span className="text-sm font-semibold">Loading employee profile & records...</span>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-12 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Employee Not Found</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white"
        >
          ← Back
        </button>
      </div>
    );
  }

  const roleName = employee.pharmacyRoleName || employee.customRoleName || employee.role?.replace(/_/g, " ");
  const m = salaryCalc?.metrics;
  const selectedAccount = financialAccounts.find((a) => a.id === payAccountId);

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to List</span>
        </button>

        <div className="flex items-center gap-2.5">
          {isManager && employee.isActive && (
            <button
              onClick={() => {
                setPayAmount(m ? m.dueAmount : "");
                setIsPayModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center gap-2 transition cursor-pointer"
            >
              <DollarSign className="h-4 w-4" />
              <span>Disburse Salary</span>
            </button>
          )}

          {isManager && (
            employee.isActive ? (
              <button
                onClick={() => setIsDeactivateModalOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 flex items-center gap-1.5 transition cursor-pointer"
                title="Mark employee as resigned or deactivated"
              >
                <UserX className="h-3.5 w-3.5" />
                <span>Resign / Deactivate</span>
              </button>
            ) : (
              <button
                onClick={handleReactivate}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20 flex items-center gap-1.5 transition cursor-pointer"
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
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-500 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 font-bold">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-emerald-600 text-white font-black text-xl sm:text-2xl flex items-center justify-center shadow-md shrink-0">
            {getInitials(employee.name, employee.username)}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {employee.name || employee.username}
              </h1>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <Shield className="h-3 w-3" />
                {roleName}
              </span>

              {employee.isActive ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <Check className="h-3 w-3" /> Active Staff
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/20">
                  <UserX className="h-3 w-3" /> Resigned / Deactivated
                </span>
              )}
            </div>

            <div className="text-xs text-slate-400 font-mono">@{employee.username}</div>

            <div className="flex items-center gap-4 pt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              {employee.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{employee.phone}</span>
                </div>
              )}
              {employee.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>{employee.email}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-slate-400" />
                <span>{employee.branch?.name || "Branch"}</span>
              </div>
            </div>

            {!employee.isActive && employee.resignationDate && (
              <div className="text-xs font-semibold text-rose-600 pt-1">
                Resignation Effective Date: {new Date(employee.resignationDate).toLocaleDateString()}
                {employee.resignationReason && ` • Reason: ${employee.resignationReason}`}
              </div>
            )}
          </div>
        </div>

        {/* Lifetime Disbursed Counter */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-right w-full md:w-auto">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lifetime Disbursed</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            ৳{summary.totalDisbursed.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            {summary.totalPayments} total payment vouchers
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("attendance_calc")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "attendance_calc"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Attendance & Monthly Calculation</span>
          </button>

          <button
            onClick={() => setActiveTab("allowances")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "allowances"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Allowances & Deductions</span>
          </button>

          <button
            onClick={() => setActiveTab("disbursements")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "disbursements"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Payment Vouchers ({disbursements.length})</span>
          </button>
        </div>

        {/* Month Selector for Calculations */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* SECTION 1: ATTENDANCE & MONTHLY CALCULATION */}
      {activeTab === "attendance_calc" && (
        <div className="space-y-6">
          {/* Automated Salary Calculation Breakdown Card (Req 5 & 7) */}
          {m && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    Automated Salary Calculation ({selectedMonth})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Calculated from actual attendance, working days, daily rate, and dynamic allowances.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const due = m?.dueAmount ?? 0;
                      setPayAmount(due > 0 ? due : m?.finalPayable || "");
                      setPayRef("");
                      setPayNotes("");
                      setIsPayModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    Pay Salary
                  </button>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <Lock className="w-3 h-3 text-emerald-600" /> Locked System Calculation
                  </span>
                </div>
              </div>

              {/* Grid Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Base Salary</span>
                    {canSetBaseSalary && (
                      <button
                        onClick={() => {
                          setNewBaseSalary(m.baseSalary);
                          setIsBaseSalaryModalOpen(true);
                        }}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                        title="Update Base Salary (Owner & Branch Manager only)"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  <span className="text-base font-black font-mono text-slate-900 dark:text-white mt-0.5 block">
                    ৳{m.baseSalary.toLocaleString()}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Working Days</span>
                  <span className="text-base font-black font-mono text-purple-600 mt-0.5 block">
                    {m.totalWorkingDays} Days
                  </span>
                  <span className="text-[9px] text-slate-400">({m.offDays} off-days excluded)</span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Daily Rate</span>
                  <span className="text-base font-black font-mono text-slate-700 dark:text-slate-300 mt-0.5 block">
                    ৳{m.dailyRate.toLocaleString()}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Absent / Unpaid</span>
                  <span className="text-base font-black font-mono text-rose-600 mt-0.5 block">
                    {m.absentDays + m.unpaidLeaveDays} Days
                  </span>
                </div>

                <div className="p-3.5 bg-rose-500/5 dark:bg-rose-500/10 rounded-2xl border border-rose-500/20">
                  <span className="text-[10px] text-rose-600 font-black uppercase tracking-wider block">Auto Deduction</span>
                  <span className="text-base font-black font-mono text-rose-600 mt-0.5 block">
                    -৳{m.attendanceDeduction.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-rose-500">Locked / Read-Only</span>
                </div>

                <div className="p-3.5 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-600 font-black uppercase tracking-wider block">Allowances</span>
                  <span className="text-base font-black font-mono text-emerald-600 mt-0.5 block">
                    +৳{m.totalAllowances.toLocaleString()}
                  </span>
                </div>

                <div className="p-3.5 bg-emerald-600 text-white rounded-2xl shadow-sm">
                  <span className="text-[10px] text-emerald-200 font-black uppercase tracking-wider block">Final Payable</span>
                  <span className="text-base font-black font-mono mt-0.5 block">
                    ৳{m.finalPayable.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Formula explanation bar */}
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400 flex items-center justify-between flex-wrap gap-2">
                <span>
                  <strong>Formula:</strong> ৳{m.baseSalary.toLocaleString()} (Base) - ৳{m.attendanceDeduction.toLocaleString()} ({m.absentDays + m.unpaidLeaveDays} days deduction) + ৳{m.totalAllowances.toLocaleString()} (Allowances) = <strong>৳{m.finalPayable.toLocaleString()}</strong>
                </span>

                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Status: {m.status} (Paid: ৳{m.paidAmount.toLocaleString()} • Due: ৳{m.dueAmount.toLocaleString()})
                </span>
              </div>
            </div>
          )}

          {/* Month Attendance Summary Cards */}
          {attendanceHistory && attendanceHistory.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-black block">Working Days</span>
                <span className="text-xl font-black text-purple-600 font-mono mt-1 block">
                  {attendanceHistory.summary.totalWorkingDays}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-black block">Present Days</span>
                <span className="text-xl font-black text-emerald-600 font-mono mt-1 block">
                  {attendanceHistory.summary.presentDays}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-black block">Absent Days</span>
                <span className="text-xl font-black text-rose-600 font-mono mt-1 block">
                  {attendanceHistory.summary.absentDays}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-black block">Paid Leave</span>
                <span className="text-xl font-black text-blue-600 font-mono mt-1 block">
                  {attendanceHistory.summary.paidLeaveDays}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-black block">Unpaid Leave</span>
                <span className="text-xl font-black text-amber-600 font-mono mt-1 block">
                  {attendanceHistory.summary.unpaidLeaveDays}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-black block">Off Days</span>
                <span className="text-xl font-black text-slate-700 dark:text-slate-300 font-mono mt-1 block">
                  {attendanceHistory.summary.offDays}
                </span>
              </div>
            </div>
          )}

          {/* Detailed Day-by-Day Sheet */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Daily Attendance Log ({selectedMonth})
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Day of Week</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Remarks</th>
                    <th className="py-3.5 px-4 text-right">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                  {attendanceHistory?.history?.map((day: any) => (
                    <tr key={day.date} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {day.date}
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-bold">{day.dayOfWeek}</td>

                      <td className="py-3 px-4">
                        {day.status === "PRESENT" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Present
                          </span>
                        )}
                        {day.status === "ABSENT" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <XCircle className="w-3 h-3" /> Absent
                          </span>
                        )}
                        {day.status === "PAID_LEAVE" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <Check className="w-3 h-3" /> Paid Leave
                          </span>
                        )}
                        {day.status === "UNPAID_LEAVE" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" /> Unpaid Leave
                          </span>
                        )}
                        {day.status === "OFF_DAY" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            <Coffee className="w-3 h-3" /> Scheduled Off-Day
                          </span>
                        )}
                        {day.status === "NOT_MARKED" && (
                          <span className="text-slate-400 text-[10px] font-bold">— Not Marked</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500 italic">{day.notes || "—"}</td>

                      <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">
                        {day.markedBy?.name || day.markedBy?.username || "Manager"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: ALLOWANCES & DEDUCTIONS */}
      {activeTab === "allowances" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Monthly Allowances ({selectedMonth})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dynamic allowances (Bonus, Transport, Food, Overtime, etc.) added for this employee for {selectedMonth}.
                </p>
              </div>

              {canManageAllowances && employee.isActive && (
                <button
                  onClick={() => setIsAllowanceModalOpen(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Allowance</span>
                </button>
              )}
            </div>

            {monthlyAllowances.length === 0 ? (
              <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                No custom monthly allowances configured for {selectedMonth}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Allowance Title</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Notes</th>
                      <th className="py-3 px-4">Added On</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                    {monthlyAllowances.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {item.title}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-600 font-mono">
                          +৳{Number(item.amount).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{item.notes || "—"}</td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {canManageAllowances && (
                            <button
                              onClick={() => handleDeleteAllowance(item.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
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

      {/* SECTION 3: SALARY DISBURSEMENT VOUCHERS LEDGER */}
      {activeTab === "disbursements" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              Complete Salary Disbursement History
            </h3>
            <span className="text-xs text-slate-400">{disbursements.length} payment records</span>
          </div>

          {disbursements.length === 0 ? (
            <div className="p-16 text-center text-slate-400 space-y-2">
              <Receipt className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No salary payment vouchers</h4>
              <p className="text-xs text-slate-400">
                When you disburse a monthly payment, the voucher details and financial account ledger will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-4">Month / Date</th>
                    <th className="py-4 px-4">Voucher Ref</th>
                    <th className="py-4 px-4">Paid Amount</th>
                    <th className="py-4 px-4">Net Payable</th>
                    <th className="py-4 px-4">Attendance Snapshot</th>
                    <th className="py-4 px-4">Paid From Account</th>
                    <th className="py-4 px-4">Disbursed By</th>
                    <th className="py-4 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                  {disbursements.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{d.month}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(d.paymentDate).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {d.paymentRef || d.id.slice(0, 8)}
                      </td>

                      <td className="py-3.5 px-4 font-black font-mono text-emerald-600 text-sm">
                        ৳{Number(d.paidAmount).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300 font-mono">
                        ৳{Number(d.netPayable).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-[11px]">
                        {d.workingDays !== null && d.workingDays !== undefined ? (
                          <div>
                            <span className="font-bold">{d.workingDays} working days</span>
                            <span className="text-rose-600 block">
                              Deduction: -৳{Number(d.attendanceDeduction || 0).toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {d.financialAccount?.name || "Account"}
                        </span>
                        <span className="block text-[10px] text-slate-400 uppercase">
                          {d.financialAccount?.type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {d.disbursedBy?.name || d.disbursedBy?.username || "Manager"}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 italic max-w-xs truncate">
                        {d.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: DISBURSE SALARY */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                    Disburse Salary: {employee.name || employee.username}
                  </h2>
                  <p className="text-xs text-slate-400">Month: {selectedMonth}</p>
                </div>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 font-bold p-1">×</button>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              {/* Calculation Summary Box */}
              {m && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2 text-xs font-medium">
                  {/* 1. Base Salary */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Base Salary:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      ৳{m.baseSalary.toLocaleString()}
                    </span>
                  </div>

                  {/* 2. Attendance / Working Days */}
                  <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-medium">Attendance / Working Days:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                      {m.presentDays ?? 0} Present / {m.totalWorkingDays ?? 0} Working Days ({m.offDays ?? 0} off)
                    </span>
                  </div>

                  {/* 3. Absent Days */}
                  <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-medium">Absent Days:</span>
                    <span className={`font-semibold font-mono ${(m.absentDays + m.unpaidLeaveDays) > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"}`}>
                      {m.absentDays + m.unpaidLeaveDays} Days
                    </span>
                  </div>

                  {/* 4. Auto Deduction (read-only) */}
                  <div className="flex justify-between items-center bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl text-rose-700 dark:text-rose-300 font-semibold border border-rose-200/50">
                    <span className="flex items-center gap-1.5">
                      <Lock className="h-3 w-3 shrink-0 text-rose-600 dark:text-rose-400" />
                      Auto Deduction (read-only):
                    </span>
                    <span className="font-bold font-mono">
                      -৳{m.attendanceDeduction.toLocaleString()}
                    </span>
                  </div>

                  {/* 5. Allowance */}
                  <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200/50">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      Allowance:
                    </span>
                    <span className="font-bold font-mono">
                      +৳{m.totalAllowances.toLocaleString()}
                    </span>
                  </div>

                  {/* 6. Final Payable */}
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-bold">
                    <span className="text-slate-800 dark:text-slate-200">Final Payable:</span>
                    <span className="font-black text-slate-900 dark:text-white text-sm font-mono">
                      ৳{m.finalPayable.toLocaleString()}
                    </span>
                  </div>

                  {/* 7. Already Paid */}
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Already Paid:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                      ৳{m.paidAmount.toLocaleString()}
                    </span>
                  </div>

                  {/* 8. Remaining Due */}
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1.5">
                    <span className="text-slate-700 dark:text-slate-300 font-bold">Remaining Due:</span>
                    <span className="font-black text-rose-600 dark:text-rose-400 text-sm font-mono">
                      ৳{m.dueAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Disbursement Amount (৳) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-2xl text-base font-black border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-emerald-600 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Pay From Branch Financial Account *</span>
                  {selectedAccount && (
                    <span className="text-[11px] font-bold text-emerald-600">
                      Balance: ৳{Number(selectedAccount.balance).toLocaleString()}
                    </span>
                  )}
                </label>

                {financialAccounts.length === 0 ? (
                  <div className="p-3 rounded-xl bg-red-50 text-xs text-red-600">
                    No active financial accounts found for this branch.
                  </div>
                ) : (
                  <select
                    value={payAccountId}
                    onChange={(e) => setPayAccountId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  >
                    {financialAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type}) — Avail: ৳{Number(acc.balance).toLocaleString()}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Voucher / Ref (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. SAL-VCH-8012"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Remarks on this disbursement..."
                  className="w-full px-3.5 py-2 rounded-2xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || financialAccounts.length === 0}
                  className="px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD MONTHLY ALLOWANCE */}
      {isAllowanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Add Allowance ({selectedMonth})
              </h3>
              <button onClick={() => setIsAllowanceModalOpen(false)} className="text-slate-400 font-bold p-1">×</button>
            </div>

            <form onSubmit={handleAddAllowance} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Allowance Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Performance Bonus, Transport Allowance, Overtime"
                  value={allowanceTitle}
                  onChange={(e) => setAllowanceTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Amount (৳) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="2000"
                  value={allowanceAmount}
                  onChange={(e) => setAllowanceAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-2xl text-sm font-black border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-emerald-600 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Reason or details..."
                  value={allowanceNotes}
                  onChange={(e) => setAllowanceNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAllowanceModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Allowance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESIGN / DEACTIVATE EMPLOYEE */}
      {isDeactivateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                  <UserX className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Resign / Deactivate Staff
                  </h3>
                  <p className="text-xs text-slate-400">{employee.name || employee.username}</p>
                </div>
              </div>
              <button onClick={() => setIsDeactivateModalOpen(false)} className="text-slate-400 font-bold p-1">×</button>
            </div>

            <form onSubmit={handleDeactivate} className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Deactivated staff will no longer appear in the active employee list or daily attendance sheets. All previous attendance, salary, and payment history will remain permanently preserved.
              </p>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Resignation Effective Date *
                </label>
                <input
                  type="date"
                  required
                  value={resignationDate}
                  onChange={(e) => setResignationDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Resignation Reason (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Relocated to another city, Personal reasons..."
                  value={resignationReason}
                  onChange={(e) => setResignationReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDeactivateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Deactivation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPDATE BASE SALARY (OWNER & BRANCH MANAGER ONLY) */}
      {isBaseSalaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Update Base Salary
                  </h3>
                  <p className="text-xs text-slate-400">{employee.name || employee.username}</p>
                </div>
              </div>
              <button onClick={() => setIsBaseSalaryModalOpen(false)} className="text-slate-400 font-bold p-1">×</button>
            </div>

            <form onSubmit={handleSaveBaseSalary} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Base Salary (৳) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  placeholder="25000"
                  value={newBaseSalary}
                  onChange={(e) => setNewBaseSalary(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-2xl text-base font-black border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Only Pharmacy Owner and Branch Manager can set or update the base salary for an employee.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBaseSalaryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Base Salary"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
