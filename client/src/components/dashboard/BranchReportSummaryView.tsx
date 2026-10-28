"use client";

import React, { useState, useEffect, useRef } from "react";
import { fetchApi } from "@/lib/api";
import { useBranchContext } from "@/context/BranchContext";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { OwnerModule } from "./DashboardSidebar";
import {
  FileSpreadsheet,
  Calendar,
  Printer,
  RefreshCw,
  Share2,
  CheckCircle2,
  Clock,
  Store,
  DollarSign,
  TrendingUp,
  Receipt,
  Users,
  Package,
  Layers,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Building2,
} from "lucide-react";

interface BranchReportSummaryViewProps {
  onNavigate?: (module: OwnerModule) => void;
  selectedBranchId?: string;
}

interface ReportData {
  date: string;
  tenant: {
    name: string;
    logoUrl?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  branch: {
    id: string;
    name: string;
    location?: string | null;
    phone?: string | null;
  };
  metrics: {
    attendance: {
      present: number;
      total: number;
      ratio: string;
      percentage: number;
    };
    totalSales: number;
    totalExpense: number;
    netProfit: number;
    stockUnits: number;
    stockValuation: number;
  };
}

export function BranchReportSummaryView({ onNavigate, selectedBranchId: propBranchId }: BranchReportSummaryViewProps) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const {
    selectedBranchId: contextBranchId,
    currentBranch,
    branches,
  } = useBranchContext();

  const activeBranchId = propBranchId || contextBranchId || currentBranch?.id || (branches.length > 0 ? branches[0].id : "");

  // Default to today in local calendar (YYYY-MM-DD)
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const receiptRef = useRef<HTMLDivElement>(null);

