"use client";

import React, { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import {
  Percent,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Tag,
} from "lucide-react";

interface VatSettingsViewProps {
  onNavigate?: (module: OwnerModule) => void;
}

export function VatSettingsView({ onNavigate }: VatSettingsViewProps = {}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active saved VAT rate from the database
  const [activeVat, setActiveVat] = useState<number>(0);

  // New input value to update VAT (starts empty, cleared after saving)
  const [vatInput, setVatInput] = useState<string>("");

  const loadVatSettings = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetchApi<any>("/settings/vat");
      if (res.success && res.data) {
        const rate = typeof res.data.vatPercent === "number" ? res.data.vatPercent : 0;
        setActiveVat(rate);
      }
    } catch (err: any) {
      console.error("Failed to load VAT settings", err);
      setErrorMsg("Failed to load current VAT settings. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVatSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (vatInput.trim() === "") {
      setErrorMsg("Please enter a valid VAT percentage.");
      return;
    }

    const parsedRate = parseFloat(vatInput);
    if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      setErrorMsg("Please enter a percentage between 0 and 100.");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetchApi<any>("/settings/vat", {
        method: "PUT",
        body: JSON.stringify({
          vatPercent: parsedRate,
          isVatEnabled: true,
        }),
      });

      if (res.success) {
        setActiveVat(parsedRate);
        setVatInput(""); // Clear the input field after saving
        setSuccessMsg(`VAT rate successfully updated to ${parsedRate}%. This rate is now active on all POS sales.`);
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        setErrorMsg(res.message || "Failed to update VAT settings");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-slate-500 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <span className="text-xs xl:text-sm font-bold">Loading VAT configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
            <Percent className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            VAT Settings
          </h1>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate("pos")}
            className="h-11 px-5 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-sm font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <span>Go to POS &rarr;</span>
          </button>
        )}
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-sm font-bold">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-3 text-rose-800 dark:text-rose-300 text-sm font-bold">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active VAT Rate Status Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-6 lg:p-8 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Tag className="h-5 w-5 text-brand-primary" />
              Active VAT Status
            </h2>
          </div>

          <div className="p-6 rounded-2xl bg-brand-primary/5 dark:bg-brand-primary/10 border-2 border-brand-primary/20 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Active VAT Rate</div>
              <div className="text-4xl lg:text-5xl font-black font-mono text-brand-primary mt-1">
                {activeVat}%
              </div>
            </div>
            <div className="px-4 py-2 rounded-xl bg-brand-primary text-white font-black text-xs">
              Live on POS
            </div>
          </div>

          <div className="text-xs font-bold text-slate-400">
            VAT is automatically calculated on all counter sales and printed in invoices.
          </div>
        </div>

        {/* Change VAT Rate Form Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-6 lg:p-8 shadow-xs space-y-6">
          <div className="space-y-1 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Percent className="h-5 w-5 text-brand-primary" />
              Update VAT Percentage
            </h2>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                New VAT Percentage (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={vatInput}
                  onChange={(e) => setVatInput(e.target.value)}
                  placeholder="Enter percentage (e.g. 5)"
                  className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 font-mono font-bold text-base text-slate-900 dark:text-white outline-none focus:border-brand-primary transition"
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400 font-mono text-base">
                  %
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || !vatInput.trim()}
              className="w-full h-12 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-black shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save VAT Rate</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
