"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Global dispatcher to allow calling toast.success(...) anywhere, even outside React render cycle
let globalToastDispatcher: ((item: ToastItem) => void) | null = null;

export const toast = {
  success: (message: string, title: string = "Success", duration: number = 4000) => {
    if (globalToastDispatcher) {
      globalToastDispatcher({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "success",
        title,
        message,
        duration,
      });
    }
  },
  error: (message: string, title: string = "Error", duration: number = 5000) => {
    if (globalToastDispatcher) {
      globalToastDispatcher({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "error",
        title,
        message,
        duration,
      });
    }
  },
  info: (message: string, title: string = "Info", duration: number = 4000) => {
    if (globalToastDispatcher) {
      globalToastDispatcher({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "info",
        title,
        message,
        duration,
      });
    }
  },
  warning: (message: string, title: string = "Warning", duration: number = 4500) => {
    if (globalToastDispatcher) {
      globalToastDispatcher({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "warning",
        title,
        message,
        duration,
      });
    }
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((item: ToastItem) => {
    setToasts((prev) => [item, ...prev.slice(0, 4)]); // Keep max 5 visible toasts
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    globalToastDispatcher = addToast;
    return () => {
      globalToastDispatcher = null;
    };
  }, [addToast]);

  const showToast = useCallback(
    (type: ToastType, message: string, title?: string, duration: number = 4000) => {
      const item: ToastItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        title: title || (type === "success" ? "Success" : type === "error" ? "Error" : type === "warning" ? "Warning" : "Notice"),
        message,
        duration,
      };
      addToast(item);
    },
    [addToast]
  );

  const contextValue: ToastContextValue = {
    showToast,
    removeToast,
    success: (msg, title, dur) => showToast("success", msg, title, dur),
    error: (msg, title, dur) => showToast("error", msg, title, dur),
    info: (msg, title, dur) => showToast("info", msg, title, dur),
    warning: (msg, title, dur) => showToast("warning", msg, title, dur),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Floating Toast Container */}
      <div
        aria-live="polite"
        className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-3 sm:px-0"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={() => removeToast(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (item.duration && item.duration > 0) {
      timerRef.current = setTimeout(() => {
        onDismiss();
      }, item.duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [item.duration, onDismiss]);

  const config = {
    success: {
      border: "border-emerald-500/30 dark:border-emerald-500/20",
      bg: "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-[0_10px_35px_-8px_rgba(16,185,129,0.25)]",
      iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
      icon: <CheckCircle2 className="h-5 w-5 shrink-0" />,
      accentBar: "bg-emerald-500",
    },
    error: {
      border: "border-rose-500/30 dark:border-rose-500/20",
      bg: "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-[0_10px_35px_-8px_rgba(244,63,94,0.25)]",
      iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800",
      icon: <AlertCircle className="h-5 w-5 shrink-0" />,
      accentBar: "bg-rose-500",
    },
    warning: {
      border: "border-amber-500/30 dark:border-amber-500/20",
      bg: "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-[0_10px_35px_-8px_rgba(245,158,11,0.25)]",
      iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
      icon: <AlertTriangle className="h-5 w-5 shrink-0" />,
      accentBar: "bg-amber-500",
    },
    info: {
      border: "border-sky-500/30 dark:border-sky-500/20",
      bg: "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-[0_10px_35px_-8px_rgba(14,165,233,0.25)]",
      iconBg: "bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 border border-sky-200 dark:border-sky-800",
      icon: <Info className="h-5 w-5 shrink-0" />,
      accentBar: "bg-sky-500",
    },
  }[item.type];

  return (
    <div
      role="alert"
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border ${config.border} ${config.bg} p-4 transition-all duration-300 animate-in fade-in slide-in-from-top-3`}
    >
      <div className="flex items-start gap-3.5">
        <div className={`p-2 rounded-xl shrink-0 ${config.iconBg}`}>
          {config.icon}
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          {item.title && (
            <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight mb-0.5">
              {item.title}
            </h4>
          )}
          <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed break-words">
            {item.message}
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition shrink-0 cursor-pointer"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Subtle bottom indicator bar */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${config.accentBar} opacity-70`} />
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
