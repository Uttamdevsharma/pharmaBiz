"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import {
  Package,
  Search,
  Calendar,
  Filter,
  Loader2,
  Store,
  DollarSign,
  TrendingUp,
  Boxes,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ProductWiseSalesViewProps {
  onNavigate?: (module: any) => void;
}

export function ProductWiseSalesView({ onNavigate: _onNavigate }: ProductWiseSalesViewProps = {}) {
  // Date range filtering
  const [datePreset, setDatePreset] = useState<"today" | "yesterday" | "last7" | "thisMonth" | "custom">("today");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [branches, setBranches] = useState<any[]>([]);

  // Telemetry Data
  const [dailyData, setDailyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productSortBy, setProductSortBy] = useState<"amount" | "qty" | "name" | "category">("amount");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const loadProductSales = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (selectedBranchId) params.append("branchId", selectedBranchId);

      const [res, branchRes] = await Promise.all([
        fetchApi<any>(`/reports/sales/daily?${params.toString()}`),
        branches.length === 0 ? fetchApi<any>("/branches") : Promise.resolve({ success: true, data: branches }),
      ]);

      if (res.success && res.data) {
        setDailyData(res.data);
      }
      if (branchRes.success && branchRes.data && branches.length === 0) {
        setBranches(branchRes.data || []);
      }
    } catch (err) {
      console.error("Failed to load product sales", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProductSales();
  }, [startDate, endDate, selectedBranchId]);

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

  const summary = dailyData?.summary || {
    totalSales: 0,
    transactionCount: 0,
    totalUnitsSold: 0,
    averageOrderValue: 0,
  };

  const productList: any[] = dailyData?.productSales || [];

  // Extract unique categories
  const categories = Array.from(new Set(productList.map((p) => p.category || "General").filter(Boolean)));

  const filteredProducts = productList
    .filter((p: any) => {
      if (categoryFilter !== "ALL" && (p.category || "General") !== categoryFilter) return false;
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
      if (productSortBy === "name") return (a.productName || "").localeCompare(b.productName || "");
      if (productSortBy === "category") return (a.category || "").localeCompare(b.category || "");
      return b.totalAmount - a.totalAmount;
    });

  const topProduct = filteredProducts.length > 0 ? filteredProducts[0] : null;

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Accounts Management</span>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300 font-bold">Product-Wise Sales</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Package className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Product-Wise Sales
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track medicine movement velocity, sold unit quantities, average selling rates, and revenue contributions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadProductSales(true)}
            disabled={refreshing}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" /> : <Filter className="h-3.5 w-3.5" />}
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Date & Filter Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Period:</span>
          {[
            { id: "today", label: "Today" },
            { id: "yesterday", label: "Yesterday" },
            { id: "last7", label: "Last 7 Days" },
            { id: "thisMonth", label: "This Month" },
            { id: "custom", label: "Custom Range" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => {
                handlePresetChange(p.id as any);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                datePreset === p.id
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
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
                setCurrentPage(1);
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
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
            />
          </div>

          {branches.length > 1 && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Store className="h-4 w-4 text-slate-400" />
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  setCurrentPage(1);
                }}
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
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <span className="text-xs font-bold">Querying product sales velocity...</span>
        </div>
      ) : (
        <>
          {/* PRODUCT VELOCITY SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Units Sold</span>
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                  <Package className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
                {summary.totalUnitsSold}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-medium">Selected period volume</div>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unique Catalog SKUs</span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  <Boxes className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
                {productList.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-medium">Distinct products moved</div>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Product Sales</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <DollarSign className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
                ৳{summary.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-medium">Combined medicine sales</div>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Velocity Item</span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <div className="text-base font-black text-slate-900 dark:text-white mt-2 truncate">
                {topProduct ? topProduct.productName : "None"}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono font-bold">
                {topProduct ? `৳${topProduct.totalAmount.toFixed(2)} (${topProduct.quantitySold} units)` : "—"}
              </div>
            </div>
          </div>

          {/* PRODUCT-WISE SALES TABLE */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Package className="h-5 w-5 text-emerald-600" />
                  Product Sales Analysis
                </h3>
                <p className="text-xs text-slate-400">
                  Itemized units sold, packaging types, average unit rates, and revenue contributions.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search product, generic, SKU..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none font-medium"
                  />
                </div>

                {categories.length > 0 && (
                  <select
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
                  >
                    <option value="ALL">All Categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={productSortBy}
                  onChange={(e) => {
                    setProductSortBy(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
                >
                  <option value="amount">Sort by Revenue (৳)</option>
                  <option value="qty">Sort by Quantity Sold</option>
                  <option value="name">Sort by Product Name</option>
                  <option value="category">Sort by Category</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Product / Medicine</th>
                    <th className="py-3 px-4">Generic Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Unit</th>
                    <th className="py-3 px-4 text-center">Quantity Sold</th>
                    <th className="py-3 px-4 text-center">Invoices</th>
                    <th className="py-3 px-4 text-right">Avg Unit Rate</th>
                    <th className="py-3 px-4 text-right">Total Sales (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No product sales recorded for this date period.
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((p: any, idx: number) => (
                      <tr key={p.productId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 text-slate-400 font-mono">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{p.productName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{p.genericName || "—"}</td>
                        <td className="py-3 px-4 text-slate-500">{p.category || "General"}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                            {p.unitType || "PIECE"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-black font-mono text-slate-900 dark:text-slate-100">
                          {p.quantitySold}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-400">
                          {p.transactionsCount || 1}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                          ৳{Number(p.averageUnitPrice || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-black font-mono text-emerald-600 dark:text-emerald-400">
                          ৳{Number(p.totalAmount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 text-xs text-slate-500">
                <div>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} items
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-200"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-3 font-bold">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-200"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
