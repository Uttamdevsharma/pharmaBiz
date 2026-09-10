"use client";

import React from "react";
import { Calendar } from "lucide-react";

export type DatePreset = "ALL" | "TODAY" | "YESTERDAY" | "THIS_MONTH" | "LAST_MONTH" | "THIS_YEAR" | "CUSTOM";

export function getComputedDateRange(preset: DatePreset, startDate: string, endDate: string) {
  const now = new Date();
  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  if (preset === "TODAY") {
    const todayStr = formatDate(now);
    return { start: todayStr, end: todayStr };
  } else if (preset === "YESTERDAY") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yStr = formatDate(y);
    return { start: yStr, end: yStr };
  } else if (preset === "THIS_MONTH") {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: formatDate(firstDay), end: formatDate(lastDay) };
  } else if (preset === "LAST_MONTH") {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: formatDate(firstDay), end: formatDate(lastDay) };
  } else if (preset === "THIS_YEAR") {
    const firstDay = new Date(now.getFullYear(), 0, 1);
    const lastDay = new Date(now.getFullYear(), 11, 31);
    return { start: formatDate(firstDay), end: formatDate(lastDay) };
  } else if (preset === "CUSTOM") {
    return { start: startDate, end: endDate };
  }
  return { start: "", end: "" };
}

interface DateRangeFilterProps {
  datePreset: DatePreset;
  setDatePreset: (preset: DatePreset) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  label?: string;
}

export function DateRangeFilter({
  datePreset,
  setDatePreset,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  label = "Date Filter",
}: DateRangeFilterProps) {
  const presets: { id: DatePreset; label: string }[] = [
    { id: "ALL", label: "All Time" },
    { id: "TODAY", label: "Today" },
    { id: "YESTERDAY", label: "Yesterday" },
    { id: "THIS_MONTH", label: "This Month" },
    { id: "LAST_MONTH", label: "Last Month" },
    { id: "THIS_YEAR", label: "This Year" },
    { id: "CUSTOM", label: "Custom Date Range" },
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
          <Calendar className="h-3.5 w-3.5 text-brand-primary" />
          {label}:
        </span>
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => setDatePreset(preset.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              datePreset === preset.id
                ? "bg-brand-primary text-white shadow-xs"
                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {datePreset === "CUSTOM" && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-400 font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent outline-none text-slate-900 dark:text-white font-bold cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-400 font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent outline-none text-slate-900 dark:text-white font-bold cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
