"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Pagination } from "@/components/common/Pagination";
import {
  Package,
  Search,
  Calendar,
  Filter,
  Loader2,
  Store,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { useBranchContext } from "@/context/BranchContext";

interface ProductWiseSalesViewProps {
  onNavigate?: (module: any) => void;
  selectedBranchId?: string;
}

// Persistent module cache
let cachedDailyData: any = null;

export function ProductWiseSalesView({ onNavigate: _onNavigate, selectedBranchId: propBranchId }: ProductWiseSalesViewProps = {}) {
  const { selectedBranchId: contextBranchId, currentBranch, isAllBranches } = useBranchContext();
  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;

  // Date range filtering
  const [datePreset, setDatePreset] = useState<"today" | "yesterday" | "last7" | "thisMonth" | "custom">("today");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Telemetry Data
  const [dailyData, setDailyData] = useState<any>(() => cachedDailyData);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productSortBy, setProductSortBy] = useState<"amount" | "qty" | "name" | "category">("amount");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadProductSales = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (effectiveBranchId && effectiveBranchId !== "all") {
        params.append("branchId", effectiveBranchId);
      }

      const res = await fetchApi<any>(`/reports/sales/daily?${params.toString()}`);

      if (res.success && res.data) {
        setDailyData(res.data);
        cachedDailyData = res.data;
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
  }, [startDate, endDate, effectiveBranchId]);

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

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 2xl:space-y-8 w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs xl:text-sm text-slate-400 mb-1">
            <span>Accounts & Finance</span>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300 font-bold">Product Velocity</span>
          </div>
          <h1 className="text-2xl xl:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Package className="h-7 w-7 xl:h-8 xl:w-8 text-emerald-600 dark:text-emerald-400" />
            Product-Wise Sales
          </h1>
          <p className="text-xs sm:text-sm xl:text-base text-slate-500 dark:text-slate-400 mt-1">
            Track medicine movement velocity, sold unit quantities, average selling rates, and revenue contributions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadProductSales(true)}
            disabled={refreshing}
            className="px-3.5 py-2 xl:px-4 xl:py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs xl:text-sm font-bold transition flex items-center gap-1.5"
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

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
            <Store className="h-4 w-4 text-emerald-500" />
            <span>Scope:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {isAllBranches ? "All Branches" : (currentBranch?.name || "Selected Branch")}
            </span>
          </div>
        </div>
      </div>

      {!dailyData && loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-2">
          <span className="text-xs font-bold">Querying product sales velocity...</span>
        </div>
      ) : (
        <>
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
                  {filteredProducts.length > 0 && (
                    <span className="ml-2 font-bold text-slate-600 dark:text-slate-300">
                      {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
                    </span>
                  )}
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
                      <td colSpan={9} className="py-12 text-center">
                        <Package className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <div className="text-slate-400 font-semibold">No product sales recorded for this date period.</div>
                        <div className="text-slate-300 dark:text-slate-600 text-[11px] mt-1">Try selecting a different date range.</div>
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
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredProducts.length}
              pageSize={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </>
      )}
    </div>
  );
}