  const loadReport = async (isManual = false) => {
    if (!activeBranchId) return;
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetchApi<ReportData>(
        `/reports/branch-summary?branchId=${activeBranchId}&date=${selectedDate}`,
        { skipCache: true }
      );

      if (res.success && res.data) {
        setData(res.data);
      } else {
        throw new Error(res.message || "Failed to load branch summary report");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load branch summary report");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [activeBranchId, selectedDate]);

  const formatCurrency = (val: number) => {
    return Number(val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // WhatsApp formatted share message
  const handleShareWhatsApp = () => {
    if (!data) return;

    const formattedMessage = `📊 *${data.tenant.name || "Pharmacy Chain"}*
🏥 *Branch:* ${data.branch.name}
📅 *Date:* ${data.date}
⏰ *Time:* ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}

━━━━━━━━━━━━━━━━━━━
👥 *Attendance:* ${data.metrics.attendance.ratio} (${data.metrics.attendance.percentage}%)
💰 *Total Sales:* ৳${formatCurrency(data.metrics.totalSales)}
💸 *Total Expense:* ৳${formatCurrency(data.metrics.totalExpense)}
📈 *Net Profit:* ৳${formatCurrency(data.metrics.netProfit)}
━━━━━━━━━━━━━━━━━━━
📦 *Stock Units:* ${data.metrics.stockUnits.toLocaleString()}
💎 *Stock Valuation:* ৳${formatCurrency(data.metrics.stockValuation)}
━━━━━━━━━━━━━━━━━━━
_Generated from PharmaBiz POS_`;

    const phone = data.branch.phone || data.tenant.phone || "";
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(formattedMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(formattedMessage)}`;

    window.open(waUrl, "_blank");
  };

  // Thermal Print / Download PDF - Uses an isolated hidden iframe for 100% clean output without banner/sidebar bleed
  const handlePrint = () => {
    if (!data) return;

    // Create an isolated invisible iframe to avoid any dashboard/navbar/banner leakage
    const printIframe = document.createElement("iframe");
    printIframe.setAttribute("style", "position:fixed;top:0;left:0;width:0;height:0;border:0;visibility:hidden;");
    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const logoHtml = data.tenant.logoUrl
      ? `<div style="text-align:center;margin-bottom:8px;">
           <img src="${data.tenant.logoUrl}" alt="${data.tenant.name}" style="max-height:48px;max-width:140px;object-fit:contain;" />
         </div>`
      : "";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Branch Report Summary - ${data.branch.name} - ${data.date}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 3mm 4mm;
            }
            @media print {
              html, body {
                width: 72mm;
                margin: 0 auto;
                padding: 0;
                background: #ffffff !important;
                color: #000000 !important;
              }
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #111827;
              background: #ffffff;
              width: 72mm;
              margin: 0 auto;
              padding: 8px 2px;
              font-size: 11px;
              line-height: 1.4;
            }
            .header {
              text-align: center;
              padding-bottom: 8px;
              border-bottom: 1.5px dashed #4b5563;
            }
            .header h1 {
              font-size: 14px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 2px;
              color: #111827;
            }
            .header .meta {
              font-size: 10px;
              color: #374151;
              margin-top: 1.5px;
            }
            .header .timestamp {
              font-size: 9.5px;
              font-family: monospace;
              color: #4b5563;
              margin-top: 3px;
            }
            .banner {
              text-align: center;
              padding: 4px 0;
              margin: 7px 0;
              background: #f3f4f6;
              border-top: 1px solid #d1d5db;
              border-bottom: 1px solid #d1d5db;
              font-size: 10px;
              font-weight: 800;
              font-family: monospace;
              letter-spacing: 0.5px;
              color: #1f2937;
            }
            .metrics-list {
              padding: 2px 0;
            }
            .row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 6px 0;
              border-bottom: 1px dashed #e5e7eb;
              font-size: 11px;
            }
            .row:last-child {
              border-bottom: none;
            }
            .row .label {
              font-weight: 700;
              color: #374151;
            }
            .row .val {
              font-family: monospace;
              font-weight: 800;
              font-size: 11.5px;
              text-align: right;
              color: #111827;
            }
            .profit-box {
              margin: 7px 0;
              padding: 7px 8px;
              background: #ecfdf5 !important;
              border: 1px solid #a7f3d0;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .profit-box .label {
              font-weight: 900;
              font-size: 11px;
              text-transform: uppercase;
              color: #065f46;
            }
            .profit-box .val {
              font-family: monospace;
              font-weight: 900;
              font-size: 13.5px;
              color: #047857;
              text-align: right;
            }
            .sales-val {
              color: #059669;
            }
            .expense-val {
              color: #dc2626;
            }
            .stock-val {
              color: #6d28d9;
            }
            .footer {
              margin-top: 10px;
              padding-top: 6px;
              border-top: 1.5px dashed #4b5563;
              text-align: center;
              font-size: 9px;
              font-family: monospace;
              color: #4b5563;
              line-height: 1.35;
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoHtml}
            <h1>${data.tenant.name || "Pharmacy Chain"}</h1>
            <div class="meta"><strong>Branch:</strong> ${data.branch.name}${data.branch.location ? ` • ${data.branch.location}` : ""}</div>
            ${data.branch.phone ? `<div class="meta">Tel: ${data.branch.phone}</div>` : ""}
            <div class="timestamp">
              Date: <strong>${data.date}</strong> &nbsp;•&nbsp; Time: <strong>${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</strong>
            </div>
          </div>

          <div class="banner">DAILY BRANCH REPORT SUMMARY</div>

          <div class="metrics-list">
            <div class="row">
              <span class="label">Attendance</span>
              <span class="val">${data.metrics.attendance.ratio} (${data.metrics.attendance.percentage}%)</span>
            </div>

            <div class="row">
              <span class="label">Total Sales</span>
              <span class="val sales-val">৳${formatCurrency(data.metrics.totalSales)}</span>
            </div>

            <div class="row">
              <span class="label">Total Expense</span>
              <span class="val expense-val">৳${formatCurrency(data.metrics.totalExpense)}</span>
            </div>

            <div class="profit-box">
              <span class="label">Net Profit</span>
              <span class="val">৳${formatCurrency(data.metrics.netProfit)}</span>
            </div>

            <div class="row">
              <span class="label">Stock Units</span>
              <span class="val">${data.metrics.stockUnits.toLocaleString()}</span>
            </div>

            <div class="row">
              <span class="label">Stock Valuation</span>
              <span class="val stock-val">৳${formatCurrency(data.metrics.stockValuation)}</span>
            </div>
          </div>

          <div class="footer">
            <div>*** END OF BRANCH REPORT ***</div>
            <div style="font-size:8px;margin-top:2px;">PharmaBiz Enterprise SaaS • Multi-Tenant Pharmacy</div>
          </div>
        </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Give images a short moment to load, then trigger print
    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();

      // Clean up iframe after printing
      setTimeout(() => {
        if (document.body.contains(printIframe)) {
          document.body.removeChild(printIframe);
        }
      }, 2000);
    }, 250);
  };

  const branchDisplay = currentBranch?.name || data?.branch?.name || branches.find((b) => b.id === activeBranchId)?.name || "Main Branch";

  return (
    <div className="w-full min-h-full flex flex-col space-y-5 p-3 sm:p-6 select-none bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 print:bg-white print:p-0 print:m-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body > *:not(.dashboard-print-container),
          header, aside, nav, .print\\:hidden, [class*="AnnouncementBanner"], [class*="announcement"] {
            display: none !important;
          }
          body {
            background: #ffffff !important;
          }
        }
      ` }} />
      
      {/* 1. TOP HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 rounded-none border border-pink-200 dark:border-pink-800">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Branch Report Summary
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Consolidated daily financial, inventory, and staff attendance summary for the active branch.
          </p>
        </div>

        {/* Active Branch & Date Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-none shadow-2xs">
            <Store className="h-3.5 w-3.5 text-brand-primary shrink-0" />
            <span>Active Branch: <strong className="text-brand-primary">{branchDisplay}</strong></span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-none shadow-2xs">
            <Calendar className="h-3.5 w-3.5 text-pink-600 shrink-0" />
            <span>Date: <strong className="font-mono">{selectedDate}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. FILTER BAR (Quick buttons: Today, Yesterday & Calendar Datepicker) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 rounded-none shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
            Select Date:
          </span>
          <button
            type="button"
            onClick={() => setSelectedDate(getTodayStr())}
            className={`px-3 py-1.5 text-xs font-bold transition rounded-none border ${
              selectedDate === getTodayStr()
                ? "bg-brand-primary text-white border-brand-primary shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(getYesterdayStr())}
            className={`px-3 py-1.5 text-xs font-bold transition rounded-none border ${
              selectedDate === getYesterdayStr()
                ? "bg-brand-primary text-white border-brand-primary shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700"
            }`}
          >
            Yesterday
          </button>
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-8 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-none outline-none focus:border-brand-primary text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        {/* 3. CENTERED ACTION BUTTONS */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Preview / Refresh Report */}
          <button
            type="button"
            onClick={() => loadReport(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-none transition cursor-pointer border border-slate-300 dark:border-slate-700 disabled:opacity-50"
            title="Preview & Refresh live data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-brand-primary" : ""}`} />
            <span>Preview Report</span>
          </button>

          {/* Download PDF / Print */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-none transition cursor-pointer shadow-xs active:scale-95"
            title="Download or Print Thermal Summary Receipt"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Download PDF / Print</span>
          </button>

          {/* Send via WhatsApp */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-none transition cursor-pointer shadow-xs active:scale-95"
            title="Send Formatted Summary via WhatsApp"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Send via WhatsApp</span>
          </button>
        </div>
      </div>

      {/* 4. RECEIPT CARD SECTION (Centered thermal-receipt style card) */}
      <div className="flex-1 flex justify-center items-start pt-2">
        {loading && !data ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
            <span className="text-xs font-bold">Calculating branch summary report...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-none max-w-md mx-auto">
            <p className="text-sm font-bold text-rose-600">{error}</p>
            <button
              onClick={() => loadReport(true)}
              className="mt-3 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold rounded-none"
            >
              Retry
            </button>
          </div>
        ) : data ? (
          <div
            ref={receiptRef}
            className="w-full max-w-[420px] bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-6 sm:p-7 rounded-none shadow-xl space-y-5 print:border-none print:shadow-none print:m-0 print:p-4 text-slate-900 dark:text-slate-100"
          >
            {/* Header: Pharmacy Name & Logo */}
            <div className="text-center space-y-1 pb-4 border-b-2 border-dashed border-slate-200 dark:border-slate-800">
              {data.tenant.logoUrl ? (
                <div className="flex justify-center mb-2">
                  <img
                    src={data.tenant.logoUrl}
                    alt={data.tenant.name}
                    className="h-12 w-auto object-contain max-w-[140px]"
                  />
                </div>
              ) : (
                <div className="inline-flex p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-full mb-1">
                  <Store className="h-6 w-6" />
                </div>
              )}
              <h2 className="text-xl font-black tracking-tight uppercase">
                {data.tenant.name || "PharmaBiz Pharmacy"}
              </h2>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Branch: <strong>{data.branch.name}</strong></span>
                {data.branch.location && <span> • {data.branch.location}</span>}
              </div>
              {data.branch.phone && (
                <div className="text-xs text-slate-400 font-mono">
                  Tel: {data.branch.phone}
                </div>
              )}
              <div className="pt-1.5 flex items-center justify-center gap-3 text-[11px] font-mono text-slate-400">
                <span>Date: <strong>{data.date}</strong></span>
                <span>•</span>
                <span>Time: <strong>{new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</strong></span>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="text-center py-1 bg-slate-100 dark:bg-slate-800/80 border-y border-slate-200 dark:border-slate-700">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 font-mono">
                DAILY BRANCH REPORT SUMMARY
              </span>
            </div>

            {/* Metrics Key-Value Clean List */}
            <div className="space-y-3.5 divide-y divide-dashed divide-slate-200 dark:divide-slate-800 text-sm">
              
              {/* 1. Attendance */}
              <div className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm">
                  <Users className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>Attendance</span>
                </div>
                <div className="font-mono font-black text-sm text-slate-900 dark:text-white text-right">
                  {data.metrics.attendance.ratio} ({data.metrics.attendance.percentage}%)
                </div>
              </div>

              {/* 2. Total Sales */}
              <div className="pt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm">
                  <Receipt className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Total Sales</span>
                </div>
                <div className="font-mono font-black text-base text-emerald-600 dark:text-emerald-400">
                  ৳{formatCurrency(data.metrics.totalSales)}
                </div>
              </div>

              {/* 3. Total Expense */}
              <div className="pt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm">
                  <DollarSign className="h-4 w-4 text-rose-500 shrink-0" />
                  <span>Total Expense</span>
                </div>
                <div className="font-mono font-black text-base text-rose-600 dark:text-rose-400">
                  ৳{formatCurrency(data.metrics.totalExpense)}
                </div>
              </div>

              {/* 4. Net Profit */}
              <div className="pt-3">
                <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-black text-xs sm:text-sm tracking-wide">
                    <TrendingUp className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Net Profit</span>
                  </div>
                  <div className="font-mono font-black text-lg sm:text-xl text-emerald-700 dark:text-emerald-300">
                    ৳{formatCurrency(data.metrics.netProfit)}
                  </div>
                </div>
              </div>

              {/* 5. Stock Units */}
              <div className="pt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm">
                  <Package className="h-4 w-4 text-blue-500 shrink-0" />
                  <span>Stock Units</span>
                </div>
                <div className="font-mono font-black text-sm text-slate-900 dark:text-white">
                  {data.metrics.stockUnits.toLocaleString()}
                </div>
              </div>

              {/* 6. Stock Valuation */}
              <div className="pt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm">
                  <Layers className="h-4 w-4 text-purple-500 shrink-0" />
                  <span>Stock Valuation</span>
                </div>
                <div className="font-mono font-black text-sm text-purple-700 dark:text-purple-300">
                  ৳{formatCurrency(data.metrics.stockValuation)}
                </div>
              </div>
            </div>

            {/* Footer Bar */}
            <div className="pt-4 border-t-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1 text-slate-400 font-mono text-[11px]">
              <p>*** END OF BRANCH REPORT ***</p>
              <p className="text-[10px]">PharmaBiz Enterprise SaaS • Multi-Tenant Pharmacy</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
