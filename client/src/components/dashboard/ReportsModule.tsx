"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import {
  FileText,
  Calendar,
  Store,
  Printer,
  Loader2,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

interface ReportsModuleProps {
  onNavigate?: (module: any) => void;
}

export function ReportsModule({ onNavigate: _onNavigate }: ReportsModuleProps = {}) {
  const { user } = useAuth();

  // Date Range State
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || "");
  const [branches, setBranches] = useState<any[]>([]);

  // Report State: starts with false so ONLY the date picker is shown initially
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Load branches
  useEffect(() => {
    async function initBranches() {
      try {
        const res = await fetchApi<any>("/branches");
        if (res.success && res.data) {
          setBranches(res.data);
        }
      } catch (err) {
        console.error("Failed to load branches", err);
      }
    }
    initBranches();
  }, []);

  const handlePresetSelect = (preset: "today" | "yesterday" | "last7" | "thisMonth" | "lastMonth") => {
    const now = new Date();
    if (preset === "today") {
      const d = now.toISOString().split("T")[0];
      setStartDate(d);
      setEndDate(d);
    } else if (preset === "yesterday") {
      const y = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setStartDate(y);
      setEndDate(y);
    } else if (preset === "last7") {
      const s = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const e = now.toISOString().split("T")[0];
      setStartDate(s);
      setEndDate(e);
    } else if (preset === "thisMonth") {
      const s = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const e = now.toISOString().split("T")[0];
      setStartDate(s);
      setEndDate(e);
    } else if (preset === "lastMonth") {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
      const e = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
      setStartDate(s);
      setEndDate(e);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (selectedBranchId) params.append("branchId", selectedBranchId);

      const res = await fetchApi<any>(`/reports/sales/daily?${params.toString()}`);
      if (res.success && res.data) {
        setReportData(res.data);
        setHasGenerated(true);
      }
    } catch (err) {
      console.error("Failed to generate sales report", err);
    } finally {
      setLoading(false);
    }
  };

  const summary = reportData?.summary || {
    totalSales: 0,
    transactionCount: 0,
    totalUnitsSold: 0,
    averageOrderValue: 0,
    totalDiscount: 0,
  };

  const paymentBreakdown = reportData?.paymentBreakdown || {
    cash: 0,
    bkash: 0,
    nagad: 0,
    card: 0,
    other: 0,
    grandTotal: 0,
  };

  const productSales: any[] = reportData?.productSales || [];
  const transactions: any[] = reportData?.transactions || [];

  const displayPeriodLabel =
    startDate === endDate
      ? new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : `${new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} — ${new Date(
          endDate
        ).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. INITIAL VIEW: ONLY DATE SELECTION OPTIONS */}
      {!hasGenerated && (
        <div className="space-y-6">
          {/* Header */}
          <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span>Accounts Management</span>
              <span>/</span>
              <span className="text-slate-700 dark:text-slate-300 font-bold">Sales Reports</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <FileText className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              Sales Reports
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Select the desired date range to compile and generate the official printable Sales & Shift Audit Statement.
            </p>
          </div>

          {/* Date Picker Form Card */}
          <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 max-w-2xl mx-auto mt-4">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Generate Formal Sales Report
                </h2>
                <p className="text-xs text-slate-400">
                  Choose a date or date range to generate the complete audit statement.
                </p>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Quick Presets
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "today", label: "Today" },
                  { id: "yesterday", label: "Yesterday" },
                  { id: "last7", label: "Last 7 Days" },
                  { id: "thisMonth", label: "This Month" },
                  { id: "lastMonth", label: "Last Month" },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset.id as any)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* From & To Date Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">
                  From Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">
                  To Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Branch Filter if multi-branch */}
            {branches.length > 1 && (
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">
                  Branch
                </label>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-2xl">
                  <Store className="h-4 w-4 text-slate-400" />
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full bg-transparent text-sm font-bold text-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="">All Branches (Consolidated)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-3">
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
                <span>Generate Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. GENERATED FORMAL SALES REPORT (Direct Print Layout - No Dashboard Style) */}
      {hasGenerated && (
        <div className="space-y-6">
          {/* Top Control Bar (Hidden when printing) */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <button
              onClick={() => setHasGenerated(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-2 w-fit active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Change Date Range</span>
            </button>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-mono">
                Period: <strong>{displayPeriodLabel}</strong>
              </span>

              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold shadow-md transition flex items-center gap-2 active:scale-95"
              >
                <Printer className="h-4 w-4" />
                <span>Print / Save as PDF</span>
              </button>
            </div>
          </div>

          {/* Clean Formal Printable Document Container */}
          <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 text-slate-900 dark:text-white print:p-0 print:border-none print:shadow-none print:bg-white print:text-black">
            {/* Document Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 dark:border-slate-100 print:border-black pb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white print:text-black">
                  {reportData?.pharmacy?.name || "PharmaBiz Store"}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 print:text-black mt-0.5">
                  {reportData?.pharmacy?.address || "Main Branch"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 print:text-black">
                  Phone: {reportData?.pharmacy?.phone || "—"} • Email: {reportData?.pharmacy?.email || "—"}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <div className="inline-block px-3 py-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900 print:bg-black print:text-white text-xs font-black uppercase tracking-wider rounded-md">
                  Daily Sales & Shift Audit
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 print:text-black mt-1 font-mono">
                  Date: <strong className="text-slate-900 dark:text-white print:text-black">{displayPeriodLabel}</strong>
                </div>
                <div className="text-[10px] text-slate-400 print:text-black font-mono">
                  Generated: {new Date().toLocaleString()}
                </div>
              </div>
            </div>

            {/* Summary KPIs Row */}
            <div className="grid grid-cols-4 gap-3 text-center border-b border-slate-200 dark:border-slate-800 print:border-slate-300 pb-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 print:bg-slate-100 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Total Sales</div>
                <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 print:text-black">
                  ৳{Number(summary.totalSales || 0).toFixed(2)}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 print:bg-slate-100 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Invoices</div>
                <div className="text-lg font-black font-mono">{summary.transactionCount || 0}</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 print:bg-slate-100 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Units Sold</div>
                <div className="text-lg font-black font-mono">{summary.totalUnitsSold || 0}</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 print:bg-slate-100 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Avg Ticket</div>
                <div className="text-lg font-black font-mono">৳{Number(summary.averageOrderValue || 0).toFixed(2)}</div>
              </div>
            </div>

            {/* Payment Methods Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white print:text-black border-b border-slate-200 pb-1">
                1. Payment Collection Breakdown
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div className="p-2.5 border rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">Cash Payments</span>
                  <strong className="font-mono text-sm">৳{Number(paymentBreakdown.cash || 0).toFixed(2)}</strong>
                </div>
                <div className="p-2.5 border rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">bKash Payments</span>
                  <strong className="font-mono text-sm">৳{Number(paymentBreakdown.bkash || 0).toFixed(2)}</strong>
                </div>
                <div className="p-2.5 border rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">Nagad Payments</span>
                  <strong className="font-mono text-sm">৳{Number(paymentBreakdown.nagad || 0).toFixed(2)}</strong>
                </div>
                <div className="p-2.5 border rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">Card / POS</span>
                  <strong className="font-mono text-sm">৳{Number(paymentBreakdown.card || 0).toFixed(2)}</strong>
                </div>
                <div className="p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 print:bg-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold">Grand Total</span>
                  <strong className="font-mono text-sm text-emerald-600 print:text-black">
                    ৳{Number(paymentBreakdown.grandTotal || 0).toFixed(2)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Product-Wise Sales Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white print:text-black border-b border-slate-200 pb-1">
                2. Product-Wise Sold Units & Selling Amounts
              </h4>
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 uppercase text-[9px] font-bold text-slate-400 print:text-black">
                    <th className="pb-1">#</th>
                    <th className="pb-1">Product Name</th>
                    <th className="pb-1 text-center">Unit Type</th>
                    <th className="pb-1 text-center">Qty Sold</th>
                    <th className="pb-1 text-right">Avg Unit Rate</th>
                    <th className="pb-1 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200">
                  {productSales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-2 text-center text-slate-400">
                        No product sales recorded for this date.
                      </td>
                    </tr>
                  ) : (
                    productSales.slice(0, 50).map((p: any, idx: number) => (
                      <tr key={p.productId} className="py-1">
                        <td className="py-1 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-1 font-bold">
                          {p.productName}
                          {p.genericName && (
                            <span className="text-[10px] font-normal text-slate-400 block">{p.genericName}</span>
                          )}
                        </td>
                        <td className="py-1 text-center text-slate-500">{p.unitType}</td>
                        <td className="py-1 text-center font-bold font-mono">{p.quantitySold}</td>
                        <td className="py-1 text-right font-mono">৳{Number(p.averageUnitPrice || 0).toFixed(2)}</td>
                        <td className="py-1 text-right font-bold font-mono">৳{Number(p.totalAmount || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Transaction Ledger */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white print:text-black border-b border-slate-200 pb-1">
                3. Counter Invoices Issued
              </h4>
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="border-b border-slate-200 uppercase text-[9px] font-bold text-slate-400 print:text-black">
                    <th className="pb-1">Invoice #</th>
                    <th className="pb-1">Time</th>
                    <th className="pb-1">Customer</th>
                    <th className="pb-1">Cashier</th>
                    <th className="pb-1">Payment Mode</th>
                    <th className="pb-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-2 text-center text-slate-400">
                        No invoices issued for this date.
                      </td>
                    </tr>
                  ) : (
                    transactions.slice(0, 30).map((t: any) => (
                      <tr key={t.id} className="py-1">
                        <td className="py-1 font-mono font-bold">{t.receiptNo}</td>
                        <td className="py-1 font-mono text-slate-400">
                          {new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-1">{t.customerName || "Walk-in Customer"}</td>
                        <td className="py-1">{t.cashier?.name || "Staff"}</td>
                        <td className="py-1 font-bold">{t.paymentDetail}</td>
                        <td className="py-1 text-right font-bold font-mono">৳{Number(t.totalAmount || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Signature / Audit Footer */}
            <div className="pt-10 border-t border-slate-200 dark:border-slate-800 print:border-black grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <div className="border-b border-slate-400 w-48 mx-auto mb-1" />
                <span className="font-bold text-slate-700 dark:text-slate-300 print:text-black">
                  Prepared by (Cashier / Shift In-Charge)
                </span>
              </div>
              <div>
                <div className="border-b border-slate-400 w-48 mx-auto mb-1" />
                <span className="font-bold text-slate-700 dark:text-slate-300 print:text-black">
                  Verified by (Accounts Manager / Auditor)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
