"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import {
  FileSpreadsheet,
  Calendar,
  Printer,
  AlertCircle,
  Check,
  Store,
  RefreshCw,
  Clock,
  Eye,
  EyeOff,
  ChevronDown,
  Loader2,
  FileText,
} from "lucide-react";
import { useBranchContext } from "@/context/BranchContext";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";

interface SalaryReportViewProps {
  selectedBranchId?: string;
  onNavigate?: (module: OwnerModule) => void;
  onSelectEmployee?: (employeeId: string) => void;
}

interface SalaryEmployeeItem {
  id: string;
  name: string;
  username: string;
  phone?: string | null;
  role: string;
  customRoleName?: string | null;
  pharmacyRoleName?: string | null;
  branchName?: string | null;
  isActive: boolean;
  salaryConfig?: {
    id: string;
    baseSalary: number;
    allowances: number;
    deductions: number;
    netSalary: number;
    paymentMethod?: string | null;
  } | null;
  monthStatus?: {
    month: string;
    baseSalary: number;
    netSalary: number;
    paidAmount: number;
    dueAmount: number;
    status: "PAID" | "PARTIAL" | "DUE";
    disbursements?: Array<{
      id: string;
      paidAmount: number;
      paymentDate: string;
      financialAccount?: { name: string; type: string } | null;
      disbursedBy?: { name?: string; username: string } | null;
    }>;
  };
}

