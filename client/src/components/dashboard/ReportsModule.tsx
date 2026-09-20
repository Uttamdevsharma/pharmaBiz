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
  TrendingUp,
  ShoppingBag,
  Package,
  DollarSign,
  BarChart3,
  Wallet,
  RefreshCw,
} from "lucide-react";

interface ReportsModuleProps {
  onNavigate?: (module: any) => void;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className={`p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm print:shadow-none print:border print:border-slate-300 print:bg-white`}>
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3 ${color}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 print:text-slate-600 tracking-wide mb-0.5">
        {label}
      </div>
      <div className="text-xl font-black font-mono text-slate-900 dark:text-white print:text-black">
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-slate-400 print:text-slate-500 mt-0.5">{sub}</div>
      )}
    </div>
  );
}

export function ReportsModule({ onNavigate: _onNavigate }: ReportsModuleProps = {}) {
  const { user } = useAuth();

  // Date Range State
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || "");
  const [branches, setBranches] = useState<any[]>([]);

  // Report State
  const [reportData, setReportData] = useState<any>(null);
  const [pharmacyProfile, setPharmacyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Load branches
  useEffect(() => {
    async function init() {
      try {
        const [branchRes, profileRes] = await Promise.all([
          fetchApi<any>("/branches"),
          fetchApi<any>("/tenant/profile"),
        ]);
        if (branchRes.success && branchRes.data) setBranches(branchRes.data);
        if (profileRes.success && profileRes.data) setPharmacyProfile(profileRes.data);
      } catch (err) {
        console.error("Failed to load init data", err);
      }
    }
    init();
  }, []);

  const handlePresetSelect = (preset: "today" | "yesterday" | "last7" | "thisMonth" | "lastMonth") => {
    const now = new Date();
    if (preset === "today") {
      const d = now.toISOString().split("T")[0];
      setStartDate(d); setEndDate(d);
    } else if (preset === "yesterday") {
      const y = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setStartDate(y); setEndDate(y);
    } else if (preset === "last7") {
      setStartDate(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "thisMonth") {
      setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "lastMonth") {
      setStartDate(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0]);
      setEndDate(new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0]);
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

  const summary = reportData?.summary || {};
  const paymentBreakdown = reportData?.paymentBreakdown || {};
  const productSales: any[] = reportData?.productSales || [];

  const fmtCurrency = (v: number) => `৳${Number(v || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-BD", { day: "2-digit", month: "short", year: "numeric" });

  const displayPeriodLabel =
    startDate === endDate
      ? fmtDate(startDate)
      : `${fmtDate(startDate)} — ${fmtDate(endDate)}`;

  const totalDiscount = Number(summary.totalDiscounts || 0);
  const totalVat = Number(summary.totalTaxes || 0);
  const hasCostData = productSales.some((p) => (p.totalCost || 0) > 0);

  const pharmacy = reportData?.pharmacy || pharmacyProfile || user?.tenant || {};

  return (
    <div className="space-y-6 w-full">

      {/* ── DATE PICKER VIEW ── */}
      {!hasGenerated && (
        <div className="space-y-6">
          {/* Header */}
          <div className="pb-1 print:hidden">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
                <FileText className="h-6 w-6" />
              </div>
              Sales Report
            </h1>
          </div>

          {/* Date Picker Form */}
          <div className="p-8 sm:p-10 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xs space-y-6 max-w-2xl mx-auto mt-2">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-3 rounded-2xl bg-brand-primary/10 text-brand-primary">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Generate Sales Report</h2>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">Quick Presets</label>
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
                    className="h-10 px-4 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* From & To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-brand-primary cursor-pointer transition"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-brand-primary cursor-pointer transition"
                />
              </div>
            </div>

            {/* Branch Filter */}
            {branches.length > 1 && (
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Branch</label>
                <div className="relative">
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-brand-primary cursor-pointer transition"
                  >
                    <option value="">All Branches (Consolidated)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="pt-2">
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="w-full h-12 px-6 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-black text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                <span>{loading ? "Generating…" : "Generate Report"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GENERATED REPORT ── */}
      {hasGenerated && (
        <div className="space-y-6">

          {/* Control Bar — hidden on print */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <button
              onClick={() => setHasGenerated(false)}
              className="h-11 px-5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold transition flex items-center gap-2 w-fit cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Change Date Range</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="h-11 px-5 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-xs"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-brand-primary" : ""}`} />
                <span>Refresh</span>
              </button>
              <span className="text-sm text-slate-500 font-mono hidden sm:inline">
                Period: <strong className="text-slate-900 dark:text-white">{displayPeriodLabel}</strong>
              </span>
              <button
                onClick={() => window.print()}
                className="h-11 px-6 rounded-xl bg-brand-primary text-white hover:bg-brand-primary/90 text-sm font-black shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>

          {/* ── PRINTABLE REPORT DOCUMENT ── */}
          <div className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 shadow-sm space-y-8 text-slate-900 dark:text-white print:p-6 print:border-none print:shadow-none print:bg-white print:text-black print:rounded-none printable-document">

            {/* ── REPORT HEADER ── */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 dark:border-slate-100 print:border-black pb-5">
              <div className="flex items-start gap-4">
                {(pharmacy.logoUrl || user?.tenant?.logoUrl) && (
                  <img
                    src={pharmacy.logoUrl || user?.tenant?.logoUrl || ""}
                    alt="Pharmacy logo"
                    className="h-14 object-contain print:h-12"
                  />
                )}
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white print:text-black">
                    {pharmacy.name || "Pharmacy Store"}
                  </h1>
                  {(pharmacy.address || reportData?.branch?.location) && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 print:text-black mt-0.5">
                      {reportData?.branch?.location || pharmacy.address}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400 print:text-black">
                    {(pharmacy.phone || reportData?.pharmacy?.phone) && `Tel: ${pharmacy.phone || reportData?.pharmacy?.phone}`}
                    {(pharmacy.phone || reportData?.pharmacy?.phone) && (pharmacy.email || reportData?.pharmacy?.email) && " | "}
                    {(pharmacy.email || reportData?.pharmacy?.email) && `Email: ${pharmacy.email || reportData?.pharmacy?.email}`}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <div className="inline-block px-3 py-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900 print:bg-black print:text-white text-xs font-black uppercase tracking-wider rounded-md mb-2">
                  Sales Report
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 print:text-black font-mono">
                  Period: <strong className="text-slate-900 dark:text-white print:text-black">{displayPeriodLabel}</strong>
                </div>
                {reportData?.branch && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 print:text-black font-mono">
                    Branch: <strong className="text-slate-900 dark:text-white print:text-black">{reportData.branch.name}</strong>
                  </div>
                )}
                <div className="text-[10px] text-slate-400 print:text-black font-mono mt-1">
                  Generated: {new Date().toLocaleString("en-BD")}
                </div>
              </div>
            </div>

            {/* ── KPI SUMMARY ── */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white print:text-black mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                Summary Overview
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <KpiCard
                  label="Total Sales"
                  value={fmtCurrency(summary.totalSales)}
                  icon={DollarSign}
                  color="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600"
                />
                <KpiCard
                  label="Total Invoices"
                  value={String(summary.transactionCount || 0)}
                  sub={summary.transactionCount > 0 ? `Avg ${fmtCurrency(summary.averageOrderValue)} / invoice` : undefined}
                  icon={FileText}
                  color="bg-blue-50 dark:bg-blue-950/50 text-blue-600"
                />
                <KpiCard
                  label="Units Sold"
                  value={String(summary.totalUnitsSold || 0)}
                  icon={Package}
                  color="bg-purple-50 dark:bg-purple-950/50 text-purple-600"
                />
                <KpiCard
                  label="Cost of Goods"
                  value={hasCostData ? fmtCurrency(summary.totalCostOfGoods) : "N/A"}
                  sub={hasCostData ? undefined : "Purchase price not recorded"}
                  icon={ShoppingBag}
                  color="bg-orange-50 dark:bg-orange-950/50 text-orange-600"
                />
                <KpiCard
                  label="Gross Profit"
                  value={hasCostData ? fmtCurrency(summary.grossProfit) : "N/A"}
                  sub={hasCostData && summary.totalSales > 0
                    ? `${Math.round((summary.grossProfit / summary.totalSales) * 100)}% margin`
                    : undefined}
                  icon={TrendingUp}
                  color="bg-teal-50 dark:bg-teal-950/50 text-teal-600"
                />
              </div>
            </div>

            {/* ── PAYMENT BREAKDOWN ── */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white print:text-black border-b border-slate-200 dark:border-slate-800 print:border-slate-300 pb-1.5 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-600" />
                Payment Collection Breakdown
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/80">
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700 print:border-slate-300 text-xs uppercase font-black tracking-wider text-slate-600 dark:text-slate-300">
                      <th className="py-3 px-4 text-left">Payment Method</th>
                      <th className="py-3 px-4 text-right">Amount Collected</th>
                      <th className="py-3 px-4 text-right">% of Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200">
                    {[
                      { label: "Cash", key: "cash" },
                      { label: "bKash (Mobile Banking)", key: "bkash" },
                      { label: "Nagad (Mobile Banking)", key: "nagad" },
                      { label: "Card / Bank POS", key: "card" },
                      { label: "Other", key: "other" },
                    ].map(({ label, key }) => {
                      const amt = Number(paymentBreakdown[key] || 0);
                      const total = Number(paymentBreakdown.grandTotal || 1);
                      if (amt === 0) return null;
                      return (
                        <tr key={key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3 px-4 text-slate-800 dark:text-slate-200 print:text-black font-bold">{label}</td>
                          <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white print:text-black">{fmtCurrency(amt)}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-600 dark:text-slate-400 print:text-slate-700">{((amt / total) * 100).toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-slate-900 dark:border-slate-200 print:border-black font-black text-sm bg-slate-50/80 dark:bg-slate-800/50">
                      <td className="py-3 px-4 text-slate-900 dark:text-white print:text-black">Grand Total</td>
                      <td className="py-3 px-4 text-right font-mono text-brand-primary print:text-black">{fmtCurrency(paymentBreakdown.grandTotal)}</td>
                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 print:text-black">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── PRODUCT-WISE SALES ── */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white print:text-black border-b border-slate-200 dark:border-slate-800 print:border-slate-300 pb-1.5 flex items-center gap-2">
                <Package className="h-4 w-4 text-brand-primary" />
                Product-wise Sales Summary
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/80">
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700 print:border-slate-300 text-xs uppercase font-black tracking-wider text-slate-600 dark:text-slate-300">
                      <th className="py-3 px-3 text-left">#</th>
                      <th className="py-3 px-4 text-left">Product Name</th>
                      <th className="py-3 px-3 text-center">Unit</th>
                      <th className="py-3 px-3 text-center">Qty Sold</th>
                      <th className="py-3 px-4 text-right">Avg Unit Price</th>
                      <th className="py-3 px-4 text-right">Sales Amount</th>
                      {hasCostData && <th className="py-3 px-4 text-right">Gross Profit</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200">
                    {productSales.length === 0 ? (
                      <tr>
                        <td colSpan={hasCostData ? 7 : 6} className="py-6 text-center text-slate-400 font-bold">
                          No product sales for this period.
                        </td>
                      </tr>
                    ) : (
                      productSales.map((p: any, idx: number) => (
                        <tr key={p.productId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 print:hover:bg-transparent">
                          <td className="py-3 px-3 text-slate-400 font-mono font-bold">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white print:text-black">
                            {p.productName}
                            {p.genericName && (
                              <span className="text-xs font-medium text-slate-400 block print:text-slate-600 mt-0.5">{p.genericName}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-slate-600 dark:text-slate-300 print:text-slate-700">{p.unitType}</td>
                          <td className="py-3 px-3 text-center font-black font-mono text-slate-900 dark:text-white print:text-black">{p.quantitySold}</td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-slate-600 dark:text-slate-300 print:text-black">{fmtCurrency(p.averageUnitPrice)}</td>
                          <td className="py-3 px-4 text-right font-black font-mono text-slate-900 dark:text-white print:text-black">{fmtCurrency(p.totalAmount)}</td>
                          {hasCostData && (
                            <td className="py-3 px-4 text-right font-black font-mono text-brand-primary print:text-black">
                              {(p.totalCost || 0) > 0 ? fmtCurrency(p.grossProfit || 0) : "—"}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                  {productSales.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-900 dark:border-slate-200 print:border-black font-black text-sm bg-slate-50/80 dark:bg-slate-800/50">
                        <td colSpan={3} className="py-3 px-4 text-slate-900 dark:text-white print:text-black">
                          Total ({productSales.length} products)
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-900 dark:text-white print:text-black">
                          {productSales.reduce((s: number, p: any) => s + p.quantitySold, 0)}
                        </td>
                        <td />
                        <td className="py-3 px-4 text-right font-mono text-brand-primary print:text-black">
                          {fmtCurrency(productSales.reduce((s: number, p: any) => s + p.totalAmount, 0))}
                        </td>
                        {hasCostData && (
                          <td className="py-3 px-4 text-right font-mono text-brand-primary print:text-black">
                            {fmtCurrency(productSales.reduce((s: number, p: any) => s + (p.grossProfit || 0), 0))}
                          </td>
                        )}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* ── DISCOUNT / VAT SUMMARY (shown only if non-zero) ── */}
            {(totalDiscount > 0 || totalVat > 0) && (
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white print:text-black border-b border-slate-200 dark:border-slate-800 print:border-slate-300 pb-1.5">
                  Discount / VAT Summary
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 print:border-slate-300">
                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Total Subtotal</div>
                    <div className="font-mono font-black text-slate-900 dark:text-white print:text-black">{fmtCurrency(summary.totalSubTotal)}</div>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 print:border-slate-300">
                      <div className="text-[10px] text-emerald-600 font-bold uppercase mb-0.5">Total Discounts</div>
                      <div className="font-mono font-black text-emerald-700 dark:text-emerald-400 print:text-black">-{fmtCurrency(totalDiscount)}</div>
                    </div>
                  )}
                  {totalVat > 0 && (
                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 print:border-slate-300">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Total VAT</div>
                      <div className="font-mono font-black text-slate-900 dark:text-white print:text-black">{fmtCurrency(totalVat)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SIGNATURE FOOTER ── */}
            <div className="pt-10 border-t border-slate-200 dark:border-slate-800 print:border-black grid grid-cols-2 gap-12 text-center text-xs">
              <div>
                <div className="border-b border-slate-400 w-44 mx-auto mb-2" />
                <span className="font-bold text-slate-700 dark:text-slate-300 print:text-black">
                  Prepared by (Cashier / Shift In-Charge)
                </span>
              </div>
              <div>
                <div className="border-b border-slate-400 w-44 mx-auto mb-2" />
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
