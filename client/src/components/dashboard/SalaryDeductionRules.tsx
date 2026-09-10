"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useBranchContext } from "@/context/BranchContext";
import { Loader2, Save, Sliders, AlertCircle, CheckCircle2, Building2 } from "lucide-react";

interface SalaryDeductionRulesProps {
  selectedBranchId?: string;
}

export function SalaryDeductionRules({ selectedBranchId: propBranchId }: SalaryDeductionRulesProps) {
  const { branches, selectedBranchId: contextBranchId, isAllBranches } = useBranchContext();
  const effectiveBranchId =
    propBranchId && propBranchId !== "all"
      ? propBranchId
      : contextBranchId && contextBranchId !== "all"
      ? contextBranchId
      : branches[0]?.id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [absentRatio, setAbsentRatio] = useState<string>("1");
  const [lateRatio, setLateRatio] = useState<string>(""); // empty means disabled

  const formatRatioString = (val: any) => {
    if (val === null || val === undefined || val === "") return "";
    const num = Number(val);
    return isNaN(num) ? "" : String(num);
  };

  const loadRules = async () => {
    if (!effectiveBranchId || effectiveBranchId === "all") return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<any>(`/attendance/deduction-rules?branchId=${effectiveBranchId}`);
      if (res.success && res.data) {
        setAbsentRatio(formatRatioString(res.data.absentRuleRatio));
        setLateRatio(formatRatioString(res.data.lateRuleRatio));
      } else if (res.success && !res.data) {
        // Defaults if no rule exists
        setAbsentRatio("1");
        setLateRatio("");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load deduction rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, [effectiveBranchId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveBranchId || effectiveBranchId === "all") {
      setError("Please select a specific branch to save salary deduction rules.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const res = await fetchApi<any>("/attendance/deduction-rules", {
        method: "PUT",
        body: JSON.stringify({
          branchId: effectiveBranchId,
          absentRuleRatio: absentRatio === "" ? null : Number(absentRatio),
          lateRuleRatio: lateRatio === "" ? null : Number(lateRatio),
        }),
      });

      if (res.success) {
        setSuccessMsg(res.message || "Salary deduction rules saved successfully!");
        if (res.data) {
          setAbsentRatio(formatRatioString(res.data.absentRuleRatio));
          setLateRatio(formatRatioString(res.data.lateRuleRatio));
        }
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        setError(res.message || "Failed to save rules");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save rules");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Salary Deduction Rules
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configure automatic salary deductions for employee absences and late arrivals.
            </p>
          </div>
        </div>
      </div>

      {/* Branch Alert if All Branches selected */}
      {(!effectiveBranchId || effectiveBranchId === "all") && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-700 dark:text-amber-400 text-xs font-semibold">
          <Building2 className="w-5 h-5 shrink-0 text-amber-500" />
          <span>Please select a specific branch from the header to configure salary deduction rules.</span>
        </div>
      )}

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

      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Branch Rules Configuration
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              These rules apply automatically when calculating monthly salary for employees in this branch. 
              Leave an option as "Disabled" if you do not wish to penalize it.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-slate-400 py-10">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-semibold">Loading rules...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Absent Rule */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 block">
                  Absent Days Deduction Rule
                </label>
                <div className="flex gap-4 items-center">
                  <select
                    value={absentRatio}
                    onChange={(e) => setAbsentRatio(e.target.value)}
                    disabled={!effectiveBranchId || effectiveBranchId === "all"}
                    className="flex-1 max-w-md px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                  >
                    <option value="">Disabled (No deduction for absent)</option>
                    <option value="1">1 Absent = 1 Day Salary Deduction</option>
                    <option value="2">2 Absents = 1 Day Salary Deduction</option>
                    <option value="3">3 Absents = 1 Day Salary Deduction</option>
                  </select>
                </div>
                <p className="text-xs text-slate-400">
                  Select how many absent days equal one full day of salary deduction.
                </p>
              </div>

              {/* Late Rule */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 block">
                  Late Days Deduction Rule
                </label>
                <div className="flex gap-4 items-center">
                  <select
                    value={lateRatio}
                    onChange={(e) => setLateRatio(e.target.value)}
                    disabled={!effectiveBranchId || effectiveBranchId === "all"}
                    className="flex-1 max-w-md px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                  >
                    <option value="">Disabled (No deduction for late)</option>
                    <option value="1">1 Late = 1 Day Salary Deduction</option>
                    <option value="2">2 Lates = 1 Day Salary Deduction</option>
                    <option value="3">3 Lates = 1 Day Salary Deduction</option>
                  </select>
                </div>
                <p className="text-xs text-slate-400">
                  Select how many late days equal one full day of salary deduction.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || saving || !effectiveBranchId || effectiveBranchId === "all"}
            className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Rules</span>
          </button>
        </div>
      </form>
    </div>
  );
}
