"use client";

import React, { useEffect, useState, useRef } from "react";
import { fetchApi } from "@/lib/api";
import { useBranchContext } from "@/context/BranchContext";
import { showAlert } from "@/lib/swal";
import {
  Loader2,
  Save,
  Sliders,
  AlertCircle,
  Building2,
  CalendarCheck,
  Receipt,
  RotateCcw,
  CheckCircle2,
  Pencil,
  ShieldCheck,
} from "lucide-react";

interface SalaryDeductionRulesProps {
  selectedBranchId?: string;
}

interface ActivePolicyState {
  annualPaidLeaveDays: number;
  absentRuleRatio: number | null;
  lateRuleRatio: number | null;
  taxExemptionAnnual: number | null;
  taxRatePercent: number | null;
  taxFiscalYear: string | null;
}

export function SalaryDeductionRules({ selectedBranchId: propBranchId }: SalaryDeductionRulesProps) {
  const { branches, selectedBranchId: contextBranchId } = useBranchContext();
  const effectiveBranchId =
    propBranchId && propBranchId !== "all"
      ? propBranchId
      : contextBranchId && contextBranchId !== "all"
      ? contextBranchId
      : branches[0]?.id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form input states
  const [absentRatio, setAbsentRatio] = useState<string>("1");
  const [lateRatio, setLateRatio] = useState<string>("");
  const [annualPaidLeaveDays, setAnnualPaidLeaveDays] = useState<string>("30");
  const [taxExemptionAnnual, setTaxExemptionAnnual] = useState<string>("");
  const [taxRatePercent, setTaxRatePercent] = useState<string>("");
  const [taxFiscalYear, setTaxFiscalYear] = useState<string>("2026-2027");

  // Currently active saved policy in DB
  const [activePolicy, setActivePolicy] = useState<ActivePolicyState>({
    annualPaidLeaveDays: 30,
    absentRuleRatio: 1,
    lateRuleRatio: null,
    taxExemptionAnnual: null,
    taxRatePercent: null,
    taxFiscalYear: "2026-2027",
  });

  const formRef = useRef<HTMLInputElement>(null);

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
        const loadedPolicy: ActivePolicyState = {
          annualPaidLeaveDays: res.data.annualPaidLeaveDays ?? 30,
          absentRuleRatio: res.data.absentRuleRatio ? Number(res.data.absentRuleRatio) : null,
          lateRuleRatio: res.data.lateRuleRatio ? Number(res.data.lateRuleRatio) : null,
          taxExemptionAnnual: res.data.taxExemptionAnnual ? Number(res.data.taxExemptionAnnual) : null,
          taxRatePercent: res.data.taxRatePercent ? Number(res.data.taxRatePercent) : null,
          taxFiscalYear: res.data.taxFiscalYear || "2026-2027",
        };

        setActivePolicy(loadedPolicy);
        setAbsentRatio(formatRatioString(res.data.absentRuleRatio));
        setLateRatio(formatRatioString(res.data.lateRuleRatio));
        setAnnualPaidLeaveDays(String(loadedPolicy.annualPaidLeaveDays));
        setTaxExemptionAnnual(loadedPolicy.taxExemptionAnnual ? String(loadedPolicy.taxExemptionAnnual) : "");
        setTaxRatePercent(loadedPolicy.taxRatePercent ? String(loadedPolicy.taxRatePercent) : "");
        setTaxFiscalYear(loadedPolicy.taxFiscalYear || "2026-2027");
      } else if (res.success && !res.data) {
        setActivePolicy({
          annualPaidLeaveDays: 30,
          absentRuleRatio: 1,
          lateRuleRatio: null,
          taxExemptionAnnual: null,
          taxRatePercent: null,
          taxFiscalYear: "2026-2027",
        });
        setAbsentRatio("1");
        setLateRatio("");
        setAnnualPaidLeaveDays("30");
        setTaxExemptionAnnual("");
        setTaxRatePercent("");
        setTaxFiscalYear("2026-2027");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load rules");
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
      showAlert.warning("Branch Required", "Please select a specific branch to configure policies.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const payload = {
        branchId: effectiveBranchId,
        absentRuleRatio: absentRatio === "" ? null : Number(absentRatio),
        lateRuleRatio: lateRatio === "" ? null : Number(lateRatio),
        annualPaidLeaveDays: annualPaidLeaveDays === "" ? 30 : Number(annualPaidLeaveDays),
        taxExemptionAnnual: taxExemptionAnnual === "" ? null : Number(taxExemptionAnnual),
        taxRatePercent: taxRatePercent === "" ? null : Number(taxRatePercent),
        taxFiscalYear: taxFiscalYear.trim() || null,
      };

      const res = await fetchApi<any>("/attendance/deduction-rules", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        const updatedPolicy: ActivePolicyState = {
          annualPaidLeaveDays: payload.annualPaidLeaveDays,
          absentRuleRatio: payload.absentRuleRatio,
          lateRuleRatio: payload.lateRuleRatio,
          taxExemptionAnnual: payload.taxExemptionAnnual,
          taxRatePercent: payload.taxRatePercent,
          taxFiscalYear: payload.taxFiscalYear,
        };
        setActivePolicy(updatedPolicy);

        await showAlert.success(
          "Policies Saved Successfully!",
          "Annual paid leave, absence deductions, and tax withholding rules have been updated.",
          { timer: 2000 }
        );
      } else {
        const msg = res.message || "Failed to save policies";
        setError(msg);
        showAlert.error("Save Failed", msg);
      }
    } catch (err: any) {
      const msg = err.message || "An unexpected error occurred";
      setError(msg);
      showAlert.error("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToActive = () => {
    setAbsentRatio(formatRatioString(activePolicy.absentRuleRatio));
    setLateRatio(formatRatioString(activePolicy.lateRuleRatio));
    setAnnualPaidLeaveDays(String(activePolicy.annualPaidLeaveDays));
    setTaxExemptionAnnual(activePolicy.taxExemptionAnnual ? String(activePolicy.taxExemptionAnnual) : "");
    setTaxRatePercent(activePolicy.taxRatePercent ? String(activePolicy.taxRatePercent) : "");
    setTaxFiscalYear(activePolicy.taxFiscalYear || "2026-2027");
  };

  const handleEditFocus = () => {
    handleResetToActive();
    formRef.current?.focus();
  };

  const selectedBranchName = branches.find((b) => b.id === effectiveBranchId)?.name || "Selected Branch";

  const getAbsentText = (ratio: number | null) => {
    if (!ratio) return "Disabled (No deduction)";
    if (ratio === 1) return "1 Day per 1 Absent";
    return `1 Day per ${ratio} Absents`;
  };

  const getLateText = (ratio: number | null) => {
    if (!ratio) return "Disabled (No deduction)";
    if (ratio === 1) return "1 Day per 1 Late";
    return `1 Day per ${ratio} Lates`;
  };

  return (
    <div className="space-y-5 pb-12 w-full mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="h-5 w-5 text-brand-primary" />
            Leave & Salary Deduction Policies
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure annual paid leave allowance, attendance deductions, and income tax TDS for {selectedBranchName}.
          </p>
        </div>
      </div>

      {/* Branch Warning */}
      {(!effectiveBranchId || effectiveBranchId === "all") && (
        <div className="flex items-center gap-2.5 p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-none">
          <Building2 className="w-4 h-4 shrink-0 text-amber-500" />
          <span>Please select a specific branch from the header to configure policies.</span>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-2.5 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-none">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs font-bold hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 py-16 justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none">
          <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
          <span className="text-xs font-semibold">Loading policies...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Clean Form with Short Headings & Inputs */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-none space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Update Policy Settings
              </h2>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Field 1: Annual Paid Leave */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Annual Paid Leave (Days / Year)
                </label>
                <div className="relative flex items-center">
                  <input
                    ref={formRef}
                    type="number"
                    min="0"
                    max="365"
                    value={annualPaidLeaveDays}
                    onChange={(e) => setAnnualPaidLeaveDays(e.target.value)}
                    disabled={!effectiveBranchId || effectiveBranchId === "all"}
                    placeholder="e.g. 30"
                    className="w-full h-9 px-3 rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-primary disabled:opacity-50"
                  />
                  <span className="absolute right-3 text-xs font-bold text-slate-400 pointer-events-none">Days</span>
                </div>
              </div>

              {/* Field 2 & 3: Absent and Late Ratios */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Absent Deduction Ratio
                  </label>
                  <select
                    value={absentRatio}
                    onChange={(e) => setAbsentRatio(e.target.value)}
                    disabled={!effectiveBranchId || effectiveBranchId === "all"}
                    className="w-full h-9 px-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-primary disabled:opacity-50 cursor-pointer"
                  >
                    <option value="">Disabled</option>
                    <option value="1">1 Absent = 1 Day Deduction</option>
                    <option value="2">2 Absents = 1 Day Deduction</option>
                    <option value="3">3 Absents = 1 Day Deduction</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Late Deduction Ratio
                  </label>
                  <select
                    value={lateRatio}
                    onChange={(e) => setLateRatio(e.target.value)}
                    disabled={!effectiveBranchId || effectiveBranchId === "all"}
                    className="w-full h-9 px-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-primary disabled:opacity-50 cursor-pointer"
                  >
                    <option value="">Disabled</option>
                    <option value="1">1 Late = 1 Day Deduction</option>
                    <option value="2">2 Lates = 1 Day Deduction</option>
                    <option value="3">3 Lates = 1 Day Deduction</option>
                  </select>
                </div>
              </div>

              {/* Field 4, 5, 6: Income Tax / TDS */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                  Income Tax / TDS Withholding
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Annual Exemption (৳)
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-xs font-mono font-bold text-slate-400 pointer-events-none">৳</span>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={taxExemptionAnnual}
                        onChange={(e) => setTaxExemptionAnnual(e.target.value)}
                        disabled={!effectiveBranchId || effectiveBranchId === "all"}
                        placeholder="e.g. 300000"
                        className="w-full h-9 pl-6 pr-2 rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-primary font-mono disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Tax Rate (%)
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={taxRatePercent}
                        onChange={(e) => setTaxRatePercent(e.target.value)}
                        disabled={!effectiveBranchId || effectiveBranchId === "all"}
                        placeholder="e.g. 5"
                        className="w-full h-9 px-2.5 pr-6 rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-primary font-mono disabled:opacity-50"
                      />
                      <span className="absolute right-2.5 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Fiscal Year
                    </label>
                    <input
                      type="text"
                      value={taxFiscalYear}
                      onChange={(e) => setTaxFiscalYear(e.target.value)}
                      disabled={!effectiveBranchId || effectiveBranchId === "all"}
                      placeholder="e.g. 2026-2027"
                      className="w-full h-9 px-2.5 rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-primary disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2.5 pt-3">
                <button
                  type="submit"
                  disabled={saving || !effectiveBranchId || effectiveBranchId === "all"}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-bold uppercase tracking-wider rounded-none transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Policy</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToActive}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold rounded-none transition cursor-pointer"
                  title="Reset form to currently saved values"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT COLUMN: Currently Active Policy Summary Card with Edit Option */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-none space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Active Branch Policy
                </h3>
              </div>
              <button
                type="button"
                onClick={handleEditFocus}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-primary hover:underline cursor-pointer"
                title="Edit these policy values"
              >
                <Pencil className="h-3 w-3" />
                <span>Edit</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
              {/* Item 1: Annual Paid Leave */}
              <div className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <CalendarCheck className="h-3.5 w-3.5 text-blue-500" />
                  <span>Annual Paid Leave</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-none">
                  {activePolicy.annualPaidLeaveDays} Days / Year
                </span>
              </div>

              {/* Item 2: Absent Deduction */}
              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-400">Absent Deduction</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {getAbsentText(activePolicy.absentRuleRatio)}
                </span>
              </div>

              {/* Item 3: Late Deduction */}
              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-400">Late Deduction</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {getLateText(activePolicy.lateRuleRatio)}
                </span>
              </div>

              {/* Item 4: Tax Exemption Threshold */}
              <div className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Receipt className="h-3.5 w-3.5 text-amber-500" />
                  <span>TDS Tax Exemption</span>
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {activePolicy.taxExemptionAnnual
                    ? `৳${activePolicy.taxExemptionAnnual.toLocaleString()} / Year`
                    : "Not Configured"}
                </span>
              </div>

              {/* Item 5: Tax Rate */}
              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-400">Withholding Tax Rate</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {activePolicy.taxRatePercent ? `${activePolicy.taxRatePercent}%` : "Disabled"}
                </span>
              </div>

              {/* Item 6: Fiscal Year */}
              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-400">Fiscal Assessment Year</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {activePolicy.taxFiscalYear || "2026-2027"}
                </span>
              </div>
            </div>

            {/* Status Footer Badge */}
            <div className="pt-2 flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 border-t border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Active Branch Configuration
              </span>
              <span className="text-slate-400 font-mono text-[10px]">
                {selectedBranchName}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
