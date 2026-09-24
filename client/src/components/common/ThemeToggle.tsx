"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon, Laptop } from "lucide-react";

interface ThemeToggleProps {
  variant?: "icon" | "dropdown-item" | "pill" | "sidebar";
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({
  variant = "icon",
  className = "",
  showLabel = false,
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme, theme, setTheme, isDark } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR or before hydration, render a stable placeholder to avoid layout shifts
  if (!mounted) {
    if (variant === "dropdown-item") {
      return (
        <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200">
          <div className="flex items-center gap-2.5">
            <Moon className="h-4 w-4 text-slate-400" />
            <span>Theme Mode</span>
          </div>
          <span className="text-[10px] text-slate-400">...</span>
        </div>
      );
    }
    if (variant === "pill" || variant === "sidebar") {
      return (
        <div className="h-9 w-full rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      );
    }
    return (
      <div
        className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center text-slate-400 ${className}`}
      >
        <Moon className="h-4 w-4" />
      </div>
    );
  }

  // 1. Dropdown Item variant (used inside profile menus)
  if (variant === "dropdown-item") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left text-xs font-semibold text-slate-700 dark:text-slate-200 group cursor-pointer ${className}`}
        title={`Current: ${isDark ? "Dark" : "Light"} mode (Alt+T to toggle)`}
      >
        <div className="flex items-center gap-2.5">
          {isDark ? (
            <Moon className="h-4 w-4 text-indigo-400 group-hover:rotate-12 transition-transform" />
          ) : (
            <Sun className="h-4 w-4 text-amber-500 group-hover:rotate-45 transition-transform" />
          )}
          <span>{isDark ? "Dark Mode" : "Light Mode"}</span>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            isDark
              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
          }`}
        >
          {isDark ? "ON" : "OFF"}
        </span>
      </button>
    );
  }

  // 2. Sidebar bottom toggle variant
  if (variant === "sidebar") {
    return (
      <div
        className={`w-full p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs font-semibold ${className}`}
      >
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            !isDark
              ? "bg-white text-amber-600 shadow-xs font-bold"
              : "text-slate-500 hover:text-slate-200"
          }`}
          title="Light Theme"
        >
          <Sun className="h-3.5 w-3.5" />
          <span className="text-[11px]">Light</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
            isDark
              ? "bg-slate-900 text-indigo-300 shadow-xs font-bold"
              : "text-slate-500 hover:text-slate-900"
          }`}
          title="Dark Theme"
        >
          <Moon className="h-3.5 w-3.5" />
          <span className="text-[11px]">Dark</span>
        </button>
      </div>
    );
  }

  // 3. Pill variant with label
  if (variant === "pill" || showLabel) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all shadow-xs cursor-pointer ${className}`}
        title={`Toggle Theme (Alt+T). Currently: ${isDark ? "Dark" : "Light"}`}
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-indigo-400" />
        ) : (
          <Sun className="h-4 w-4 text-amber-500" />
        )}
        <span>{isDark ? "Dark" : "Light"}</span>
      </button>
    );
  }

  // 4. Default "icon" variant: High-contrast, micro-animated button
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative h-9 w-9 sm:h-10 sm:w-10 rounded-xl border flex items-center justify-center transition-all duration-200 shadow-xs cursor-pointer group ${
        isDark
          ? "bg-slate-800/90 hover:bg-slate-700 border-slate-700 hover:border-slate-600 text-amber-300 hover:text-amber-200 shadow-indigo-500/5"
          : "bg-slate-100 hover:bg-slate-200/80 border-slate-200/90 hover:border-slate-300 text-slate-700 hover:text-slate-900"
      } ${className}`}
      aria-label={isDark ? "Switch to light mode (Alt+T)" : "Switch to dark mode (Alt+T)"}
      title={isDark ? "Switch to light mode (Alt+T)" : "Switch to dark mode (Alt+T)"}
    >
      <div className="relative h-5 w-5 flex items-center justify-center">
        {/* Sun Icon */}
        <Sun
          className={`h-4 w-4 sm:h-4.5 sm:w-4.5 absolute transition-all duration-300 transform text-amber-500 ${
            isDark
              ? "scale-0 rotate-90 opacity-0"
              : "scale-100 rotate-0 opacity-100"
          }`}
        />
        {/* Moon Icon */}
        <Moon
          className={`h-4 w-4 sm:h-4.5 sm:w-4.5 absolute transition-all duration-300 transform text-amber-300 ${
            isDark
              ? "scale-100 rotate-0 opacity-100"
              : "scale-0 -rotate-90 opacity-0"
          }`}
        />
      </div>
    </button>
  );
}
