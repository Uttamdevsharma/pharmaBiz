"use client";

import React, { useEffect, useState, useRef } from "react";
import { fetchApi } from "@/lib/api";
import { showToast } from "@/lib/swal";
import { useBranchContext } from "@/context/BranchContext";
import {
  Calendar,
  CalendarX2,
  Check,
  CheckCircle2,
  Save,
  RotateCcw,
  Pencil,
  AlertCircle,
  Loader2,
  Building2,
} from "lucide-react";

interface OffDaySettingsTabProps {
  selectedBranchId?: string;
}

interface ActiveOffDayPreview {
  month: string;
  weeklyOffDays: string[];
  notes: string | null;
  meta: {
    totalDays: number;
    offDaysCount: number;
    workingDaysCount: number;
  } | null;
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

export function OffDaySettingsTab({ selectedBranchId: propBranchId }: OffDaySettingsTabProps) {
  const { branches, selectedBranchId: contextBranchId } = useBranchContext();
  const effectiveBranchId =
    propBranchId && propBranchId !== "all"
      ? propBranchId
      : contextBranchId && contextBranchId !== "all"
      ? contextBranchId
      : branches[0]?.id;

  const currentBranchName = branches.find((b) => b.id === effectiveBranchId)?.name;

  const monthInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [month, setMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [weeklyOffDays, setWeeklyOffDays] = useState<string[]>(["FRIDAY"]);
  const [notes, setNotes] = useState<string>("");

  // Saved preview state
  const [activePreview, setActivePreview] = useState<ActiveOffDayPreview | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadOffDayConfig = async () => {
    if (!effectiveBranchId || effectiveBranchId === "all") return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<any>(
        `/attendance/off-days?branchId=${effectiveBranchId}&month=${month}`
      );
      if (res.success && res.data) {
        const offDays = res.data.weeklyOffDays && res.data.weeklyOffDays.length > 0
          ? res.data.weeklyOffDays
          : ["FRIDAY"];
        const n = res.data.notes || "";
        const m = res.data.meta || null;

        setActivePreview({
          month,
          weeklyOffDays: offDays,
          notes: n || null,
          meta: m,
        });

        // Initialize form with existing configuration if not already manually altered
        setWeeklyOffDays(offDays);
        setNotes(n);
      } else {
        setError(res.message || "Failed to load off-day configuration");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load off-day configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffDayConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveBranchId, month]);

  const toggleWeeklyOff = (dayId: string) => {
    setWeeklyOffDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveBranchId || effectiveBranchId === "all") {
      setError("Please select a specific branch first.");
      return;
    }
    if (weeklyOffDays.length === 0) {
      setError("Please select at least one weekly off-day (e.g. Friday).");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetchApi<any>("/attendance/off-days", {
        method: "POST",
        body: JSON.stringify({
          branchId: effectiveBranchId,
          month,
          weeklyOffDays,
          notes: notes.trim() || null,
        }),
      });

      if (res.success) {
        showToast(`Off-days for ${month} saved successfully!`, "success");
        setSuccess(`Off-days for ${month} saved successfully.`);
        // Reload live preview
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

  const handleEdit = () => {
    if (!activePreview) return;
    setMonth(activePreview.month);
    setWeeklyOffDays([...activePreview.weeklyOffDays]);
    setNotes(activePreview.notes || "");
    monthInputRef.current?.focus();
    showToast("Configured off-days loaded into form for editing.", "info");
  };

  const handleResetToConfigured = () => {
    if (!activePreview) return;
    setWeeklyOffDays([...activePreview.weeklyOffDays]);
    setNotes(activePreview.notes || "");
    setError(null);
    setSuccess(null);
  };

  const formatMonthDisplay = (monthStr: string) => {
    try {
      const [year, m] = monthStr.split("-");
      const d = new Date(parseInt(year), parseInt(m) - 1, 1);
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } catch {
      return monthStr;
    }
  };

  return (
    <div className="space-y-4 pb-10 w-full">
      {/* Top Header - Clean and short without paragraph descriptions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CalendarX2 className="h-5 w-5 text-brand-primary" />
          Monthly Off-Day Setup
        </h2>

        {currentBranchName && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-none self-start sm:self-auto">
            <Building2 className="h-3.5 w-3.5 text-brand-primary" />
            <span>Branch: {currentBranchName}</span>
          </div>
        )}
      </div>

      {/* Branch Alert if not selected */}
      {(!effectiveBranchId || effectiveBranchId === "all") && (
        <div className="flex items-center gap-2.5 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-none">
          <Building2 className="w-4 h-4 shrink-0 text-amber-500" />
          <span>Please select a specific branch from the header to configure off-days.</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-none">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs font-bold hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-none">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto text-xs font-bold hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Setup Form */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-none space-y-4 shadow-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Set Off-Days
            </h3>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Field 1: Month Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Target Month
              </label>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none max-w-xs">
                <Calendar className="w-4 h-4 text-brand-primary" />
                <input
                  ref={monthInputRef}
                  type="month"
                  required
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  disabled={!effectiveBranchId || effectiveBranchId === "all" || saving}
                  className="text-xs sm:text-sm font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none cursor-pointer w-full disabled:opacity-50"
                />
              </div>
            </div>

            {/* Field 2: Weekly Off-Days */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Weekly Off-Days
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {WEEKDAYS.map((day) => {
                  const isChecked = weeklyOffDays.includes(day.id);
                  return (
                    <button
                      type="button"
                      key={day.id}
                      onClick={() => toggleWeeklyOff(day.id)}
                      disabled={!effectiveBranchId || effectiveBranchId === "all" || saving}
                      className={`p-2.5 border transition cursor-pointer flex items-center justify-between text-left rounded-none disabled:opacity-50 ${
                        isChecked
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:border-slate-400"
                      }`}
                    >
                      <span className="text-xs">{day.label}</span>
                      <div
                        className={`w-4 h-4 border flex items-center justify-center rounded-none ${
                          isChecked ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Field 3: Remarks */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Remarks / Holiday Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Eid vacation / Extra holiday"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!effectiveBranchId || effectiveBranchId === "all" || saving}
                className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs font-medium focus:outline-none focus:border-brand-primary dark:text-white disabled:opacity-50"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={saving || !effectiveBranchId || effectiveBranchId === "all"}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-bold uppercase tracking-wider rounded-none transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Off-Day Setup</span>
              </button>

              <button
                type="button"
                onClick={handleResetToConfigured}
                disabled={saving || !activePreview}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold rounded-none transition cursor-pointer disabled:opacity-50"
                title="Reset form to currently saved settings"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: Configured Off-Days Preview & Edit Option */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-none space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Configured Off-Days Preview
              </h3>
            </div>
            <button
              type="button"
              onClick={handleEdit}
              disabled={!activePreview || loading}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-brand-primary hover:bg-brand-primary/10 border border-brand-primary/30 rounded-none transition cursor-pointer disabled:opacity-40"
              title="Edit this off-day setup in the form"
            >
              <Pencil className="h-3 w-3" />
              <span>Edit</span>
            </button>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
              <span className="text-xs font-semibold">Loading off-day preview...</span>
            </div>
          ) : activePreview ? (
            <div className="space-y-3.5 text-xs">
              {/* Selected Month Header */}
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Target Month:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {formatMonthDisplay(activePreview.month)}
                </span>
              </div>

              {/* Weekly Off Days Pills */}
              <div className="space-y-1.5 py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-500 dark:text-slate-400 block">
                  Configured Weekly Off-Days:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activePreview.weeklyOffDays.length > 0 ? (
                    activePreview.weeklyOffDays.map((dayId) => (
                      <span
                        key={dayId}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-none"
                      >
                        <Check className="w-3 h-3 text-emerald-600" />
                        {dayId.charAt(0) + dayId.slice(1).toLowerCase()}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">No weekly off-days configured</span>
                  )}
                </div>
              </div>

              {/* 3 Metric Summary Boxes */}
              <div className="grid grid-cols-3 gap-2 py-1">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center rounded-none">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase block truncate">
                    Total Days
                  </span>
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                    {activePreview.meta?.totalDays ?? "--"}
                  </span>
                </div>
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center rounded-none">
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold uppercase block truncate">
                    Off-Days
                  </span>
                  <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                    {activePreview.meta?.offDaysCount ?? "--"}
                  </span>
                </div>
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center rounded-none">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold uppercase block truncate">
                    Working Days
                  </span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {activePreview.meta?.workingDaysCount ?? "--"}
                  </span>
                </div>
              </div>

              {/* Remarks */}
              <div className="py-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">
                  Remarks / Notes:
                </span>
                <p className="text-slate-700 dark:text-slate-300 font-medium">
                  {activePreview.notes || <span className="text-slate-400 italic">None</span>}
                </p>
              </div>

              {/* Status Badge */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-medium">Status</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-bold rounded-none">
                  <Check className="w-3 h-3" /> Configured & Active
                </span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              No off-days configured yet for this month.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
