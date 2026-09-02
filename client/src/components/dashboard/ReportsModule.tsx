"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Store,
  Boxes,
  Loader2,
  Calendar,
  Filter,
  Printer,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  Smartphone,
  Layers,
  ArrowRight,
  ChevronDown,
  X,
  Clock,
  Package,
  Receipt,
  Download,
  Building,
} from "lucide-react";

export function ReportsModule() {
  const { user } = useAuth();

  // Tab: "daily" | "branches" | "inventory"
  const [activeTab, setActiveTab] = useState<"daily" | "branches" | "inventory">("daily");

  // Date Filtering State
  const [datePreset, setDatePreset] = useState<"today" | "yesterday" | "last7" | "thisMonth" | "custom">("today");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || "");
  const [branches, setBranches] = useState<any[]>([]);

  // Report Data
  const [dailyData, setDailyData] = useState<any>(null);
  const [branchWiseData, setBranchWiseData] = useState<any[]>([]);
  const [inventoryValData, setInventoryValData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter in Product Sales table
  const [productSearch, setProductSearch] = useState("");
  const [productSortBy, setProductSortBy] = useState<"amount" | "qty">("amount");

  // PDF Preview Modal
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Quick Date Preset Handler
  const handlePresetChange = (preset: "today" | "yesterday" | "last7" | "thisMonth" | "custom") => {
    setDatePreset(preset);
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
    }
  };

  const loadAllReports = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (selectedBranchId) params.append("branchId", selectedBranchId);

      const [dailyRes, bRes, iRes, branchListRes] = await Promise.all([
        fetchApi<any>(`/reports/sales/daily?${params.toString()}`),
        fetchApi<any>(`/reports/sales/branch-wise?${params.toString()}`),
        fetchApi<any>("/reports/inventory"),
        branches.length === 0 ? fetchApi<any>("/branches") : Promise.resolve({ success: true, data: branches }),
      ]);

      if (dailyRes.success && dailyRes.data) setDailyData(dailyRes.data);
      if (bRes.success && bRes.data) setBranchWiseData(bRes.data || []);
      if (iRes.success && iRes.data) setInventoryValData(iRes.data);
      if (branchListRes.success && branchListRes.data && branches.length === 0) {
        setBranches(branchListRes.data || []);
      }
    } catch (err) {
      console.error("Failed to load reports", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllReports();
  }, [startDate, endDate, selectedBranchId]);

  const handlePrintPdf = () => {
    window.print();
  };

  // Filtered Product Sales
  const filteredProducts = (dailyData?.productSales || [])
    .filter((p: any) => {
      if (!productSearch.trim()) return true;
      const s = productSearch.toLowerCase();
      return (
        p.productName?.toLowerCase().includes(s) ||
        p.sku?.toLowerCase().includes(s) ||
        p.genericName?.toLowerCase().includes(s) ||
        p.category?.toLowerCase().includes(s)
      );
    })
    .sort((a: any, b: any) => {
      if (productSortBy === "qty") return b.quantitySold - a.quantitySold;
      return b.totalAmount - a.totalAmount;
    });

  const summary = dailyData?.summary || {
    totalSales: 0,
    totalSubTotal: 0,
    totalDiscounts: 0,
    totalTaxes: 0,
    totalPaid: 0,
    totalDue: 0,
    transactionCount: 0,
    totalUnitsSold: 0,
    averageOrderValue: 0,
  };

  const paymentBreakdown = dailyData?.paymentBreakdown || {
    cash: 0,
    bkash: 0,
    nagad: 0,
    card: 0,
    other: 0,
    grandTotal: 0,
  };

  const isSingleDay = startDate === endDate;
  const displayPeriodLabel = isSingleDay
    ? new Date(startDate).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : `${new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(
        endDate
      ).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-brand-primary/10 text-brand-primary">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                Sales & Financial Intelligence
              </h1>
              <p className="text-xs text-slate-400">
                Real-time daily register audits, payment breakdown (Cash, bKash, Nagad, Card), and product velocity.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Tab Selection */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab("daily")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === "daily"
                  ? "bg-white dark:bg-slate-900 text-brand-primary shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Daily Sales & Register
            </button>
            <button
              onClick={() => setActiveTab("branches")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === "branches"
                  ? "bg-white dark:bg-slate-900 text-brand-primary shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Branch Comparison
            </button>
            <button
              onClick={() => setActiveTab("inventory")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === "inventory"
                  ? "bg-white dark:bg-slate-900 text-brand-primary shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Stock Valuation
            </button>
          </div>

          {/* Action: Open Daily Sales Report PDF */}
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold shadow-md hover:bg-brand-primary/90 transition flex items-center gap-2 active:scale-95"
          >
            <FileText className="h-4 w-4" />
            <span>Daily Sales Report PDF</span>
          </button>
        </div>
      </div>

      {/* TAB 1: DAILY SALES & REGISTER AUDIT */}
      {activeTab === "daily" && (
        <div className="space-y-6">
          {/* Interactive Date & Filter Bar */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Period:</span>
              {[
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "last7", label: "Last 7 Days" },
                { id: "thisMonth", label: "This Month" },
                { id: "custom", label: "Custom" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePresetChange(p.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    datePreset === p.id
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Date Pickers & Branch Filter */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <Calendar className="h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset("custom");
                  }}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset("custom");
                  }}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              {/* Branch Filter (if multiple branches available) */}
              {branches.length > 1 && (
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Store className="h-4 w-4 text-slate-400" />
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={() => loadAllReports(true)}
                disabled={refreshing}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 transition"
                title="Refresh Metrics"
              >
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin text-brand-primary" /> : <Filter className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
              <span className="text-xs font-bold">Querying live sales telemetry & payment ledgers...</span>
            </div>
          ) : (
            <>
              {/* Executive Sales KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Revenue</span>
                    <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <DollarSign className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
                    ৳{summary.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
                    <span>{displayPeriodLabel}</span>
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sales Invoices</span>
                    <span className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                      <Receipt className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
                    {summary.transactionCount}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
                    <span>Completed transactions</span>
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Medicine Units Sold</span>
                    <span className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                      <Package className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
                    {summary.totalUnitsSold}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
                    <span>Strips, boxes & bottles</span>
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Ticket</span>
                    <span className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                      <TrendingUp className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
                    ৳{summary.averageOrderValue.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
                    <span>Avg sales revenue / customer</span>
                  </div>
                </div>
              </div>

              {/* PAYMENT METHOD BREAKDOWN: Cash, bKash, Nagad, Card, Other, Grand Total */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-brand-primary" />
                      Payment Method Breakdown & Register Reconciliation
                    </h3>
                    <p className="text-xs text-slate-400">
                      Detailed collection channels for cash drawers, digital wallets, and card settlements.
                    </p>
                  </div>
                  <div className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl text-slate-600 dark:text-slate-300">
                    Grand Total: ৳{paymentBreakdown.grandTotal.toFixed(2)}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 pt-2">
                  {/* CASH */}
                  <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <Banknote className="h-4 w-4 text-emerald-600" />
                        Cash Drawer
                      </span>
                      <span className="text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 px-2 py-0.5 rounded-full">
                        {summary.totalSales > 0 ? `${Math.round((paymentBreakdown.cash / summary.totalSales) * 100)}%` : "0%"}
                      </span>
                    </div>
                    <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                      ৳{paymentBreakdown.cash.toFixed(2)}
                    </div>
                    <p className="text-[10px] text-slate-400">Cash counter receipts</p>
                  </div>

                  {/* BKASH */}
                  <div className="p-4 rounded-2xl bg-pink-50/50 dark:bg-pink-950/20 border border-pink-200/80 dark:border-pink-900/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-pink-800 dark:text-pink-300 flex items-center gap-1.5">
                        <Smartphone className="h-4 w-4 text-pink-600" />
                        bKash Merchant
                      </span>
                      <span className="text-[10px] font-extrabold bg-pink-100 dark:bg-pink-900/50 text-pink-700 px-2 py-0.5 rounded-full">
                        {summary.totalSales > 0 ? `${Math.round((paymentBreakdown.bkash / summary.totalSales) * 100)}%` : "0%"}
                      </span>
                    </div>
                    <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                      ৳{paymentBreakdown.bkash.toFixed(2)}
                    </div>
                    <p className="text-[10px] text-slate-400">Mobile bKash payments</p>
                  </div>

                  {/* NAGAD */}
                  <div className="p-4 rounded-2xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-orange-800 dark:text-orange-300 flex items-center gap-1.5">
                        <Smartphone className="h-4 w-4 text-orange-600" />
                        Nagad Merchant
                      </span>
                      <span className="text-[10px] font-extrabold bg-orange-100 dark:bg-orange-900/50 text-orange-700 px-2 py-0.5 rounded-full">
                        {summary.totalSales > 0 ? `${Math.round((paymentBreakdown.nagad / summary.totalSales) * 100)}%` : "0%"}
                      </span>
                    </div>
                    <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                      ৳{paymentBreakdown.nagad.toFixed(2)}
                    </div>
                    <p className="text-[10px] text-slate-400">Nagad digital wallet</p>
                  </div>

                  {/* CARD */}
                  <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        Card / POS
                      </span>
                      <span className="text-[10px] font-extrabold bg-blue-100 dark:bg-blue-900/50 text-blue-700 px-2 py-0.5 rounded-full">
                        {summary.totalSales > 0 ? `${Math.round((paymentBreakdown.card / summary.totalSales) * 100)}%` : "0%"}
                      </span>
                    </div>
                    <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                      ৳{paymentBreakdown.card.toFixed(2)}
                    </div>
                    <p className="text-[10px] text-slate-400">Visa / Master / Debit POS</p>
                  </div>

                  {/* GRAND TOTAL SUMMARY */}
                  <div className="p-4 rounded-2xl bg-brand-primary/10 border border-brand-primary/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-brand-primary flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-brand-primary" />
                        Grand Total
                      </span>
                      <span className="text-[10px] font-extrabold bg-brand-primary text-white px-2 py-0.5 rounded-full">
                        100%
                      </span>
                    </div>
                    <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                      ৳{paymentBreakdown.grandTotal.toFixed(2)}
                    </div>
                    <p className="text-[10px] text-slate-400">Audited total revenue</p>
                  </div>
                </div>
              </div>

              {/* PRODUCT-WISE SALES BREAKDOWN (Which products sold and how many units) */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Package className="h-5 w-5 text-brand-primary" />
                      Product-Wise Sales & Unit Distribution
                    </h3>
                    <p className="text-xs text-slate-400">
                      Product quantity sold, average unit selling rate, and revenue contribution.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Search in products */}
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search sold medicine..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold outline-none w-48"
                      />
                    </div>

                    {/* Sort Switcher */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                      <button
                        onClick={() => setProductSortBy("amount")}
                        className={`px-2.5 py-1 rounded-lg transition ${
                          productSortBy === "amount"
                            ? "bg-white dark:bg-slate-900 text-brand-primary shadow-sm"
                            : "text-slate-500"
                        }`}
                      >
                        By Revenue
                      </button>
                      <button
                        onClick={() => setProductSortBy("qty")}
                        className={`px-2.5 py-1 rounded-lg transition ${
                          productSortBy === "qty"
                            ? "bg-white dark:bg-slate-900 text-brand-primary shadow-sm"
                            : "text-slate-500"
                        }`}
                      >
                        By Units
                      </button>
                    </div>
                  </div>
                </div>

                {filteredProducts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[10px] font-bold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-3 px-4">#</th>
                          <th className="py-3 px-4">Product / Generic</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4 text-center">Unit</th>
                          <th className="py-3 px-4 text-center">Units Sold</th>
                          <th className="py-3 px-4 text-right">Avg Unit Rate</th>
                          <th className="py-3 px-4 text-right">Total Selling Amount</th>
                          <th className="py-3 px-4 text-right">Invoices</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {filteredProducts.map((p: any, idx: number) => (
                          <tr key={p.productId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 dark:text-white">{p.productName}</div>
                              {p.genericName && (
                                <div className="text-[10px] text-slate-400 font-mono">{p.genericName}</div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                {p.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-semibold text-slate-500">
                              {p.unitType}
                            </td>
                            <td className="py-3 px-4 text-center font-bold font-mono text-slate-900 dark:text-white">
                              <span className="px-2 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-lg">
                                {p.quantitySold}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                              ৳{p.averageUnitPrice.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-black font-mono text-emerald-600 dark:text-emerald-400">
                              ৳{p.totalAmount.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-400 font-mono">
                              {p.transactionsCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No sold products found for this reporting period.
                  </div>
                )}
              </div>

              {/* ITEMIZED SALES REGISTER & INVOICES */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-brand-primary" />
                      Completed Sales Invoices Ledger
                    </h3>
                    <p className="text-xs text-slate-400">
                      Real-time transactional audit log with payment method tags and customer records.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    {dailyData?.transactions?.length || 0} Invoices
                  </span>
                </div>

                {(dailyData?.transactions || []).length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[10px] font-bold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-3 px-4">Invoice #</th>
                          <th className="py-3 px-4">Time</th>
                          <th className="py-3 px-4">Customer</th>
                          <th className="py-3 px-4">Cashier</th>
                          <th className="py-3 px-4">Payment Method</th>
                          <th className="py-3 px-4 text-center">Items</th>
                          <th className="py-3 px-4 text-right">Discount</th>
                          <th className="py-3 px-4 text-right">Grand Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {(dailyData?.transactions || []).map((t: any) => (
                          <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                              {t.receiptNo}
                            </td>
                            <td className="py-3 px-4 text-slate-400 font-mono">
                              {new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-800 dark:text-slate-200">{t.customerName}</div>
                              {t.customerPhone && (
                                <div className="text-[10px] text-slate-400 font-mono">{t.customerPhone}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                              {t.cashier?.name || t.cashier?.username || "Staff"}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  t.paymentDetail === "Cash"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    : t.paymentDetail === "bKash"
                                    ? "bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300"
                                    : t.paymentDetail === "Nagad"
                                    ? "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                                    : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                }`}
                              >
                                {t.paymentDetail}
                              </span>
                              {t.notes && <span className="block text-[9px] text-slate-400 mt-0.5">{t.notes}</span>}
                            </td>
                            <td className="py-3 px-4 text-center font-bold font-mono">{t.itemsCount}</td>
                            <td className="py-3 px-4 text-right text-slate-400 font-mono">
                              {t.discount > 0 ? `৳${t.discount.toFixed(2)}` : "—"}
                            </td>
                            <td className="py-3 px-4 text-right font-black font-mono text-slate-900 dark:text-white">
                              ৳{t.totalAmount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-10 text-center text-xs text-slate-400">
                    No invoice transactions recorded for this period.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: BRANCH PERFORMANCE COMPARISON */}
      {activeTab === "branches" && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Branch-Wise Revenue Breakdown</h3>
              <p className="text-xs text-slate-400">Comparative financial sales across all pharmacy chain locations.</p>
            </div>
            <span className="text-xs font-bold text-slate-400">{branchWiseData.length} Branches Reporting</span>
          </div>

          {branchWiseData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-bold">
                  <tr>
                    <th className="px-4 py-3">Store Branch</th>
                    <th className="px-4 py-3">Total Revenue</th>
                    <th className="px-4 py-3">Transactions</th>
                    <th className="px-4 py-3">Avg Ticket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  {branchWiseData.map((b: any) => {
                    const avg = b.transactionCount > 0 ? Math.round(b.totalSales / b.transactionCount) : 0;
                    return (
                      <tr key={b.branchId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{b.branchName}</td>
                        <td className="px-4 py-3 font-bold text-emerald-600 font-mono">
                          ৳ {Number(b.totalSales).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 font-mono">{b.transactionCount}</td>
                        <td className="px-4 py-3 font-mono">৳ {avg}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              No sales recorded across branches for the reporting period.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STOCK & INVENTORY VALUATION */}
      {activeTab === "inventory" && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Inventory Valuation & Assets</h3>
            <p className="text-xs text-slate-400">Total estimated monetary worth of current stock on shelf and in warehouse.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase">Estimated Stock Value</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                ৳ {Number(inventoryValData?.totalValuation || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-slate-400">Selling valuation of available units</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase">Total Units in Stock</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {inventoryValData?.totalStockUnits || 0}
              </div>
              <p className="text-[10px] text-slate-400">Total physical units tracked</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase">Catalog SKU Count</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {inventoryValData?.totalProducts || 0}
              </div>
              <p className="text-[10px] text-slate-400">Active product catalog items</p>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE / DOWNLOADABLE DAILY SALES REPORT PDF MODAL */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-3xl w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
            {/* Header controls (Hidden during print) */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-primary" />
                <span className="font-black text-sm text-slate-900 dark:text-white">
                  Daily Sales Report PDF Preview
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintPdf}
                  className="px-4 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-bold shadow-md hover:bg-brand-primary/90 transition flex items-center gap-1.5 active:scale-95"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  onClick={() => setIsPdfModalOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Printable Document Container */}
            <div className="p-8 sm:p-10 space-y-6 text-slate-900 bg-white dark:bg-slate-950 dark:text-white print:p-0 print:text-black print:bg-white">
              {/* Document Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 dark:border-slate-100 print:border-black pb-4">
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white print:text-black">
                    {dailyData?.pharmacy?.name || "Pharmacy Store"}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 print:text-black mt-0.5">
                    {dailyData?.pharmacy?.address || "Main Branch"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 print:text-black">
                    Phone: {dailyData?.pharmacy?.phone || "—"} • Email: {dailyData?.pharmacy?.email || "—"}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <div className="inline-block px-3 py-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900 print:bg-black print:text-white text-xs font-black uppercase tracking-wider rounded-md">
                    Daily Sales & Register Audit
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
                    ৳{summary.totalSales.toFixed(2)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 print:bg-slate-100 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Invoices</div>
                  <div className="text-lg font-black font-mono">{summary.transactionCount}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 print:bg-slate-100 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Units Sold</div>
                  <div className="text-lg font-black font-mono">{summary.totalUnitsSold}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 print:bg-slate-100 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Avg Ticket</div>
                  <div className="text-lg font-black font-mono">৳{summary.averageOrderValue.toFixed(2)}</div>
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
                    <strong className="font-mono text-sm">৳{paymentBreakdown.cash.toFixed(2)}</strong>
                  </div>
                  <div className="p-2.5 border rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold">bKash Payments</span>
                    <strong className="font-mono text-sm">৳{paymentBreakdown.bkash.toFixed(2)}</strong>
                  </div>
                  <div className="p-2.5 border rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold">Nagad Payments</span>
                    <strong className="font-mono text-sm">৳{paymentBreakdown.nagad.toFixed(2)}</strong>
                  </div>
                  <div className="p-2.5 border rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold">Card / POS</span>
                    <strong className="font-mono text-sm">৳{paymentBreakdown.card.toFixed(2)}</strong>
                  </div>
                  <div className="p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 print:bg-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold">Grand Total</span>
                    <strong className="font-mono text-sm text-emerald-600 print:text-black">
                      ৳{paymentBreakdown.grandTotal.toFixed(2)}
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
                    {(dailyData?.productSales || []).slice(0, 50).map((p: any, idx: number) => (
                      <tr key={p.productId} className="py-1">
                        <td className="py-1 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-1 font-bold">{p.productName}</td>
                        <td className="py-1 text-center text-slate-500">{p.unitType}</td>
                        <td className="py-1 text-center font-bold font-mono">{p.quantitySold}</td>
                        <td className="py-1 text-right font-mono">৳{p.averageUnitPrice.toFixed(2)}</td>
                        <td className="py-1 text-right font-bold font-mono">৳{p.totalAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Transaction Ledger */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white print:text-black border-b border-slate-200 pb-1">
                  3. Invoices & Counter Receipts Summary
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
                    {(dailyData?.transactions || []).slice(0, 30).map((t: any) => (
                      <tr key={t.id} className="py-1">
                        <td className="py-1 font-mono font-bold">{t.receiptNo}</td>
                        <td className="py-1 font-mono text-slate-400">
                          {new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-1">{t.customerName}</td>
                        <td className="py-1">{t.cashier?.name || "Staff"}</td>
                        <td className="py-1 font-bold">{t.paymentDetail}</td>
                        <td className="py-1 text-right font-bold font-mono">৳{t.totalAmount.toFixed(2)}</td>
                      </tr>
                    ))}
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
        </div>
      )}
    </div>
  );
}
