"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface MonthYearPickerProps {
  value: string; // "YYYY-MM", e.g. "2026-10"
  onChange: (value: string) => void;
  className?: string;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const FULL_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function MonthYearPicker({ value, onChange, className = "" }: MonthYearPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const [currentYear, currentMonthIdx] = useMemo(() => {
    const [y, m] = (value || new Date().toISOString().slice(0, 7)).split("-").map(Number);
    return [y, (m || 1) - 1];
  }, [value]);

  const [displayYear, setDisplayYear] = useState<number>(currentYear);

  useEffect(() => {
    setDisplayYear(currentYear);
  }, [currentYear]);

  // Close popover when clicked outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const handleSelectMonth = (idx: number) => {
    const formattedMonth = String(idx + 1).padStart(2, "0");
    onChange(`${displayYear}-${formattedMonth}`);
    setIsOpen(false);
  };

  const handleSetCurrentMonth = () => {
    const d = new Date();
    const formattedMonth = String(d.getMonth() + 1).padStart(2, "0");
    setDisplayYear(d.getFullYear());
    onChange(`${d.getFullYear()}-${formattedMonth}`);
    setIsOpen(false);
  };

  const handleSetLastMonth = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const formattedMonth = String(d.getMonth() + 1).padStart(2, "0");
    setDisplayYear(d.getFullYear());
    onChange(`${d.getFullYear()}-${formattedMonth}`);
    setIsOpen(false);
  };

  const labelText = `${FULL_MONTH_NAMES[currentMonthIdx]} ${currentYear}`;

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button Input */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-8.5 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-none flex items-center justify-between gap-3 text-slate-800 dark:text-slate-100 hover:border-brand-primary transition shadow-2xs min-w-[155px]"
      >
        <span>{labelText}</span>
        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      </button>

      {/* Popover Card (Matching Image 1) */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-3.5 rounded-lg space-y-3 animate-in fade-in zoom-in-95 duration-100">
          {/* Year Navigator */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setDisplayYear((prev) => prev - 1)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-black text-sm text-slate-900 dark:text-white">
              {displayYear}
            </span>
            <button
              type="button"
              onClick={() => setDisplayYear((prev) => prev + 1)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* 12-Month Grid */}
          <div className="grid grid-cols-3 gap-2">
            {MONTH_NAMES.map((name, idx) => {
              const isSelected = displayYear === currentYear && idx === currentMonthIdx;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSelectMonth(idx)}
                  className={`py-2 text-xs font-bold rounded transition ${
                    isSelected
                      ? "bg-emerald-700 text-white shadow-xs font-black"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>

          {/* Bottom Quick Links */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold">
            <button
              type="button"
              onClick={handleSetCurrentMonth}
              className="text-brand-primary hover:underline"
            >
              Current Month
            </button>
            <button
              type="button"
              onClick={handleSetLastMonth}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Last Month
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function useMemo<T>(fn: () => T, deps: any[]): T {
  return React.useMemo(fn, deps);
}
