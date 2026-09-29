"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import {
  FileText,
  Calendar,
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
  PieChart as PieIcon,
  Zap,
  Flame,
  Clock,
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
    <div className="p-5 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm print:shadow-none print:border print:border-slate-300 print:bg-white">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 print:text-slate-600 tracking-wide mb-1">
        {label}
      </div>
      <div className="text-2xl font-black font-mono text-slate-900 dark:text-white print:text-black">
        {value}
      </div>
      {sub && (
        <div className="text-xs text-slate-400 print:text-slate-500 mt-1">{sub}</div>
      )}
    </div>
  );
}

// ─── SVG DONUT CHART COMPONENT ───────────────────────────────────────────────
function DonutChart({
  data,
  total,
}: {
  data: { name: string; revenue: number; color: string; pct: number }[];
  total: number;
}) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPct = 0;

  return (
    <div className="relative w-44 h-44 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        <circle
          cx="80"
          cy="80"
          r={radius}
          className="stroke-slate-100 dark:stroke-slate-800 print:stroke-slate-200"
          strokeWidth="20"
          fill="transparent"
        />
        {total > 0 &&
          data.map((item, idx) => {
            if (item.revenue <= 0) return null;
            const strokeDasharray = `${(item.pct / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((accumulatedPct / 100) * circumference);
            accumulatedPct += item.pct;

            return (
              <circle
                key={idx}
                cx="80"
                cy="80"
                r={radius}
                stroke={item.color}
                strokeWidth="20"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="butt"
                fill="transparent"
                className="transition-all duration-700 hover:opacity-90"
              />
            );
          })}
      </svg>
      {/* Center Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">Total Sales</span>
        <span className="text-sm font-black font-mono text-slate-900 dark:text-white print:text-black">
          ৳{Math.round(total).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// ─── SVG SMOOTH AREA & LINE CHART COMPONENT ─────────────────────────────────
function HourlyAreaChart({
  hourlyStats,
  maxHourRevenue,
  peakHour,
}: {
  hourlyStats: { hour: number; formattedTime: string; revenue: number; count: number }[];
  maxHourRevenue: number;
  peakHour: any;
}) {
  const svgWidth = 800;
  const svgHeight = 170;
  const padLeft = 35;
  const padRight = 35;
  const padTop = 30;
  const padBottom = 30;
  const graphW = svgWidth - padLeft - padRight;
  const graphH = svgHeight - padTop - padBottom;

  const points = hourlyStats.map((h, i) => {
    const x = padLeft + (i / 23) * graphW;
    const normY = maxHourRevenue > 0 ? h.revenue / maxHourRevenue : 0;
    const y = padTop + graphH - normY * graphH;
    return { x, y, ...h };
  });

  // Construct smooth Bezier path
  let pathD = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX = (p0.x + p1.x) / 2;
    pathD += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
  }

  const areaD = `${pathD} L ${points[points.length - 1].x},${padTop + graphH} L ${points[0].x},${padTop + graphH} Z`;

  return (
    <div className="w-full space-y-2">
      <div className="w-full overflow-x-auto">
        <div className="min-w-[650px] w-full">
          <svg className="w-full h-auto" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
            <defs>
              <linearGradient id="hourlyAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="hourlyLineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[0, 0.33, 0.66, 1].map((ratio, idx) => {
              const y = padTop + graphH * (1 - ratio);
              return (
                <line
                  key={idx}
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  className="stroke-slate-200/70 dark:stroke-slate-800 print:stroke-slate-300"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              );
            })}

            {/* Area Fill */}
            <path d={areaD} fill="url(#hourlyAreaGradient)" />

            {/* Smooth Curve Line */}
            <path d={pathD} fill="none" stroke="url(#hourlyLineGradient)" strokeWidth="3.5" strokeLinecap="round" />

            {/* Dots for revenue hours */}
            {points.map((pt) => {
              const isPeak = peakHour && peakHour.hour === pt.hour && pt.revenue > 0;
              if (pt.revenue <= 0 && !isPeak) return null;

              return (
                <g key={pt.hour} className="group cursor-pointer">
                  {isPeak && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="10"
                      className="fill-emerald-400/30 animate-ping print:hidden"
                    />
                  )}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isPeak ? "6" : "4"}
                    className={isPeak ? "fill-emerald-500 stroke-white dark:stroke-slate-900 print:fill-black" : "fill-purple-600 stroke-white dark:stroke-slate-900 print:fill-slate-700"}
                    strokeWidth="2"
                  />
                  {pt.revenue > 0 && (
                    <text
                      x={pt.x}
                      y={pt.y - 10}
                      textAnchor="middle"
                      className="fill-slate-800 dark:fill-slate-200 print:fill-black font-mono font-bold text-[10px]"
                    >
                      ৳{Math.round(pt.revenue).toLocaleString()}
                    </text>
                  )}
                </g>
              );
            })}

            {/* X-Axis Time Labels */}
            {[0, 3, 6, 9, 12, 15, 18, 21, 23].map((hr) => {
              const pt = points[hr];
              if (!pt) return null;
              return (
                <text
                  key={hr}
                  x={pt.x}
                  y={svgHeight - 6}
                  textAnchor="middle"
                  className="fill-slate-500 dark:fill-slate-400 print:fill-slate-700 font-mono text-[10px] font-bold"
                >
                  {pt.formattedTime}
                </text>
              );
            })}
          </svg>
        </div>
      </div>
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

  const handlePresetSelect = (preset: "today" | "yesterday" | "thisMonth" | "lastMonth") => {
    const now = new Date();
    if (preset === "today") {
      const d = now.toISOString().split("T")[0];
      setStartDate(d);
      setEndDate(d);
    } else if (preset === "yesterday") {
      const y = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setStartDate(y);
      setEndDate(y);
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

  const fmtCurrency = (v: number) =>
    `৳${Number(v || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-BD", { day: "2-digit", month: "short", year: "numeric" });

  const displayPeriodLabel =
    startDate === endDate
      ? fmtDate(startDate)
      : `${fmtDate(startDate)} — ${fmtDate(endDate)}`;

  const hasCostData = productSales.some((p) => (p.totalCost || 0) > 0);
  const pharmacy = reportData?.pharmacy || pharmacyProfile || user?.tenant || {};

  // ── Day of Week Analytics ──
  const daysOfWeekConfig = [
    { key: 6, name: "Saturday", short: "Sat", color: "#3b82f6", bg: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
    { key: 0, name: "Sunday", short: "Sun", color: "#8b5cf6", bg: "bg-purple-500", text: "text-purple-600 dark:text-purple-400" },
    { key: 1, name: "Monday", short: "Mon", color: "#ec4899", bg: "bg-pink-500", text: "text-pink-600 dark:text-pink-400" },
    { key: 2, name: "Tuesday", short: "Tue", color: "#f59e0b", bg: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
    { key: 3, name: "Wednesday", short: "Wed", color: "#10b981", bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
    { key: 4, name: "Thursday", short: "Thu", color: "#06b6d4", bg: "bg-cyan-500", text: "text-cyan-600 dark:text-cyan-400" },
    { key: 5, name: "Friday", short: "Fri", color: "#6366f1", bg: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-400" },
  ];

  const rawDayOfWeekData = reportData?.dayOfWeekBreakdown || {};
  const dayOfWeekStats = daysOfWeekConfig.map((d) => {
    const fromBackend = rawDayOfWeekData[d.key];
    if (fromBackend) {
      return {
        ...d,
        revenue: Number(fromBackend.revenue || 0),
        count: Number(fromBackend.count || 0),
      };
    }
    let revenue = 0;
    let count = 0;
    (reportData?.transactions || []).forEach((t: any) => {
      const dt = new Date(t.createdAt);
      if (dt.getDay() === d.key) {
        revenue += Number(t.totalAmount || 0);
        count += 1;
      }
    });
    return { ...d, revenue, count };
  });

  const maxDayRevenue = Math.max(...dayOfWeekStats.map((d) => d.revenue), 1);
  const totalWeeklySales = dayOfWeekStats.reduce((sum, d) => sum + d.revenue, 0);

  const dayDonutData = dayOfWeekStats.map((d) => ({
    name: d.name,
    revenue: d.revenue,
    color: d.color,
    pct: totalWeeklySales > 0 ? (d.revenue / totalWeeklySales) * 100 : 0,
  }));

  const peakDay = dayOfWeekStats.reduce(
    (max, d) => (d.revenue > max.revenue ? d : max),
    dayOfWeekStats[0]
  );

  // ── Hourly / 24-Hour Analytics ──
  const rawHourlyData = reportData?.hourlyBreakdown || {};
  const hourlyStats = Array.from({ length: 24 }, (_, hour) => {
    const data = rawHourlyData[hour] || { count: 0, revenue: 0 };
    return {
      hour,
      label: `${hour.toString().padStart(2, "0")}:00`,
      formattedTime: `${hour % 12 === 0 ? 12 : hour % 12} ${hour >= 12 ? "PM" : "AM"}`,
      revenue: Number(data.revenue || 0),
      count: Number(data.count || 0),
    };
  });

  const maxHourRevenue = Math.max(...hourlyStats.map((h) => h.revenue), 1);
  const peakHour = hourlyStats.reduce(
    (max, h) => (h.revenue > max.revenue ? h : max),
    hourlyStats[0]
  );

  // Shift Calculations
  const morningSales = hourlyStats.filter((h) => h.hour >= 6 && h.hour < 12).reduce((s, h) => s + h.revenue, 0);
  const afternoonSales = hourlyStats.filter((h) => h.hour >= 12 && h.hour < 17).reduce((s, h) => s + h.revenue, 0);
  const eveningSales = hourlyStats.filter((h) => h.hour >= 17 && h.hour < 21).reduce((s, h) => s + h.revenue, 0);
  const nightSales = hourlyStats.filter((h) => h.hour >= 21 || h.hour < 6).reduce((s, h) => s + h.revenue, 0);
  const totalDayRevenue = morningSales + afternoonSales + eveningSales + nightSales;

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

            {/* ── KPI SUMMARY (3 Cards) ── */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white print:text-black mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                Summary Overview
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard
                  label="Total Sales"
                  value={fmtCurrency(summary.totalSales)}
                  icon={DollarSign}
                  color="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600"
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

            {/* ── VISUAL ANALYTICS SECTION ── */}
            <div className="space-y-6 pt-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white print:text-black border-b border-slate-200 dark:border-slate-800 print:border-slate-300 pb-1.5 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Sales Graphical View
              </h3>

              {/* 1. Day of Week Donut & Progress Bar Chart */}
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 print:bg-white print:border-slate-300 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <PieIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white print:text-black">
                        Sales by Day of Week
                      </h4>
                    </div>
                  </div>

                  {peakDay && peakDay.revenue > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs font-bold w-fit">
                      <Flame className="h-4 w-4 text-amber-500" />
                      <span>Highest Sales: <strong>{peakDay.name}</strong> ({fmtCurrency(peakDay.revenue)})</span>
                    </div>
                  )}
                </div>

                {/* Donut Chart + Horizontal Bar Breakdown Grid */}
                <div className="flex flex-col md:flex-row items-center gap-6 pt-1">
                  {/* Donut Pie Chart */}
                  <DonutChart data={dayDonutData} total={totalWeeklySales} />

                  {/* Horizontal Bar Breakdown */}
                  <div className="flex-1 w-full space-y-2.5">
                    {dayOfWeekStats.map((d) => {
                      const isPeak = peakDay.key === d.key && d.revenue > 0;
                      const pctOfTotal = totalWeeklySales > 0 ? (d.revenue / totalWeeklySales) * 100 : 0;
                      const pctOfMax = maxDayRevenue > 0 ? (d.revenue / maxDayRevenue) * 100 : 0;

                      return (
                        <div key={d.key} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                              <span className={`font-bold ${isPeak ? "text-slate-900 dark:text-white print:text-black font-black" : "text-slate-700 dark:text-slate-300 print:text-black"}`}>
                                {d.name}
                              </span>
                              {isPeak && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  Peak
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 font-mono">
                              <span className="text-slate-500 dark:text-slate-400 text-[11px] hidden sm:inline">
                                {d.count} {d.count === 1 ? "order" : "orders"}
                              </span>
                              <span className="text-slate-400 text-[11px]">
                                {pctOfTotal.toFixed(1)}%
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white print:text-black min-w-[70px] text-right">
                                {fmtCurrency(d.revenue)}
                              </span>
                            </div>
                          </div>

                          {/* Smooth Progress Bar */}
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden print:border print:border-slate-200">
                            <div
                              style={{
                                width: `${Math.max(pctOfMax, d.revenue > 0 ? 3 : 0)}%`,
                                backgroundColor: d.color,
                              }}
                              className="h-full rounded-full transition-all duration-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. 24-Hour Peak Time Area Graph */}
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 print:bg-white print:border-slate-300 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white print:text-black">
                        24-Hour Sales Trend
                      </h4>
                    </div>
                  </div>

                  {peakHour && peakHour.revenue > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-bold w-fit">
                      <span>Peak Hour: <strong>{peakHour.formattedTime}</strong> ({fmtCurrency(peakHour.revenue)})</span>
                    </div>
                  )}
                </div>

                {/* Smooth Area Wave Graph */}
                <HourlyAreaChart hourlyStats={hourlyStats} maxHourRevenue={maxHourRevenue} peakHour={peakHour} />

                {/* 4 Shift Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 print:border-slate-300">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Morning (6AM - 12PM)
                    </div>
                    <div className="text-sm font-black font-mono text-slate-900 dark:text-white print:text-black">
                      {fmtCurrency(morningSales)}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 print:border-slate-300">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Afternoon (12PM - 5PM)
                    </div>
                    <div className="text-sm font-black font-mono text-slate-900 dark:text-white print:text-black">
                      {fmtCurrency(afternoonSales)}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 print:border-slate-300">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Evening (5PM - 9PM)
                    </div>
                    <div className="text-sm font-black font-mono text-slate-900 dark:text-white print:text-black">
                      {fmtCurrency(eveningSales)}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 print:border-slate-300">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Night (9PM - 6AM)
                    </div>
                    <div className="text-sm font-black font-mono text-slate-900 dark:text-white print:text-black">
                      {fmtCurrency(nightSales)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── PAYMENT BREAKDOWN ── */}
            <div className="space-y-2 pt-2">
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
            <div className="space-y-3 pt-2">
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


