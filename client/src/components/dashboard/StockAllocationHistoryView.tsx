"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import {
  History,
  Search,
  RefreshCw,
  MapPin,
} from "lucide-react";

interface StockAllocationHistoryViewProps {
  selectedBranchId: string;
  onNavigate?: (module: any) => void;
}

type DatePreset = "ALL" | "TODAY" | "YESTERDAY" | "THIS_MONTH" | "LAST_MONTH" | "THIS_YEAR" | "CUSTOM";

export function StockAllocationHistoryView({
  selectedBranchId,
  onNavigate,
}: StockAllocationHistoryViewProps) {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFilter, setDateFilter] = useState<DatePreset>("ALL");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("ALL");
  const [batchFilter, setBatchFilter] = useState("");
  const [toLocFilter, setToLocFilter] = useState("");

  const loadAllocationHistory = useCallback(async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("branchId", selectedBranchId);
      params.append("type", "ALLOCATION");
      params.append("limit", "250");

      const res = await fetchApi(`/inventory/movements?${params.toString()}`);
      if (res.success && Array.isArray(res.data)) {
        setMovements(res.data);
      } else {
        setMovements([]);
      }
    } catch (err) {
      console.error("Failed to load allocation history", err);
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadAllocationHistory();
  }, [loadAllocationHistory]);

  const now = new Date();

  // Distinct products for filter dropdown
  const productOptions = useMemo(() => {
    const map = new Map<string, string>();
    movements.forEach((m) => {
      if (m.productId && m.product?.name) {
        map.set(m.productId, m.product.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [movements]);

  // Filtered movements
  const filteredMovements = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday = new Date(startOfToday);
    endOfYesterday.setMilliseconds(-1);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return movements.filter((m) => {
      const mDate = new Date(m.createdAt);

      // Date preset
      if (dateFilter === "TODAY" && mDate < startOfToday) return false;
      if (dateFilter === "YESTERDAY" && (mDate < startOfYesterday || mDate > endOfYesterday)) return false;
      if (dateFilter === "THIS_MONTH" && mDate < startOfMonth) return false;
      if (dateFilter === "LAST_MONTH" && (mDate < startOfLastMonth || mDate > endOfLastMonth)) return false;
      if (dateFilter === "THIS_YEAR" && mDate < startOfYear) return false;
      if (dateFilter === "CUSTOM") {
        if (customStartDate && mDate < new Date(customStartDate)) return false;
        if (customEndDate) {
          const e = new Date(customEndDate);
          e.setHours(23, 59, 59, 999);
          if (mDate > e) return false;
        }
      }

      // Product filter
      if (productFilter !== "ALL" && m.productId !== productFilter) return false;

      // Batch filter
      if (batchFilter && !(m.batchNumber || "").toLowerCase().includes(batchFilter.toLowerCase())) {
        return false;
      }

      // To location
      if (toLocFilter && !(m.toLocationLabel || "").toLowerCase().includes(toLocFilter.toLowerCase())) {
        return false;
      }

      // Search keyword
      if (search) {
        const q = search.toLowerCase().trim();
        const pName = (m.product?.name || "").toLowerCase();
        const bNum = (m.batchNumber || "").toLowerCase();
        const sType = (m.sourceType || "").toLowerCase();
        const toLoc = (m.toLocationLabel || "").toLowerCase();
        if (!pName.includes(q) && !bNum.includes(q) && !sType.includes(q) && !toLoc.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [
    movements,
    dateFilter,
    customStartDate,
    customEndDate,
    productFilter,
    batchFilter,
    toLocFilter,
    search,
    now,
  ]);

  const formatDateTime = (d: string | Date | null | undefined) => {
    if (!d) return "—";
    const date = new Date(d);
    return isNaN(date.getTime())
      ? "—"
      : date.toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <span>Stock Management</span>
            <span>/</span>
            <span>Allocate Product</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Allocation History</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <History className="h-6 w-6 text-brand-primary" />
            Stock Allocation History
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit ledger of stock placed into physical Rack → Shelf → Bin locations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate("stock_stock_allocation")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary/90 transition shadow-xs"
            >
              <MapPin className="h-4 w-4" />
              <span>Place Stock in Rack</span>
            </button>
          )}

          <button
            onClick={loadAllocationHistory}
            title="Refresh history"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        {/* Date Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          {[
            { id: "ALL", label: "All Time" },
            { id: "TODAY", label: "Today" },
            { id: "YESTERDAY", label: "Yesterday" },
            { id: "THIS_MONTH", label: "This Month" },
            { id: "LAST_MONTH", label: "Last Month" },
            { id: "THIS_YEAR", label: "This Year" },
            { id: "CUSTOM", label: "Custom Date" },
          ].map((df) => (
            <button
              key={df.id}
              onClick={() => setDateFilter(df.id as DatePreset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                dateFilter === df.id
                  ? "bg-brand-primary text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {df.label}
            </button>
          ))}
        </div>

        {/* Custom Date Inputs */}
        {dateFilter === "CUSTOM" && (
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        )}

        {/* Search & Select Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search product, batch, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition"
            />
          </div>

          {/* Product Filter */}
          <div>
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition"
            >
              <option value="ALL">All Products</option>
              {productOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Filter */}
          <div>
            <input
              type="text"
              placeholder="Filter by Batch #..."
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition"
            />
          </div>

          {/* To Location Filter */}
          <div>
            <input
              type="text"
              placeholder="Filter destination location..."
              value={toLocFilter}
              onChange={(e) => setToLocFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition"
            />
          </div>
        </div>
      </div>

      {/* Allocation History Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Loading allocation history records...
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No allocation history records found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Batch</th>
                  <th className="py-3.5 px-4">Source Type</th>
                  <th className="py-3.5 px-4">Quantity Placed</th>
                  <th className="py-3.5 px-4">To (Rack → Shelf → Bin)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMovements.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {formatDateTime(m.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {m.product?.name || "Medicine"}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {m.batchNumber || "—"}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          m.sourceType === "From Carton" || m.sourceType === "FROM_CARTON"
                            ? "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300/50"
                            : m.sourceType === "Loose Box" || m.sourceType === "LOOSE_BOX"
                            ? "bg-sky-100 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border border-sky-300/50"
                            : m.sourceType === "Loose Strip" || m.sourceType === "LOOSE_STRIP"
                            ? "bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-300/50"
                            : m.sourceType === "Loose Tablet" || m.sourceType === "LOOSE_TABLET"
                            ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300/50"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {m.sourceType || "Allocation"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-black text-brand-primary whitespace-nowrap">
                      {m.packagingDisplay || `${m.quantity} units`}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-brand-primary shrink-0" />
                        <span>{m.toLocationLabel || "Shelf"}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
