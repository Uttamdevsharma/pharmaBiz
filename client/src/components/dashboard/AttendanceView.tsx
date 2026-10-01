"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { showToast } from "@/lib/swal";
import { useAuth } from "@/context/AuthContext";
import { OwnerModule } from "./DashboardSidebar";
import {
  CalendarCheck,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Coffee,
  AlertCircle,
  Loader2,
  Save,
  Check,
  Search,
  RefreshCw,
  Calendar,
  Sparkles,
  Shield,
  Briefcase,
  DollarSign,
  Eye,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface AttendanceViewProps {
  selectedBranchId?: string;
  onNavigate?: (module: OwnerModule) => void;
  onSelectEmployee?: (employeeId: string) => void;
  initialTab?: "daily" | "offdays" | "summary" | "my_history";
}

interface RosterItem {
  id: string;
  name?: string;
  username: string;
  role: string;
  avatarUrl?: string;
  phone?: string;
  isPermanent?: boolean;
  paidLeavesUsed?: number;
  annualPaidLeaveAllowance?: number;
  status: "PRESENT" | "ABSENT" | "LATE" | "PAID_LEAVE" | "UNPAID_LEAVE" | "OFF_DAY";
  hasSavedRecord: boolean;
  notes?: string;
  markedBy?: { name?: string; username: string } | null;
}

interface OffDayMeta {
  month: string;
  totalDays: number;
  offDaysCount: number;
  workingDaysCount: number;
  calendarDays: Array<{
    date: string;
    dayNumber: number;
    dayOfWeek: string;
    isOffDay: boolean;
    isWeeklyOff: boolean;
    isCustomOff: boolean;
  }>;
}

interface SummaryItem {
  employee: {
    id: string;
    name?: string;
    username: string;
    role: string;
  };
  metrics: {
    baseSalary: number;
    totalDays: number;
    offDays: number;
    totalWorkingDays: number;
    presentDays: number;
    absentDays: number;
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

const WEEKDAYS = [
  { id: "FRIDAY", label: "Friday" },
  { id: "SATURDAY", label: "Saturday" },
  { id: "SUNDAY", label: "Sunday" },
  { id: "MONDAY", label: "Monday" },
  { id: "TUESDAY", label: "Tuesday" },
  { id: "WEDNESDAY", label: "Wednesday" },
  { id: "THURSDAY", label: "Thursday" },
];

function TablePaginationFooter({
  page,
  limit,
  total,
  totalPages,
  itemLabel = "records",
  onPageChange,
  onLimitChange,
}: {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  itemLabel?: string;
  onPageChange: (p: number) => void;
  onLimitChange: (l: number) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/75 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-xs sm:text-sm">
      <div className="text-slate-500">
        Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{total === 0 ? 0 : (page - 1) * limit + 1}</span> to{" "}
        <span className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(page * limit, total)}</span> of{" "}
        <span className="font-semibold text-slate-800 dark:text-slate-200">{total}</span> {itemLabel}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Rows per page:</span>
          <select
            value={limit}
            onChange={(e) => {
              onLimitChange(Number(e.target.value));
              onPageChange(1);
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
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer"
            title="First Page"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="px-2 text-xs text-slate-600 dark:text-slate-300">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer"
            title="Last Page"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AttendanceView({
  selectedBranchId,
  onNavigate,
  onSelectEmployee,
  initialTab,
}: AttendanceViewProps) {
  const { user, hasPermission } = useAuth();
  const isManager =
    user?.role === "BRANCH_MANAGER" ||
    user?.role === "MANAGER" ||
    user?.role === "COMPANY_OWNER" ||
    user?.role === "SUPER_ADMIN" ||
    (user?.pharmacyRoleName ? user.pharmacyRoleName.toLowerCase().includes("branch manager") : false) ||
    (user?.customRoleName ? user.customRoleName.toLowerCase().includes("branch manager") : false) ||
    hasPermission("attendance.manage");

  const [activeTab, setActiveTab] = useState<"daily" | "offdays" | "summary" | "my_history">(
    initialTab || (isManager ? "daily" : "my_history")
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab 1: Daily Attendance State
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [roster, setRoster] = useState<RosterItem[]>([]);
  const [isDateOffDay, setIsDateOffDay] = useState(false);
  const [dateDayOfWeek, setDateDayOfWeek] = useState("");
  const [searchDaily, setSearchDaily] = useState("");
  const [dailyPage, setDailyPage] = useState(1);
  const [dailyLimit, setDailyLimit] = useState(10);

  // Tab 2: Off-Day Setup State
  const [offDayMonth, setOffDayMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [weeklyOffDays, setWeeklyOffDays] = useState<string[]>(["FRIDAY"]);
  const [offDayNotes, setOffDayNotes] = useState("");
  const [offDayMeta, setOffDayMeta] = useState<OffDayMeta | null>(null);

  // Tab 3: Monthly Summary State
  const [summaryMonth, setSummaryMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [monthlySummaries, setMonthlySummaries] = useState<SummaryItem[]>([]);
  const [searchSummary, setSearchSummary] = useState("");
  const [summaryPage, setSummaryPage] = useState(1);
  const [summaryLimit, setSummaryLimit] = useState(10);

  // Tab 4: Employee Self-Service Attendance History
  const [myHistoryMonth, setMyHistoryMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [myHistory, setMyHistory] = useState<any | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(10);

  // 1. Load Daily Attendance Sheet
  const loadDailySheet = async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<any>(
        `/attendance/daily?branchId=${selectedBranchId}&date=${selectedDate}`
      );
      if (res.success && res.data) {
        setRoster(res.data.roster || []);
        setIsDateOffDay(res.data.isOffDay || false);
        setDateDayOfWeek(res.data.dayOfWeek || "");
      } else {
        setError(res.message || "Failed to load daily attendance sheet");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load daily attendance sheet");
    } finally {
      setLoading(false);
    }
  };

  // 2. Load Monthly Off-Day Config
  const loadOffDayConfig = async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<any>(
        `/attendance/off-days?branchId=${selectedBranchId}&month=${offDayMonth}`
      );
      if (res.success && res.data) {
        setWeeklyOffDays(res.data.weeklyOffDays || ["FRIDAY"]);
        setOffDayNotes(res.data.notes || "");
        setOffDayMeta(res.data.meta || null);
      } else {
        setError(res.message || "Failed to load off-day configuration");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load off-day configuration");
    } finally {
      setLoading(false);
    }
  };

  // 3. Load Monthly Attendance & Payroll Summary
  const loadSummary = async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<any>(
        `/attendance/summary?branchId=${selectedBranchId}&month=${summaryMonth}`
      );
      if (res.success && res.data) {
        setMonthlySummaries(res.data || []);
      } else {
        setError(res.message || "Failed to load monthly attendance summary");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load monthly attendance summary");
    } finally {
      setLoading(false);
    }
  };

  // 4. Load My Attendance History (Self-Service)
  const loadMyHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<any>(`/attendance/my-history?month=${myHistoryMonth}`);
      if (res.success && res.data) {
        setMyHistory(res.data);
      } else {
        setError(res.message || "Failed to load your attendance history");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load your attendance history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "daily") {
      loadDailySheet();
    } else if (activeTab === "offdays") {
      loadOffDayConfig();
    } else if (activeTab === "summary") {
      loadSummary();
    } else if (activeTab === "my_history") {
      loadMyHistory();
    }
  }, [activeTab, selectedBranchId, selectedDate, offDayMonth, summaryMonth, myHistoryMonth]);

  // Reset pagination when filters change
  useEffect(() => {
    setDailyPage(1);
  }, [searchDaily, selectedDate, selectedBranchId]);

  useEffect(() => {
    setSummaryPage(1);
  }, [searchSummary, summaryMonth, selectedBranchId]);

  useEffect(() => {
    setHistoryPage(1);
  }, [myHistoryMonth]);

  // Handle Mark All Present
  const handleMarkAllPresent = () => {
    setRoster((prev) =>
      prev.map((emp) => ({
        ...emp,
        status: "PRESENT",
      }))
    );
  };

  // Handle individual status change
  const handleStatusChange = (
    empId: string,
    status: "PRESENT" | "ABSENT" | "LATE" | "PAID_LEAVE"
  ) => {
    setRoster((prev) =>
      prev.map((emp) => {
        if (emp.id === empId) {
          if (status === "PAID_LEAVE" && !emp.isPermanent) {
            setError(`Cannot grant Paid Leave: "${emp.name || emp.username}" is not a permanent employee. Only permanent employees are eligible for paid leave.`);
            return emp;
          }
          return { ...emp, status };
        }
        return emp;
      })
    );
  };

  // Handle individual notes change
  const handleNotesChange = (empId: string, notes: string) => {
    setRoster((prev) =>
      prev.map((emp) => (emp.id === empId ? { ...emp, notes } : emp))
    );
  };

  // Save Daily Attendance Sheet
  const handleSaveDailyAttendance = async () => {
    if (!selectedBranchId) return;
    try {
      setSaving(true);
      setError(null);
      const attendances = roster.map((emp) => ({
        userId: emp.id,
        status: emp.status,
        notes: emp.notes?.trim() || null,
      }));

      const res = await fetchApi<any>("/attendance/daily", {
        method: "POST",
        body: JSON.stringify({
          branchId: selectedBranchId,
          date: selectedDate,
          attendances,
        }),
      });

      if (res.success) {
        showToast(`Attendance for ${selectedDate} saved successfully!`, "success");
        await loadDailySheet();
      } else {
        const msg = res.message || "Failed to save attendance";
        setError(msg);
        showToast(msg, "error");
      }
    } catch (err: any) {
      const msg = err.message || "Failed to save attendance";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  // Save Monthly Off-Day Config
  const handleSaveOffDayConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;
    if (weeklyOffDays.length === 0) {
      setError("Please select at least one weekly off-day (e.g. Friday).");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const res = await fetchApi<any>("/attendance/off-days", {
        method: "POST",
        body: JSON.stringify({
          branchId: selectedBranchId,
          month: offDayMonth,
          weeklyOffDays,
          notes: offDayNotes.trim() || null,
        }),
      });

      if (res.success) {
        showToast(`Monthly off-days for ${offDayMonth} configured successfully!`, "success");
        await loadOffDayConfig();
      } else {
        const msg = res.message || "Failed to save off-day configuration";
        setError(msg);
        showToast(msg, "error");
      }
    } catch (err: any) {
      const msg = err.message || "Failed to save off-day configuration";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleWeeklyOff = (dayId: string) => {
    setWeeklyOffDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  // Filtered and paginated roster (Tab 1)
  const filteredRoster = roster.filter(
    (emp) =>
      !searchDaily ||
      (emp.name && emp.name.toLowerCase().includes(searchDaily.toLowerCase())) ||
      emp.username.toLowerCase().includes(searchDaily.toLowerCase()) ||
      (emp.phone && emp.phone.includes(searchDaily))
  );
  const totalDaily = filteredRoster.length;
  const totalDailyPages = Math.max(1, Math.ceil(totalDaily / dailyLimit));
  const paginatedRoster = filteredRoster.slice((dailyPage - 1) * dailyLimit, dailyPage * dailyLimit);

  // Filtered and paginated summary (Tab 3)
  const filteredSummary = monthlySummaries.filter(
    (item) =>
      !searchSummary ||
      (item.employee.name && item.employee.name.toLowerCase().includes(searchSummary.toLowerCase())) ||
      item.employee.username.toLowerCase().includes(searchSummary.toLowerCase())
  );
  const totalSummary = filteredSummary.length;
  const totalSummaryPages = Math.max(1, Math.ceil(totalSummary / summaryLimit));
  const paginatedSummary = filteredSummary.slice((summaryPage - 1) * summaryLimit, summaryPage * summaryLimit);

  // Filtered and paginated history (Tab 4)
  const historyList = myHistory?.history || [];
  const totalHistory = historyList.length;
  const totalHistoryPages = Math.max(1, Math.ceil(totalHistory / historyLimit));
  const paginatedHistory = historyList.slice((historyPage - 1) * historyLimit, historyPage * historyLimit);

  return (
    <div className="space-y-4 pb-12">
      {/* Header Banner - Clean, Square, matching FundTransferHistoryView */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-none">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Attendance & Working Days
            </h1>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-none overflow-x-auto">
          {isManager && (
            <>
              <button
                onClick={() => setActiveTab("daily")}
                className={`px-3.5 py-1.5 rounded-none text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === "daily"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Daily Attendance</span>
              </button>

              <button
                onClick={() => setActiveTab("offdays")}
                className={`px-3.5 py-1.5 rounded-none text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === "offdays"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Off-Day Setup</span>
              </button>

              <button
                onClick={() => setActiveTab("summary")}
                className={`px-3.5 py-1.5 rounded-none text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === "summary"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Payroll Summary</span>
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab("my_history")}
            className={`px-3.5 py-1.5 rounded-none text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "my_history"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>My Attendance History</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-3 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-none text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}


      {/* TAB 1: DAILY ATTENDANCE (MANAGER/OWNER) */}
      {activeTab === "daily" && isManager && (
        <div className="space-y-4">
          {/* Controls Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-3.5 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Selector */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-none border border-slate-200 dark:border-slate-700">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs sm:text-sm font-bold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                />
              </div>

              {/* Off-Day Status Indicator */}
              {isDateOffDay ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs sm:text-sm font-semibold">
                  <Coffee className="w-3.5 h-3.5" />
                  <span>Scheduled Off-Day ({dateDayOfWeek}) — Non-Working Day</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-semibold">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Official Working Day ({dateDayOfWeek})</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-none transition border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                Mark All Present
              </button>

              <button
                type="button"
                onClick={handleSaveDailyAttendance}
                disabled={saving || roster.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-none transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Attendance</span>
              </button>
            </div>
          </div>

          {isDateOffDay ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-none p-10 text-center space-y-2">
              <Coffee className="w-10 h-10 mx-auto text-amber-600 dark:text-amber-400" />
              <h3 className="text-lg sm:text-xl font-bold text-amber-900 dark:text-amber-200">Today is Off-Day</h3>
              <p className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-300 max-w-md mx-auto">
                {selectedDate} ({dateDayOfWeek}) is a configured weekly off-day for this branch. Attendance marking is disabled on off-days, and off-days are excluded from monthly working days and salary deductions.
              </p>
            </div>
          ) : (
            <>
              {/* Search bar */}
              <div className="relative max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search employee by name, username..."
                  value={searchDaily}
                  onChange={(e) => setSearchDaily(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary"
                />
              </div>

              {/* Roster Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse min-w-[750px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/75 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-4">Employee</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Attendance Status</th>
                        <th className="py-3 px-4">Notes / Remarks</th>
                        <th className="py-3 px-4 text-right">Saved State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
                      {loading ? (
                        [...Array(6)].map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="py-3.5 px-4">
                              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-none mb-1.5" />
                              <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded-none" />
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-none" />
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex gap-2">
                                <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded-none" />
                                <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded-none" />
                                <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded-none" />
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="h-7 w-full max-w-xs bg-slate-100 dark:bg-slate-800 rounded-none" />
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded-none ml-auto" />
                            </td>
                          </tr>
                        ))
                      ) : filteredRoster.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-12 text-center text-slate-400">
                            <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No active staff members</h3>
                            <p className="text-xs sm:text-sm text-slate-400 mt-1">
                              No active employees are assigned to this branch to record attendance.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        paginatedRoster.map((emp) => (
                          <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                            {/* Employee Name */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 dark:text-white text-sm">
                                {emp.name || emp.username}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-slate-500 font-mono">@{emp.username}</span>
                                {emp.isPermanent ? (
                                  <span className="text-xs font-semibold px-1.5 py-0.2 rounded-none bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    Permanent
                                  </span>
                                ) : (
                                  <span className="text-xs font-semibold px-1.5 py-0.2 rounded-none bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    Probation
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Role */}
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none text-xs font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                <Shield className="h-3 w-3 text-brand-primary" />
                                {emp.role}
                              </span>
                            </td>

                            {/* Status Select Buttons */}
                            <td className="py-3.5 px-4">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {/* PRESENT */}
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(emp.id, "PRESENT")}
                                  className={`px-3 py-1.5 rounded-none text-xs sm:text-sm font-semibold transition flex items-center gap-1 cursor-pointer ${
                                    emp.status === "PRESENT"
                                      ? "bg-emerald-600 text-white shadow-xs font-bold"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                                  }`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Present</span>
                                </button>

                                {/* ABSENT */}
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(emp.id, "ABSENT")}
                                  className={`px-3 py-1.5 rounded-none text-xs sm:text-sm font-semibold transition flex items-center gap-1 cursor-pointer ${
                                    emp.status === "ABSENT"
                                      ? "bg-rose-600 text-white shadow-xs font-bold"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                                  }`}
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Absent</span>
                                </button>

                                {/* LATE */}
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(emp.id, "LATE")}
                                  className={`px-3 py-1.5 rounded-none text-xs sm:text-sm font-semibold transition flex items-center gap-1 cursor-pointer ${
                                    emp.status === "LATE"
                                      ? "bg-amber-500 text-white shadow-xs font-bold"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                                  }`}
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Late</span>
                                </button>

                                {/* PAID LEAVE (Permanent Employees Only) */}
                                {emp.isPermanent ? (
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(emp.id, "PAID_LEAVE")}
                                    className={`px-3 py-1.5 rounded-none text-xs sm:text-sm font-semibold transition flex items-center gap-1 cursor-pointer ${
                                      emp.status === "PAID_LEAVE"
                                        ? "bg-blue-600 text-white shadow-xs font-bold"
                                        : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                                    }`}
                                    title={`Paid Leave: ${emp.paidLeavesUsed || 0}/${emp.annualPaidLeaveAllowance || 30} days used this year`}
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                                    <span>Paid Leave</span>
                                    <span className="text-xs font-mono opacity-85">
                                      ({emp.paidLeavesUsed || 0}/{emp.annualPaidLeaveAllowance || 30}d)
                                    </span>
                                  </button>
                                ) : (
                                  <div
                                    className="px-2.5 py-1.5 rounded-none text-xs font-medium bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 flex items-center gap-1 cursor-not-allowed select-none"
                                    title="Not a permanent employee. Update staff in Staff List to make them permanent."
                                  >
                                    <Lock className="w-3 h-3 text-slate-400" />
                                    <span>Paid Leave: Not Permanent Yet</span>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Notes */}
                            <td className="py-3.5 px-4">
                              <input
                                type="text"
                                placeholder="Optional remark..."
                                value={emp.notes || ""}
                                onChange={(e) => handleNotesChange(emp.id, e.target.value)}
                                className="w-full max-w-xs px-3 py-1.5 rounded-none text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
                              />
                            </td>

                            {/* Saved State */}
                            <td className="py-3.5 px-4 text-right">
                              {emp.hasSavedRecord ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  <Check className="w-3.5 h-3.5" /> Saved
                                </span>
                              ) : (
                                <span className="text-xs font-medium text-slate-400">Unsaved</span>
                              )}
                            </td>
                          </tr>
                        )))}
                      </tbody>
                    </table>
                  </div>

                {/* Table Pagination Footer for Daily Roster - Always Visible */}
                <TablePaginationFooter
                  page={dailyPage}
                  limit={dailyLimit}
                  total={totalDaily}
                  totalPages={totalDailyPages}
                  itemLabel="staff"
                  onPageChange={setDailyPage}
                  onLimitChange={setDailyLimit}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: OFF-DAY SETUP (MANAGER/OWNER) */}
      {activeTab === "offdays" && isManager && (
        <form onSubmit={handleSaveOffDayConfig} className="space-y-4 max-w-3xl">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-5 sm:p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Monthly Off-Day Setup
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Configure which days of the week are non-working days (e.g. Friday, Saturday).
                Off-days are automatically excluded from working days for attendance and salary deduction.
              </p>
            </div>

            {/* Month Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block">
                Select Month *
              </label>
              <div className="flex items-center gap-2 max-w-xs bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-none border border-slate-200 dark:border-slate-700">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <input
                  type="month"
                  required
                  value={offDayMonth}
                  onChange={(e) => setOffDayMonth(e.target.value)}
                  className="text-xs sm:text-sm font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Day of Week Multi-select */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block">
                Select Weekly Off-Days *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {WEEKDAYS.map((day) => {
                  const isChecked = weeklyOffDays.includes(day.id);
                  return (
                    <div
                      key={day.id}
                      onClick={() => toggleWeeklyOff(day.id)}
                      className={`p-3 rounded-none border transition cursor-pointer flex items-center justify-between ${
                        isChecked
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                      }`}
                    >
                      <span className="text-xs sm:text-sm">{day.label}</span>
                      <div
                        className={`w-4 h-4 rounded-none border flex items-center justify-center ${
                          isChecked ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300"
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calculations Preview Banner */}
            {loading && !offDayMeta ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-none bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded-none" />
                    <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-none" />
                  </div>
                ))}
              </div>
            ) : offDayMeta ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-none bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase block">Total Days in Month</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                    {offDayMeta.totalDays} Days
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase block">Configured Off-Days</span>
                  <span className="text-xl font-bold text-amber-600 font-mono">
                    {offDayMeta.offDaysCount} Days
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase block">Official Working Days</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {offDayMeta.workingDaysCount} Days
                  </span>
                </div>
              </div>
            ) : null}

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block">
                Remarks / Holiday Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. 4 Fridays off + Eid holiday"
                value={offDayNotes}
                onChange={(e) => setOffDayNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-xs sm:text-sm font-medium focus:outline-none focus:border-brand-primary dark:text-white resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-none transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Off-Day Setup</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: MONTHLY SUMMARY & PAYROLL CALCULATION (MANAGER/OWNER) */}
      {activeTab === "summary" && isManager && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-3.5 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">Summary Month:</span>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-none border border-slate-200 dark:border-slate-700">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <input
                  type="month"
                  value={summaryMonth}
                  onChange={(e) => setSummaryMonth(e.target.value)}
                  className="text-xs sm:text-sm font-bold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchSummary}
                onChange={(e) => setSearchSummary(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/75 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Working Days</th>
                    <th className="py-3 px-4">Present</th>
                    <th className="py-3 px-4">Absent / Unpaid</th>
                    <th className="py-3 px-4">Daily Rate</th>
                    <th className="py-3 px-4">Auto Deduction</th>
                    <th className="py-3 px-4">Allowances</th>
                    <th className="py-3 px-4">Final Payable</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {loading ? (
                    [...Array(6)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-3.5 px-4">
                          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-none mb-1.5" />
                          <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800/60 rounded-none" />
                        </td>
                        <td className="py-3.5 px-4"><div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-none" /></td>
                        <td className="py-3.5 px-4"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-none" /></td>
                        <td className="py-3.5 px-4"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-none" /></td>
                        <td className="py-3.5 px-4"><div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-none" /></td>
                        <td className="py-3.5 px-4"><div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-none" /></td>
                        <td className="py-3.5 px-4"><div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-none" /></td>
                        <td className="py-3.5 px-4"><div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-none" /></td>
                        <td className="py-3.5 px-4 text-right"><div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded-none ml-auto" /></td>
                      </tr>
                    ))
                  ) : filteredSummary.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No summary records found</h3>
                      </td>
                    </tr>
                  ) : (
                    paginatedSummary.map((item) => {
                      const m = item.metrics;
                      return (
                        <tr key={item.employee.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white text-sm">
                              {item.employee.name || item.employee.username}
                            </div>
                            <div className="text-xs text-slate-500">{item.employee.role}</div>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {m.totalWorkingDays} days
                            <span className="text-xs text-slate-400 block font-normal">({m.offDays} off-days)</span>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                            {m.presentDays} days
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-rose-600">
                            {m.absentDays + m.unpaidLeaveDays} days
                            {m.paidLeaveDays > 0 && (
                              <span className="text-xs text-blue-600 block font-normal">
                                (+{m.paidLeaveDays} paid leave)
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                            ৳{m.dailyRate.toLocaleString()}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-rose-600">
                            -৳{m.attendanceDeduction.toLocaleString()}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                            +৳{m.totalAllowances.toLocaleString()}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                            ৳{m.finalPayable.toLocaleString()}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => onSelectEmployee?.(item.employee.id)}
                              className="px-3 py-1.5 rounded-none bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/10 hover:text-emerald-600 text-xs sm:text-sm font-semibold transition inline-flex items-center gap-1 cursor-pointer border border-slate-300 dark:border-slate-700"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>

            {/* Table Pagination Footer for Payroll Summary - Always Visible */}
            <TablePaginationFooter
              page={summaryPage}
              limit={summaryLimit}
              total={totalSummary}
              totalPages={totalSummaryPages}
              itemLabel="staff"
              onPageChange={setSummaryPage}
              onLimitChange={setSummaryLimit}
            />
          </div>
        </div>
      )}

      {/* TAB 4: MY ATTENDANCE HISTORY (EMPLOYEE SELF-SERVICE) */}
      {activeTab === "my_history" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">Select Month:</span>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-none border border-slate-200 dark:border-slate-700">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <input
                  type="month"
                  value={myHistoryMonth}
                  onChange={(e) => setMyHistoryMonth(e.target.value)}
                  className="text-xs sm:text-sm font-bold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={loadMyHistory}
              className="px-3 py-1.5 rounded-none bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 border border-slate-300 dark:border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Stats KPI Cards */}
          {loading && !myHistory ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-3.5 shadow-xs animate-pulse">
                  <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 mb-2 rounded-none" />
                  <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 rounded-none" />
                </div>
              ))}
            </div>
          ) : myHistory && myHistory.summary ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-3.5 shadow-xs">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider block">
                  Working Days
                </span>
                <span className="text-xl font-bold text-purple-600 font-mono mt-1 block">
                  {myHistory.summary.totalWorkingDays}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-3.5 shadow-xs">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider block">
                  Present Days
                </span>
                <span className="text-xl font-bold text-emerald-600 font-mono mt-1 block">
                  {myHistory.summary.presentDays}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-3.5 shadow-xs">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider block">
                  Absent Days
                </span>
                <span className="text-xl font-bold text-rose-600 font-mono mt-1 block">
                  {myHistory.summary.absentDays}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-3.5 shadow-xs">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider block">
                  Paid Leave
                </span>
                <span className="text-xl font-bold text-blue-600 font-mono mt-1 block">
                  {myHistory.summary.paidLeaveDays}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-3.5 shadow-xs">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider block">
                  Unpaid Leave
                </span>
                <span className="text-xl font-bold text-amber-600 font-mono mt-1 block">
                  {myHistory.summary.unpaidLeaveDays}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-3.5 shadow-xs">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider block">
                  Off Days
                </span>
                <span className="text-xl font-bold text-slate-700 dark:text-slate-300 font-mono mt-1 block">
                  {myHistory.summary.offDays}
                </span>
              </div>
            </div>
          ) : null}

          {/* Detailed Day-by-Day Sheet */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/75 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Day</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Notes / Remarks</th>
                    <th className="py-3 px-4 text-right">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {loading ? (
                    [...Array(6)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-3.5 px-4"><div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-none" /></td>
                        <td className="py-3.5 px-4"><div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-none" /></td>
                        <td className="py-3.5 px-4"><div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-none" /></td>
                        <td className="py-3.5 px-4"><div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded-none" /></td>
                        <td className="py-3.5 px-4 text-right"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-none ml-auto" /></td>
                      </tr>
                    ))
                  ) : !myHistory || myHistory.history?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400">
                        <Calendar className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No attendance history</h3>
                      </td>
                    </tr>
                  ) : (
                    paginatedHistory.map((day: any) => (
                      <tr key={day.date} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {day.date}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-semibold">{day.dayOfWeek}</td>

                        <td className="py-3.5 px-4">
                          {day.status === "PRESENT" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Present
                            </span>
                          )}
                          {day.status === "ABSENT" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              <XCircle className="w-3.5 h-3.5" /> Absent
                            </span>
                          )}
                          {day.status === "PAID_LEAVE" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              <Check className="w-3.5 h-3.5" /> Paid Leave
                            </span>
                          )}
                          {day.status === "UNPAID_LEAVE" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <Clock className="w-3.5 h-3.5" /> Unpaid Leave
                            </span>
                          )}
                          {day.status === "OFF_DAY" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              <Coffee className="w-3.5 h-3.5" /> Scheduled Off Day
                            </span>
                          )}
                          {day.status === "NOT_MARKED" && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                              — Not Marked
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 italic text-xs sm:text-sm">{day.notes || "—"}</td>

                        <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-xs">
                          {day.markedBy?.name || day.markedBy?.username || "Manager"}
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>

            {/* Table Pagination Footer for History - Always Visible */}
            <TablePaginationFooter
              page={historyPage}
              limit={historyLimit}
              total={totalHistory}
              totalPages={totalHistoryPages}
              itemLabel="days"
              onPageChange={setHistoryPage}
              onLimitChange={setHistoryLimit}
            />
          </div>
        </div>
      )}
    </div>
  );
}
