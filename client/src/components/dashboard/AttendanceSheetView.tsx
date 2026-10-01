"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useBranchContext } from "@/context/BranchContext";
import { OwnerModule } from "./DashboardSidebar";
import {
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Loader2,
  Calendar,
  Building2,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from "lucide-react";

interface AttendanceRecord {
  employee: {
    id: string;
    staffId?: string | null;
    name?: string | null;
    username: string;
    role: string;
    branch?: { id: string; name: string } | null;
    isActive: boolean;
    isPermanent: boolean;
  };
  month: string;
  metrics: {
    baseSalary: number;
    totalDays: number;
    offDays: number;
    totalWorkingDays: number;
    presentDays: number;
    absentDays: number;
    lateDays?: number;
    paidLeaveDays: number;
    unpaidLeaveDays: number;
    dailyRate: number;
    attendanceDeduction: number;
    totalAllowances: number;
    finalPayable: number;
    paidAmount: number;
    dueAmount: number;
    status: string;
  };
}

interface AttendanceSheetViewProps {
  selectedBranchId?: string;
  onNavigate?: (module: OwnerModule) => void;
}

function AttendanceSheetSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-none p-5 sm:p-7 space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 bg-slate-200 dark:bg-slate-800 rounded-none shrink-0" />
          <div className="space-y-2">
            <div className="h-6 w-52 bg-slate-200 dark:bg-slate-800 rounded-none" />
            <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded-none" />
            <div className="h-3.5 w-44 bg-slate-200 dark:bg-slate-800 rounded-none" />
          </div>
        </div>
        <div className="space-y-2 text-left sm:text-right">
          <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded-none sm:ml-auto" />
          <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded-none sm:ml-auto" />
          <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded-none sm:ml-auto" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
        <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-none" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-11 px-3 flex items-center justify-between gap-3">
            <div className="h-4 w-6 bg-slate-200 dark:bg-slate-800 rounded-none" />
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-none" />
            <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded-none" />
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-none" />
            <div className="h-4 w-10 bg-slate-200 dark:bg-slate-800 rounded-none" />
            <div className="h-4 w-10 bg-slate-200 dark:bg-slate-800 rounded-none" />
            <div className="h-4 w-10 bg-slate-200 dark:bg-slate-800 rounded-none" />
            <div className="h-4 w-10 bg-slate-200 dark:bg-slate-800 rounded-none" />
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-none" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AttendanceSheetView({
  selectedBranchId: propBranchId,
  onNavigate,
}: AttendanceSheetViewProps) {
  const { user: authUser } = useAuth();
  const { settings } = useSettings();
  const {
    selectedBranchId: contextBranchId,
    currentBranch,
    branches,
    isAllBranches,
  } = useBranchContext();

  const isOwnerOrSuper =
    authUser?.role === "COMPANY_OWNER" ||
    authUser?.role === "SUPER_ADMIN" ||
    authUser?.role === "REGIONAL_ADMIN";

  // Default month: Current Year-Month (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Branch Selection for multi-branch
  const effectiveBranchId =
    propBranchId !== undefined ? propBranchId : contextBranchId;
  const [branchFilter, setBranchFilter] = useState<string>(
    effectiveBranchId || "all"
  );

  useEffect(() => {
    if (effectiveBranchId) {
      setBranchFilter(effectiveBranchId);
    }
  }, [effectiveBranchId]);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Load attendance sheet data
  const loadAttendanceSheet = useCallback(
    async (isManualClick = false) => {
      try {
        setLoading(true);
        setError(null);

        let url = `/attendance/summary?month=${selectedMonth}`;
        if (branchFilter && branchFilter !== "all" && branchFilter !== "all-branches") {
          url += `&branchId=${branchFilter}`;
        }

        const res = await fetchApi<AttendanceRecord[]>(url);

        if (res.success && Array.isArray(res.data)) {
          setRecords(res.data);
          setHasGenerated(true);
        } else {
          setRecords([]);
          setHasGenerated(true);
          if (res.message) {
            setError(res.message);
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to load attendance sheet");
        setRecords([]);
        setHasGenerated(true);
      } finally {
        setLoading(false);
      }
    },
    [selectedMonth, branchFilter]
  );

  // Auto load initially
  useEffect(() => {
    loadAttendanceSheet(false);
  }, [loadAttendanceSheet]);

  const handlePrint = () => {
    window.print();
  };

  // Formatted Month for Display (e.g. October 2026)
  const formattedMonthLabel = useMemo(() => {
    if (!selectedMonth) return "";
    const [yearStr, monthStr] = selectedMonth.split("-");
    const dateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
    return dateObj.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [selectedMonth]);

  // Filtered by Search Query (ID, Name, Role)
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase().trim();
    return records.filter((r) => {
      const name = r.employee.name?.toLowerCase() || "";
      const username = r.employee.username.toLowerCase();
      const staffId = (r.employee.staffId || "").toLowerCase();
      const role = r.employee.role.toLowerCase();
      return (
        name.includes(q) ||
        username.includes(q) ||
        staffId.includes(q) ||
        role.includes(q)
      );
    });
  }, [records, searchQuery]);

  // Aggregate Totals
  const totals = useMemo(() => {
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalPaidLeave = 0;
    let totalLate = 0;
    let totalPayable = 0;

    filteredRecords.forEach((r) => {
      totalPresent += r.metrics.presentDays || 0;
      totalAbsent += r.metrics.absentDays || 0;
      totalPaidLeave += r.metrics.paidLeaveDays || 0;
      totalLate += r.metrics.lateDays || 0;
      totalPayable += r.metrics.finalPayable || 0;
    });

    return {
      totalStaff: filteredRecords.length,
      totalPresent,
      totalAbsent,
      totalPaidLeave,
      totalLate,
      totalPayable,
    };
  }, [filteredRecords]);

  // Resolve Active Branch Name
  const activeBranchName = useMemo(() => {
    if (branchFilter === "all" || branchFilter === "all-branches") {
      return "All Branches";
    }
    const found = branches?.find((b) => b.id === branchFilter);
    return found?.name || currentBranch?.name || "Main Branch";
  }, [branchFilter, branches, currentBranch]);

  return (
    <div className="space-y-4 w-full mx-auto">
      {/* 1. Page Header (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 print:hidden">
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-brand-primary" />
          Attendance Sheet
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadAttendanceSheet(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handlePrint}
            disabled={loading || records.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white text-xs sm:text-sm font-semibold transition rounded-none disabled:opacity-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Sheet
          </button>
        </div>
      </div>

      {/* 2. Filter & Generation Card (FundTransfer styling, hidden on print) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-none space-y-4 print:hidden">
        <div className="flex flex-wrap items-end gap-3">
          {/* Month Selector */}
          <div className="w-full sm:w-56 space-y-1.5">
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
              Select Month <span className="text-rose-500">*</span>
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full h-9 sm:h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-brand-primary"
              required
            />
          </div>

          {/* Branch Selector (if Owner/Admin) */}
          {isOwnerOrSuper && branches && branches.length > 0 && (
            <div className="w-full sm:w-56 space-y-1.5">
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                Branch
              </label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full h-9 sm:h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-brand-primary"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Button: View / Generate Sheet (Compact) */}
          <div>
            <button
              onClick={() => loadAttendanceSheet(true)}
              disabled={loading}
              className="h-9 sm:h-10 px-4 bg-brand-primary text-white text-xs sm:text-sm font-semibold hover:opacity-95 transition rounded-none disabled:opacity-50 inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4" />
                  Generate Sheet
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search Input for filtering staff table in real-time */}
        {hasGenerated && records.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Staff ID, Name, or Designation..."
                className="w-full h-9 pl-9 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-brand-primary"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="h-9 px-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-none hover:bg-slate-50"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs sm:text-sm font-semibold flex items-center gap-2 rounded-none print:hidden">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Skeleton Loading or Invoice Style Attendance Sheet Report Container */}
      {loading ? (
        <AttendanceSheetSkeleton />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 print:border-black rounded-none p-5 sm:p-7 space-y-6 text-slate-900 dark:text-white print:text-black print:p-0 print:border-none print:bg-white">
          {/* Report Top Header (Logo + Pharmacy Details + Report Meta) */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-300 dark:border-slate-700 print:border-black pb-5">
            {/* Left: Pharmacy Logo & Contact Information */}
            <div className="flex items-start gap-4">
              {(authUser?.tenant?.logoUrl || settings?.logoUrl) && (
                <img
                  src={authUser?.tenant?.logoUrl || settings?.logoUrl || ""}
                  alt={authUser?.tenant?.name || "Pharmacy Logo"}
                  className="h-14 sm:h-16 object-contain print:h-14 max-w-[160px] rounded-none shrink-0"
                  crossOrigin="anonymous"
                />
              )}
              <div>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white print:text-black">
                  {authUser?.tenant?.name || settings?.siteName || "Pharmacy Management"}
                </h2>
                <div className="text-xs text-slate-600 dark:text-slate-400 print:text-black space-y-0.5 mt-1 font-medium">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">
                    Branch: {activeBranchName}
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

            {/* Right: Sheet Title & Date Meta */}
            <div className="text-left sm:text-right shrink-0">
              <div className="inline-block px-3 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 print:bg-black print:text-white text-xs font-black uppercase tracking-wider rounded-none mb-1.5">
                Attendance Sheet
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 print:text-black font-mono">
                Month: <strong className="text-slate-900 dark:text-white print:text-black">{formattedMonthLabel}</strong>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 print:text-black font-mono mt-0.5">
                Generated: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
              {authUser?.name && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 print:text-black font-mono mt-0.5">
                  Prepared By: {authUser.name}
                </div>
              )}
            </div>
          </div>

        {/* Empty State */}
        {!loading && hasGenerated && filteredRecords.length === 0 && (
          <div className="py-12 text-center text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 rounded-none p-6">
            <FileSpreadsheet className="h-8 w-8 mx-auto text-slate-400 mb-2" />
            <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
              No attendance records found for {formattedMonthLabel}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Select another month or record staff attendance from Attendance Management.
            </p>
          </div>
        )}

        {/* Attendance Sheet Table (Invoice format, no pay buttons in columns, rounded-none) */}
        {!loading && filteredRecords.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm print:text-xs border border-slate-300 dark:border-slate-700 print:border-black border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 text-slate-800 dark:text-slate-200 print:text-black font-bold uppercase tracking-wider">
                <tr className="border-b border-slate-300 dark:border-slate-700 print:border-black">
                  <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300 dark:border-slate-700 print:border-black">
                    SL
                  </th>
                  <th className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 print:border-black">
                    Staff ID
                  </th>
                  <th className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 print:border-black">
                    Staff Name
                  </th>
                  <th className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 print:border-black">
                    Designation
                  </th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700 print:border-black">
                    Present
                  </th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700 print:border-black">
                    Absent
                  </th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700 print:border-black">
                    Paid Leave
                  </th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-300 dark:border-slate-700 print:border-black">
                    Late
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    Net Payable
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 print:divide-black text-slate-800 dark:text-slate-200 print:text-black font-medium">
                {filteredRecords.map((item, idx) => {
                  const rawStaffId = item.employee.staffId?.trim();
                  const staffIdDisplay = rawStaffId && !rawStaffId.includes("@") ? rawStaffId : "—";
                  const staffNameDisplay =
                    item.employee.name || item.employee.username;
                  const designationDisplay = item.employee.role || "Staff";
                  const netPayable = item.metrics.finalPayable || 0;

                  return (
                    <tr
                      key={item.employee.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 print:hover:bg-transparent"
                    >
                      <td className="py-2.5 px-3 text-center font-mono border-r border-slate-300 dark:border-slate-700 print:border-black text-slate-600 dark:text-slate-400 print:text-black">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold border-r border-slate-300 dark:border-slate-700 print:border-black text-slate-700 dark:text-slate-300 print:text-black whitespace-nowrap">
                        {staffIdDisplay}
                      </td>
                      <td className="py-2.5 px-3 font-semibold border-r border-slate-300 dark:border-slate-700 print:border-black text-slate-900 dark:text-white print:text-black whitespace-nowrap">
                        {staffNameDisplay}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 print:border-black text-slate-600 dark:text-slate-300 print:text-black whitespace-nowrap">
                        {designationDisplay}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold border-r border-slate-300 dark:border-slate-700 print:border-black text-emerald-700 dark:text-emerald-400 print:text-black">
                        {item.metrics.presentDays}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold border-r border-slate-300 dark:border-slate-700 print:border-black text-rose-600 dark:text-rose-400 print:text-black">
                        {item.metrics.absentDays}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold border-r border-slate-300 dark:border-slate-700 print:border-black text-amber-700 dark:text-amber-400 print:text-black">
                        {item.metrics.paidLeaveDays}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold border-r border-slate-300 dark:border-slate-700 print:border-black text-slate-600 dark:text-slate-400 print:text-black">
                        {item.metrics.lateDays || 0}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white print:text-black whitespace-nowrap">
                        ৳{Number(netPayable).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}

                {/* Grand Total Row at Bottom */}
                <tr className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 border-t-2 border-slate-400 dark:border-slate-600 print:border-black font-bold">
                  <td
                    colSpan={8}
                    className="py-3 px-3 text-right uppercase tracking-wider text-xs border-r border-slate-300 dark:border-slate-700 print:border-black text-slate-900 dark:text-white print:text-black font-bold"
                  >
                    Total Payable Salary ({totals.totalStaff} Employees):
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-white print:text-black text-sm whitespace-nowrap">
                    ৳{totals.totalPayable.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Official Report Sign-off Strip (for Print / Records) */}
        <div className="pt-10 grid grid-cols-3 gap-6 text-center text-xs text-slate-600 dark:text-slate-400 print:text-black">
          <div className="border-t border-slate-300 dark:border-slate-700 print:border-black pt-2">
            <p className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">Prepared By</p>
            <p className="text-[11px] text-slate-500 print:text-black">HR / Branch Officer</p>
          </div>
          <div className="border-t border-slate-300 dark:border-slate-700 print:border-black pt-2">
            <p className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">Verified By</p>
            <p className="text-[11px] text-slate-500 print:text-black">Branch Manager</p>
          </div>
          <div className="border-t border-slate-300 dark:border-slate-700 print:border-black pt-2">
            <p className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">Authorized Signature</p>
            <p className="text-[11px] text-slate-500 print:text-black">Pharmacy Owner / Accounts</p>
          </div>
        </div>
      </div>
    )}
  </div>
);
}
