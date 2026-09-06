"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { OwnerModule } from "./DashboardSidebar";
import {
  CalendarCheck,
  CalendarDays,
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
  Info,
  Calendar,
  Sparkles,
  ArrowRight,
  Shield,
  Briefcase,
  DollarSign,
  Eye,
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
  status: "PRESENT" | "ABSENT";
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tab 1: Daily Attendance State
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [roster, setRoster] = useState<RosterItem[]>([]);
  const [isDateOffDay, setIsDateOffDay] = useState(false);
  const [dateDayOfWeek, setDateDayOfWeek] = useState("");
  const [searchDaily, setSearchDaily] = useState("");

  // Tab 2: Off-Day Setup State
  const [offDayMonth, setOffDayMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [weeklyOffDays, setWeeklyOffDays] = useState<string[]>(["FRIDAY"]);
  const [offDayNotes, setOffDayNotes] = useState("");
  const [offDayMeta, setOffDayMeta] = useState<OffDayMeta | null>(null);

  // Tab 3: Monthly Summary State
  const [summaryMonth, setSummaryMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [monthlySummaries, setMonthlySummaries] = useState<SummaryItem[]>([]);
  const [searchSummary, setSearchSummary] = useState("");

  // Tab 4: Employee Self-Service Attendance History
  const [myHistoryMonth, setMyHistoryMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [myHistory, setMyHistory] = useState<any | null>(null);

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
    status: "PRESENT" | "ABSENT"
  ) => {
    setRoster((prev) =>
      prev.map((emp) => (emp.id === empId ? { ...emp, status } : emp))
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
        setSuccessMsg(`Attendance for ${selectedDate} saved successfully!`);
        await loadDailySheet();
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        setError(res.message || "Failed to save attendance");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save attendance");
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
        setSuccessMsg(`Monthly off-days for ${offDayMonth} configured successfully!`);
        await loadOffDayConfig();
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        setError(res.message || "Failed to save off-day configuration");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save off-day configuration");
    } finally {
      setSaving(false);
    }
  };

  const toggleWeeklyOff = (dayId: string) => {
    setWeeklyOffDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  const filteredRoster = roster.filter(
    (emp) =>
      !searchDaily ||
      (emp.name && emp.name.toLowerCase().includes(searchDaily.toLowerCase())) ||
      emp.username.toLowerCase().includes(searchDaily.toLowerCase()) ||
      (emp.phone && emp.phone.includes(searchDaily))
  );

  const filteredSummary = monthlySummaries.filter(
    (item) =>
      !searchSummary ||
      (item.employee.name && item.employee.name.toLowerCase().includes(searchSummary.toLowerCase())) ||
      item.employee.username.toLowerCase().includes(searchSummary.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Attendance & Working Days
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isManager
                ? "Manage daily staff attendance, configure monthly weekly off-days, and review automated payroll deductions."
                : "View your personal monthly attendance logs, working days count, and status."}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl overflow-x-auto">
          {isManager && (
            <>
              <button
                onClick={() => setActiveTab("daily")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "daily"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Daily Attendance</span>
              </button>

              <button
                onClick={() => setActiveTab("offdays")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "offdays"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Off-Day Setup</span>
              </button>

              <button
                onClick={() => setActiveTab("summary")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "summary"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
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
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "my_history"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
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
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400 text-xs font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-bold">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB 1: DAILY ATTENDANCE (MANAGER/OWNER) */}
      {activeTab === "daily" && isManager && (
        <div className="space-y-4">
          {/* Controls Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Selector */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                />
              </div>

              {/* Off-Day Status Indicator */}
              {isDateOffDay ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold">
                  <Coffee className="w-3.5 h-3.5" />
                  <span>Scheduled Off-Day ({dateDayOfWeek}) — Non-Working Day</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Official Working Day ({dateDayOfWeek})</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition"
              >
                Mark All Present
              </button>

              <button
                type="button"
                onClick={handleSaveDailyAttendance}
                disabled={saving || roster.length === 0}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Attendance</span>
              </button>
            </div>
          </div>

          {isDateOffDay ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-12 text-center space-y-3">
              <Coffee className="w-12 h-12 mx-auto text-amber-600 dark:text-amber-400" />
              <h3 className="text-xl font-extrabold text-amber-900 dark:text-amber-200">Today is Off-Day</h3>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 max-w-md mx-auto">
                {selectedDate} ({dateDayOfWeek}) is a configured weekly off-day for this branch. Attendance marking is disabled on off-days, and off-days are excluded from monthly working days and salary deductions.
              </p>
            </div>
          ) : (
            <>
              {/* Search bar */}
              <div className="relative max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search employee by name, username..."
                  value={searchDaily}
                  onChange={(e) => setSearchDaily(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Roster Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
                {loading ? (
                  <div className="p-16 text-center text-slate-400 flex flex-col items-center gap-2">
                    <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
                    <span className="text-xs font-bold">Loading staff attendance sheet...</span>
                  </div>
                ) : filteredRoster.length === 0 ? (
                  <div className="p-16 text-center text-slate-400 space-y-2">
                    <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No active staff members</h3>
                    <p className="text-xs text-slate-400">
                      No active employees are assigned to this branch to record attendance.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          <th className="py-4 px-4">Employee</th>
                          <th className="py-4 px-4">Role</th>
                          <th className="py-4 px-4">Attendance Status</th>
                          <th className="py-4 px-4">Notes / Remarks</th>
                          <th className="py-4 px-4 text-right">Saved State</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                        {filteredRoster.map((emp) => (
                          <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                            {/* Employee Name */}
                            <td className="py-4 px-4">
                              <div className="font-extrabold text-slate-900 dark:text-white">
                                {emp.name || emp.username}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">@{emp.username}</div>
                            </td>

                            {/* Role */}
                            <td className="py-4 px-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {emp.role}
                              </span>
                            </td>

                            {/* Status Select Buttons (Present / Absent Only) */}
                            <td className="py-4 px-4">
                              <div className="flex flex-wrap items-center gap-2">
                                {/* PRESENT */}
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(emp.id, "PRESENT")}
                                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                    emp.status === "PRESENT"
                                      ? "bg-emerald-600 text-white shadow-xs"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                                  }`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Present</span>
                                </button>

                                {/* ABSENT */}
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(emp.id, "ABSENT")}
                                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                    emp.status === "ABSENT"
                                      ? "bg-rose-600 text-white shadow-xs"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                                  }`}
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Absent</span>
                                </button>
                              </div>
                            </td>

                        {/* Notes */}
                        <td className="py-4 px-4">
                          <input
                            type="text"
                            placeholder="Optional remark..."
                            value={emp.notes || ""}
                            onChange={(e) => handleNotesChange(emp.id, e.target.value)}
                            className="w-full max-w-xs px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
                          />
                        </td>

                        {/* Saved State */}
                        <td className="py-4 px-4 text-right">
                          {emp.hasSavedRecord ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <Check className="w-3 h-3" /> Saved
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400">Unsaved</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )}

      {/* TAB 2: OFF-DAY SETUP (MANAGER/OWNER) */}
      {activeTab === "offdays" && isManager && (
        <form onSubmit={handleSaveOffDayConfig} className="space-y-6 max-w-3xl">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Monthly Off-Day Setup
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure which days of the week are non-working days (e.g. Friday, Saturday).
                Off-days are automatically excluded from working days for attendance and salary deduction.
              </p>
            </div>

            {/* Month Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 block">
                Select Month *
              </label>
              <div className="flex items-center gap-2 max-w-xs bg-slate-50 dark:bg-slate-800 px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <input
                  type="month"
                  required
                  value={offDayMonth}
                  onChange={(e) => setOffDayMonth(e.target.value)}
                  className="text-xs font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Day of Week Multi-select */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 block">
                Select Weekly Off-Days *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {WEEKDAYS.map((day) => {
                  const isChecked = weeklyOffDays.includes(day.id);
                  return (
                    <div
                      key={day.id}
                      onClick={() => toggleWeeklyOff(day.id)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                        isChecked
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-extrabold shadow-2xs"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                      }`}
                    >
                      <span className="text-xs">{day.label}</span>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center ${
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
            {offDayMeta && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Days in Month</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    {offDayMeta.totalDays} Days
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Configured Off-Days</span>
                  <span className="text-2xl font-black text-amber-600 font-mono">
                    {offDayMeta.offDaysCount} Days
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Official Working Days</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {offDayMeta.workingDaysCount} Days
                  </span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 block">
                Remarks / Holiday Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. 4 Fridays off + Eid holiday"
                value={offDayNotes}
                onChange={(e) => setOffDayNotes(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase text-slate-500">Summary Month:</span>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <input
                  type="month"
                  value={summaryMonth}
                  onChange={(e) => setSummaryMonth(e.target.value)}
                  className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchSummary}
                onChange={(e) => setSearchSummary(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-16 text-center text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
                <span className="text-xs font-bold">Computing working days & attendance deductions...</span>
              </div>
            ) : filteredSummary.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-2">
                <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No summary records found</h3>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      <th className="py-4 px-4">Employee</th>
                      <th className="py-4 px-4">Working Days</th>
                      <th className="py-4 px-4">Present</th>
                      <th className="py-4 px-4">Absent / Unpaid</th>
                      <th className="py-4 px-4">Daily Rate</th>
                      <th className="py-4 px-4">Auto Deduction</th>
                      <th className="py-4 px-4">Allowances</th>
                      <th className="py-4 px-4">Final Payable</th>
                      <th className="py-4 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                    {filteredSummary.map((item) => {
                      const m = item.metrics;
                      return (
                        <tr key={item.employee.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                          <td className="py-4 px-4">
                            <div className="font-extrabold text-slate-900 dark:text-white">
                              {item.employee.name || item.employee.username}
                            </div>
                            <div className="text-[10px] text-slate-400">{item.employee.role}</div>
                          </td>

                          <td className="py-4 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {m.totalWorkingDays} days
                            <span className="text-[10px] text-slate-400 block">({m.offDays} off-days)</span>
                          </td>

                          <td className="py-4 px-4 font-mono font-bold text-emerald-600">
                            {m.presentDays} days
                          </td>

                          <td className="py-4 px-4 font-mono font-bold text-rose-600">
                            {m.absentDays + m.unpaidLeaveDays} days
                            {m.paidLeaveDays > 0 && (
                              <span className="text-[10px] text-blue-600 block">
                                (+{m.paidLeaveDays} paid leave)
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                            ৳{m.dailyRate.toLocaleString()}
                          </td>

                          <td className="py-4 px-4 font-mono font-bold text-rose-600">
                            -৳{m.attendanceDeduction.toLocaleString()}
                          </td>

                          <td className="py-4 px-4 font-mono font-bold text-emerald-600">
                            +৳{m.totalAllowances.toLocaleString()}
                          </td>

                          <td className="py-4 px-4 font-mono font-black text-slate-900 dark:text-white text-sm">
                            ৳{m.finalPayable.toLocaleString()}
                          </td>

                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => onSelectEmployee?.(item.employee.id)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/10 hover:text-emerald-600 text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
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

      {/* TAB 4: MY ATTENDANCE HISTORY (EMPLOYEE SELF-SERVICE) */}
      {activeTab === "my_history" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase text-slate-500">Select Month:</span>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <input
                  type="month"
                  value={myHistoryMonth}
                  onChange={(e) => setMyHistoryMonth(e.target.value)}
                  className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={loadMyHistory}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Stats KPI Cards */}
          {myHistory && myHistory.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                  Working Days
                </span>
                <span className="text-xl font-black text-purple-600 font-mono mt-1 block">
                  {myHistory.summary.totalWorkingDays}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                  Present Days
                </span>
                <span className="text-xl font-black text-emerald-600 font-mono mt-1 block">
                  {myHistory.summary.presentDays}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                  Absent Days
                </span>
                <span className="text-xl font-black text-rose-600 font-mono mt-1 block">
                  {myHistory.summary.absentDays}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                  Paid Leave
                </span>
                <span className="text-xl font-black text-blue-600 font-mono mt-1 block">
                  {myHistory.summary.paidLeaveDays}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                  Unpaid Leave
                </span>
                <span className="text-xl font-black text-amber-600 font-mono mt-1 block">
                  {myHistory.summary.unpaidLeaveDays}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                  Off Days
                </span>
                <span className="text-xl font-black text-slate-700 dark:text-slate-300 font-mono mt-1 block">
                  {myHistory.summary.offDays}
                </span>
              </div>
            </div>
          )}

          {/* Detailed Day-by-Day Sheet */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-16 text-center text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
                <span className="text-xs font-bold">Loading your attendance logs...</span>
              </div>
            ) : !myHistory || myHistory.history?.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-2">
                <Calendar className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No attendance history</h3>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      <th className="py-4 px-4">Date</th>
                      <th className="py-4 px-4">Day</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-4">Notes / Remarks</th>
                      <th className="py-4 px-4 text-right">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                    {myHistory.history.map((day: any) => (
                      <tr key={day.date} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {day.date}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 font-bold">{day.dayOfWeek}</td>

                        <td className="py-3.5 px-4">
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
                              <Coffee className="w-3 h-3" /> Scheduled Off Day
                            </span>
                          )}
                          {day.status === "NOT_MARKED" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                              — Not Marked
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 italic">{day.notes || "—"}</td>

                        <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                          {day.markedBy?.name || day.markedBy?.username || "Manager"}
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
    </div>
  );
}