export function SalaryReportView({
  selectedBranchId: propBranchId,
}: SalaryReportViewProps) {
  const { user: authUser } = useAuth();
  const { settings } = useSettings();
  const {
    selectedBranchId: contextBranchId,
    currentBranch,
    isAllBranches,
  } = useBranchContext();

  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;

  // Default month: Current Month YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [staffList, setStaffList] = useState<SalaryEmployeeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSalaryReport = useCallback(
    async (silent = false): Promise<SalaryEmployeeItem[]> => {
      try {
        if (!silent) setLoading(true);
        setError(null);

        let url = `/accounting/salaries/employees?month=${selectedMonth}`;
        if (effectiveBranchId && effectiveBranchId !== "all" && effectiveBranchId !== "all-branches") {
          url += `&branchId=${effectiveBranchId}`;
        }

        const res = await fetchApi<SalaryEmployeeItem[]>(url);

        if (res.success && Array.isArray(res.data)) {
          setStaffList(res.data);
          return res.data;
        } else {
          setStaffList([]);
          return [];
        }
      } catch (err: any) {
        setError(err.message || "Failed to generate monthly salary report");
        return [];
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [effectiveBranchId, selectedMonth]
  );

  // Auto load for selected month
  useEffect(() => {
    loadSalaryReport(true);
  }, [loadSalaryReport]);

  // Aggregate Metrics for this report (employee-based accurate calculations)
  const summaryMetrics = useMemo(() => {
    const totalStaffCount = staffList.length;
    let paidStaffCount = 0;
    let partialStaffCount = 0;
    let unpaidStaffCount = 0;
    let totalNetPayable = 0;
    let totalPaidAmount = 0;
    let totalDueAmount = 0;

    staffList.forEach((s) => {
      const ms = s.monthStatus;
      const net = Number(ms?.netSalary ?? s.salaryConfig?.netSalary ?? 0);
      const paid = Number(ms?.paidAmount ?? 0);
      const due = Number(ms?.dueAmount ?? Math.max(0, net - paid));
      const status = ms?.status ?? (net > 0 && paid >= net ? "PAID" : paid > 0 ? "PARTIAL" : "DUE");

      totalNetPayable += net;
      totalPaidAmount += paid;
      totalDueAmount += due;

      if (status === "PAID") paidStaffCount++;
      else if (status === "PARTIAL") partialStaffCount++;
      else unpaidStaffCount++;
    });

    return {
      totalStaffCount,
      paidStaffCount,
      partialStaffCount,
      unpaidStaffCount,
      totalNetPayable,
      totalPaidAmount,
      totalDueAmount,
    };
  }, [staffList]);

  // Formatted Month String (e.g. September 2026)
  const formattedMonthLabel = useMemo(() => {
    if (!selectedMonth) return "All Time";
    const [year, month] = selectedMonth.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  }, [selectedMonth]);

  // Handle Direct Print
  const handleDirectPrint = async () => {
    setPrinting(true);
    let currentData = staffList;
    if (currentData.length === 0) {
      currentData = await loadSalaryReport(false);
    }
    setPrinting(false);

    if (currentData.length === 0) {
      setError(`No salary disbursement records found for ${formattedMonthLabel}.`);
      return;
    }

    // Trigger browser native print directly
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Handle Preview Toggle
  const handleTogglePreview = async () => {
    if (!showPreview && staffList.length === 0) {
      await loadSalaryReport(false);
    }
    setShowPreview((prev) => !prev);
  };

  return (
    <div className="space-y-6 w-full mx-auto">
      {/* ── 1. CENTERED MINIMAL GENERATOR CARD (Screen Only, print:hidden) ── */}
      <div className="max-w-2xl mx-auto space-y-4 print:hidden">
        {/* Notifications */}
        {error && (
          <div className="flex items-center gap-2.5 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs sm:text-sm rounded-none">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-xs font-semibold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Generator Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-none shadow-xs space-y-6">
          {/* Card Top Title & Scope */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-primary/10 text-brand-primary rounded-none">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Monthly Salary Report
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select month to print or preview the official employee payroll statement.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 rounded-none shrink-0">
              <Store className="h-3.5 w-3.5 text-brand-primary" />
              <span className="font-bold text-slate-900 dark:text-white">
                {isAllBranches ? "All Branches" : currentBranch?.name || "Selected Branch"}
              </span>
            </div>
          </div>

          {/* Month Selection Box */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Select Salary Month:
            </label>
            <div className="relative">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-sm font-semibold outline-none focus:border-brand-primary dark:text-white cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Selected Period: <strong className="text-slate-700 dark:text-slate-200">{formattedMonthLabel}</strong>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            {/* Primary: Direct Print / Export PDF */}
            <button
              type="button"
              onClick={handleDirectPrint}
              disabled={loading || printing}
              className="w-full sm:flex-1 h-11 bg-brand-primary text-white text-xs sm:text-sm font-bold rounded-none hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {printing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              <span>Direct Print / Export PDF</span>
            </button>

            {/* Secondary: Preview on Screen */}
            <button
              type="button"
              onClick={handleTogglePreview}
              disabled={loading || printing}
              className="w-full sm:w-auto h-11 px-5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-none hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {showPreview ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  <span>Hide Preview</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  <span>Preview on Screen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. THE OFFICIAL MONTHLY SALARY STATEMENT (Shown if previewed, or during Print) ── */}
      <div
        className={`${
          showPreview
            ? "block"
            : "hidden print:block"
        } bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-6 sm:p-10 shadow-xs space-y-6 printable-document print:p-0 print:border-none print:shadow-none print:bg-white print:text-black`}
      >
        {/* On-screen Preview Control Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 print:hidden text-xs text-slate-500">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Statement Preview Mode ({formattedMonthLabel})
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-brand-primary text-white font-bold rounded-none flex items-center gap-1.5 text-xs hover:opacity-90 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              Print This Sheet
            </button>
            <button
              onClick={() => setShowPreview(false)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-none text-xs hover:bg-slate-50 cursor-pointer"
            >
              Close Preview
            </button>
          </div>
        </div>

        {/* 1. Official Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 dark:border-slate-100 print:border-black pb-5">
          <div className="flex items-start gap-3.5">
            {(authUser?.tenant?.logoUrl || settings?.logoUrl) && (
              <img
                src={authUser?.tenant?.logoUrl || settings?.logoUrl || ""}
                alt={authUser?.tenant?.name || "Pharmacy Logo"}
                className="h-14 sm:h-16 object-contain print:h-14 max-w-[180px]"
                crossOrigin="anonymous"
              />
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white print:text-black">
                {authUser?.tenant?.name || settings?.siteName || "Pharmacy Management"}
              </h1>
              <div className="text-xs text-slate-600 dark:text-slate-400 print:text-black space-y-0.5 mt-0.5">
                <p className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">
                  Branch: {currentBranch?.name || "Main Branch"}
                </p>
                {(authUser?.tenant?.address || settings?.contact?.address) && (
                  <p>{authUser?.tenant?.address || settings?.contact?.address}</p>
                )}
                <p>
                  {authUser?.tenant?.phone ? `Phone: ${authUser.tenant.phone}` : ""}
                  {authUser?.tenant?.phone && authUser?.tenant?.email ? " | " : ""}
                  {authUser?.tenant?.email ? `Email: ${authUser.tenant.email}` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <div className="inline-block px-3 py-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900 print:bg-black print:text-white text-xs font-black uppercase tracking-wider rounded-none mb-1.5">
              Monthly Salary Statement
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 print:text-black font-mono">
              Month: <strong className="text-slate-900 dark:text-white print:text-black">{formattedMonthLabel}</strong>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 print:text-black font-mono">
              Generated: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* 2. Executive Statement Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 px-4 bg-slate-50 dark:bg-slate-800/60 print:bg-slate-100 border border-slate-200 dark:border-slate-700 print:border-black text-xs">
          <div>
            <span className="text-slate-500 print:text-black block text-[11px]">Total Staff in Branch:</span>
            <strong className="text-sm font-bold text-slate-900 dark:text-white print:text-black">
              {summaryMetrics.totalStaffCount} Employees
            </strong>
            <div className="text-[10px] text-slate-400 print:text-slate-600 mt-0.5">
              Paid: {summaryMetrics.paidStaffCount} | Partial: {summaryMetrics.partialStaffCount} | Unpaid: {summaryMetrics.unpaidStaffCount}
            </div>
          </div>

          <div>
            <span className="text-slate-500 print:text-black block text-[11px]">Total Monthly Payable:</span>
            <strong className="text-sm font-mono font-bold text-slate-900 dark:text-white print:text-black">
              ৳{summaryMetrics.totalNetPayable.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
            </strong>
            <div className="text-[10px] text-slate-400 print:text-slate-600 mt-0.5">
              Full Payroll Budget
            </div>
          </div>

          <div>
            <span className="text-slate-500 print:text-black block text-[11px]">Total Disbursed (Paid):</span>
            <strong className="text-sm font-mono font-black text-emerald-700 dark:text-emerald-400 print:text-black">
              ৳{summaryMetrics.totalPaidAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
            </strong>
            <div className="text-[10px] text-emerald-600 print:text-slate-600 mt-0.5">
              Debited from Accounts
            </div>
          </div>

          <div>
            <span className="text-slate-500 print:text-black block text-[11px]">Remaining Balance (Due):</span>
            <strong className="text-sm font-mono font-bold text-amber-700 dark:text-amber-400 print:text-black">
              ৳{summaryMetrics.totalDueAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
            </strong>
            <div className="text-[10px] text-amber-600 print:text-slate-600 mt-0.5">
              Yet to be Disbursed
            </div>
          </div>
        </div>

        {/* 3. Official Employee-Centric Salary Statement Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm print:text-xs border border-slate-300 dark:border-slate-700 print:border-black border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 text-slate-700 dark:text-slate-300 print:text-black font-bold uppercase tracking-wider">
              <tr className="border-b border-slate-300 dark:border-slate-700 print:border-black">
                <th className="py-2.5 px-3 w-10 text-center">SL</th>
                <th className="py-2.5 px-3">Employee Name</th>
                <th className="py-2.5 px-3">Designation</th>
                <th className="py-2.5 px-3 text-right">Monthly Net Salary</th>
                <th className="py-2.5 px-3 text-right">Total Paid</th>
                <th className="py-2.5 px-3 text-right">Due Amount</th>
                <th className="py-2.5 px-3">Payment Date</th>
                <th className="py-2.5 px-3">Paid From Account</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 print:divide-black text-slate-800 dark:text-slate-200 print:text-black font-medium">
              {staffList.map((employee, idx) => {
                const ms = employee.monthStatus;
                const netSalary = Number(ms?.netSalary ?? employee.salaryConfig?.netSalary ?? 0);
                const paidAmount = Number(ms?.paidAmount ?? 0);
                const dueAmount = Number(ms?.dueAmount ?? Math.max(0, netSalary - paidAmount));
                const status = ms?.status ?? (netSalary > 0 && paidAmount >= netSalary ? "PAID" : paidAmount > 0 ? "PARTIAL" : "DUE");

                const disbursements = ms?.disbursements || [];
                const latestDisbursement = disbursements.length > 0 ? disbursements[0] : null;

                const paymentDateStr = latestDisbursement
                  ? new Date(latestDisbursement.paymentDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—";

                const accountName = latestDisbursement?.financialAccount?.name
                  ? `${latestDisbursement.financialAccount.name}${disbursements.length > 1 ? ` (${disbursements.length} installments)` : ""}`
                  : "—";

                return (
                  <tr key={employee.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-center font-mono text-xs">{idx + 1}</td>

                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-white print:text-black">
                        {employee.name || employee.username}
                      </div>
                      {employee.phone && (
                        <div className="text-[11px] text-slate-400 print:text-slate-600 font-mono">
                          {employee.phone}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400 print:text-black">
                      {employee.customRoleName || employee.pharmacyRoleName || employee.role?.replace("_", " ")}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono text-xs">
                      ৳{netSalary.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 print:text-black">
                      ৳{paidAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono text-xs font-bold text-amber-700 dark:text-amber-400 print:text-black">
                      {dueAmount > 0 ? `৳${dueAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}` : "—"}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-xs whitespace-nowrap">
                      {paymentDateStr}
                    </td>

                    <td className="py-2.5 px-3 text-xs">
                      {accountName}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      {status === "PAID" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-none">
                          <Check className="h-3 w-3" /> PAID
                        </span>
                      )}
                      {status === "PARTIAL" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-none">
                          <Clock className="h-3 w-3" /> PARTIAL
                        </span>
                      )}
                      {status === "DUE" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-none">
                          <AlertCircle className="h-3 w-3" /> UNPAID
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Grand Total Row */}
              <tr className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 font-bold border-t-2 border-slate-900 print:border-black text-xs sm:text-sm">
                <td colSpan={3} className="py-3 px-3 text-right uppercase tracking-wider font-extrabold">
                  Grand Total ({formattedMonthLabel}):
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold">
                  ৳{summaryMetrics.totalNetPayable.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-emerald-700 dark:text-emerald-400 print:text-black">
                  ৳{summaryMetrics.totalPaidAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-amber-700 dark:text-amber-400 print:text-black">
                  ৳{summaryMetrics.totalDueAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. Three Signatures Block */}
        <div className="pt-12 grid grid-cols-3 gap-6 text-center text-xs print:pt-16">
          <div>
            <div className="border-t border-slate-400 dark:border-slate-600 print:border-black pt-1.5 font-medium text-slate-800 dark:text-slate-200 print:text-black">
              Prepared By
            </div>
            <div className="text-[10px] text-slate-400 print:text-black font-mono">
              Accounts Executive
            </div>
          </div>
          <div>
            <div className="border-t border-slate-400 dark:border-slate-600 print:border-black pt-1.5 font-medium text-slate-800 dark:text-slate-200 print:text-black">
              Branch Manager
            </div>
            <div className="text-[10px] text-slate-400 print:text-black font-mono">
              Verified Signature
            </div>
          </div>
          <div>
            <div className="border-t border-slate-400 dark:border-slate-600 print:border-black pt-1.5 font-medium text-slate-800 dark:text-slate-200 print:text-black">
              Authorized Signatory
            </div>
            <div className="text-[10px] text-slate-400 print:text-black font-mono">
              Pharmacy Management
            </div>
          </div>
        </div>

        {/* 5. Official Footer */}
        <div className="text-center text-[10px] text-slate-400 print:text-slate-600 border-t border-slate-200 dark:border-slate-800 print:border-slate-300 pt-3">
          Official Monthly Salary Disbursement Report • Generated by PharmaBiz Multi-Tenant Platform
        </div>
      </div>
    </div>
  );
}
