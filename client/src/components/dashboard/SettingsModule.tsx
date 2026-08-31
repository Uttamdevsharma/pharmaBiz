"use client";

import React, { useState } from "react";
import { Settings, Save, CheckCircle2, Receipt } from "lucide-react";

export function SettingsModule() {
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    receiptHeaderNote: "Thank you for choosing our pharmacy! Get well soon.",
    receiptFooterNote: "Items sold can be returned within 48h with valid prescription and invoice.",
    defaultTaxPercent: 0,
    enableLowStockSoundAlerts: true,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Store & POS Preferences</h2>
        <p className="text-xs text-slate-500">Configure receipt notes, alert sounds, and dispensing options</p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>Preferences saved successfully!</span>
        </div>
      )}

      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Receipt className="h-4 w-4 text-brand-primary" />
          Thermal Invoice / Receipt Printing Notes
        </h3>

        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Receipt Header Greeting
            </label>
            <input
              type="text"
              value={formData.receiptHeaderNote}
              onChange={(e) => setFormData({ ...formData, receiptHeaderNote: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Receipt Return Policy / Footer
            </label>
            <textarea
              rows={2}
              value={formData.receiptFooterNote}
              onChange={(e) => setFormData({ ...formData, receiptFooterNote: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold shadow hover:opacity-90 transition active:scale-95"
      >
        <Save className="h-4 w-4" />
        Save Store Preferences
      </button>
    </form>
  );
}
