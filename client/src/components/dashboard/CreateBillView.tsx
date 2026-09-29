"use client";

import React, { useState } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import { PlusCircle, List, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface CreateBillViewProps {
  selectedBranchId?: string;
  onNavigate: (module: OwnerModule) => void;
}

export function CreateBillView({ selectedBranchId, onNavigate }: CreateBillViewProps) {
  const [billName, setBillName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = billName.trim();

    if (!selectedBranchId) {
      setError("Please select a branch first");
      return;
    }

    if (!trimmed) {
      setError("Please enter a bill name");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetchApi<any>("/accounting/recurring-expenses", {
        method: "POST",
        body: JSON.stringify({
          branchId: selectedBranchId,
          category: "OTHER",
          title: trimmed,
        }),
      });

      if (res.success) {
        setSuccess(true);
        // Auto redirect to Bill List
        setTimeout(() => {
          onNavigate("exp_list");
        }, 600);
      } else {
        setError(res.message || "Failed to create bill");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create bill");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 w-full mx-auto">
      {/* Top Header - Compact, Balanced Typography */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-brand-primary" />
            Create Bill
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Add a new bill type for your pharmacy expenses.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("exp_list")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none cursor-pointer self-start sm:self-auto"
        >
          <List className="h-3.5 w-3.5 text-brand-primary" />
          Bill List
        </button>
      </div>

      {/* Form Container */}
      <div className="max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-none space-y-5">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-medium flex items-center gap-2 rounded-none">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-medium flex items-center gap-2 rounded-none">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Bill created successfully! Redirecting to Bill List...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Bill Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              required
              value={billName}
              onChange={(e) => setBillName(e.target.value)}
              placeholder="e.g. Current Bill, Gas Bill, Water Bill, Shop Rent, Internet..."
              className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-medium outline-none focus:border-brand-primary dark:text-white placeholder:text-slate-400 transition"
            />
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="submit"
              disabled={submitting || success}
              className="px-4 py-2 bg-brand-primary text-white text-xs sm:text-sm font-bold rounded-none hover:opacity-90 disabled:opacity-50 transition flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  <span>Create Bill</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigate("exp_list")}
              disabled={submitting}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold rounded-none hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
