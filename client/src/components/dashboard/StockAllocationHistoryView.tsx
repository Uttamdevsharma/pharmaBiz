"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import {
  History,
  Search,
  RefreshCw,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Warehouse,
  Store,
  User,
  X,
  Layers,
} from "lucide-react";

interface StockAllocationHistoryViewProps {
  selectedBranchId: string;
  onNavigate?: (module: any) => void;
}

type DatePreset = "ALL" | "TODAY" | "YESTERDAY" | "THIS_MONTH" | "THIS_YEAR" | "CUSTOM";

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

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const loadAllocationHistory = useCallback(async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("branchId", selectedBranchId);
      params.append("type", "ALLOCATION");
      params.append("limit", "1000");

      const res = await fetchApi<any>(`/inventory/movements?${params.toString()}`);
      if (res?.success && Array.isArray(res.data)) {
        setMovements(res.data);
      } else if (Array.isArray(res)) {
        setMovements(res);
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

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [dateFilter, customStartDate, customEndDate, search, productFilter, batchFilter, toLocFilter]);

  const now = new Date();

  // Distinct products for filter dropdown
  const productOptions = useMemo(() => {
    const map = new Map<string, string>();
    movements.forEach((m) => {
      if (m.productId && m.product?.name) {
        map.set(m.productId, m.product.name);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
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
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return movements.filter((m) => {
      const mDate = new Date(m.createdAt);

      // Date preset filter
      if (dateFilter === "TODAY" && mDate < startOfToday) return false;
      if (dateFilter === "YESTERDAY" && (mDate < startOfYesterday || mDate > endOfYesterday)) return false;
      if (dateFilter === "THIS_MONTH" && mDate < startOfMonth) return false;
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

      // To location filter
      if (toLocFilter && !(m.toLocationLabel || "").toLowerCase().includes(toLocFilter.toLowerCase())) {
        return false;
      }

      // Search keyword filter
      if (search) {
        const q = search.toLowerCase().trim();
        const pName = (m.product?.name || "").toLowerCase();
        const genName = (m.product?.genericName || "").toLowerCase();
        const bNum = (m.batchNumber || "").toLowerCase();
        const toLoc = (m.toLocationLabel || "").toLowerCase();
        const performed = (m.performedByName || "").toLowerCase();
        if (
          !pName.includes(q) &&
          !genName.includes(q) &&
          !bNum.includes(q) &&
          !toLoc.includes(q) &&
          !performed.includes(q)
        ) {
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

  // Paginated records
  const totalPages = Math.ceil(filteredMovements.length / pageSize) || 1;
  const paginatedMovements = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredMovements.slice(startIndex, startIndex + pageSize);
  }, [filteredMovements, page, pageSize]);

  const formatDateTime = (d: string | Date | null | undefined) => {
    if (!d) return "—";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "—";
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const hourStr = String(hours).padStart(2, "0");
    return `${day} ${month} ${year}, ${hourStr}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 mb-1">
            <span>Stock Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Allocation History</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <History className="h-7 w-7 text-brand-primary" />
            Allocation History
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            History and audit log of medicines moved from Godown to Shop racks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadAllocationHistory}
            disabled={loading}
            title="Refresh history"
            className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 sm:p-5 shadow-xs space-y-4">
        {/* Date Presets */}
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs sm:text-sm font-bold text-slate-500 mr-1 flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>Time Range:</span>
          </span>
          {[
            { id: "ALL", label: "All Time" },
            { id: "TODAY", label: "Today" },
            { id: "YESTERDAY", label: "Yesterday" },
            { id: "THIS_MONTH", label: "This Month" },
            { id: "THIS_YEAR", label: "This Year" },
            { id: "CUSTOM", label: "Custom Date" },
          ].map((df) => (
            <button
              key={df.id}
              type="button"
              onClick={() => setDateFilter(df.id as DatePreset)}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${
                dateFilter === df.id
                  ? "bg-brand-primary text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {df.label}
            </button>
          ))}
        </div>

        {/* Custom Date Inputs */}
        {dateFilter === "CUSTOM" && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-slate-600 dark:text-slate-300 font-bold">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-brand-primary"
              />
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-slate-600 dark:text-slate-300 font-bold">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-brand-primary"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setCustomStartDate("");
                  setCustomEndDate("");
                }}
                className="text-xs text-rose-500 hover:text-rose-600 font-bold cursor-pointer"
              >
                Clear Dates
              </button>
            )}
          </div>
        )}

        {/* Search & Select Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search product, batch, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 text-sm pl-10 pr-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-brand-primary transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Product Filter */}
          <div>
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full h-11 text-sm px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-brand-primary transition cursor-pointer"
            >
              <option value="ALL">All Medicines ({productOptions.length})</option>
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
              className="w-full h-11 text-sm px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-brand-primary transition"
            />
          </div>

          {/* To Location Filter */}
          <div>
            <input
              type="text"
              placeholder="Filter by Shop Location..."
              value={toLocFilter}
              onChange={(e) => setToLocFilter(e.target.value)}
              className="w-full h-11 text-sm px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-brand-primary transition"
            />
          </div>
        </div>
      </div>

      {/* Allocation History Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm sm:text-base border-collapse">
            <thead className="bg-slate-50/80 dark:bg-slate-850 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-bold w-12 text-center text-sm sm:text-base">#</th>
                <th className="py-3.5 px-4 font-bold text-sm sm:text-base">Date &amp; Time</th>
                <th className="py-3.5 px-4 font-bold text-sm sm:text-base">Medicine Name</th>
                <th className="py-3.5 px-4 font-bold text-sm sm:text-base">Batch &amp; Expiry</th>
                <th className="py-3.5 px-4 font-bold text-sm sm:text-base">From</th>
                <th className="py-3.5 px-4 font-bold text-sm sm:text-base">To Location</th>
                <th className="py-3.5 px-4 font-bold text-right text-sm sm:text-base">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
              {loading ? (
                /* Skeleton Loader */
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse h-16">
                    <td className="py-4 px-4 text-center">
                      <div className="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded mx-auto" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded mb-1.5" />
                      <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800/60 rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded mb-1" />
                      <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800/60 rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : paginatedMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 text-sm">
                    No allocation history records found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedMovements.map((m, idx) => {
                  const rowNum = (page - 1) * pageSize + idx + 1;
                  const prod = m.product || {};
                  const expDate = m.inventory?.expiryDate || m.expiryDate;
                  const unitLabel = prod.unit || prod.dosageForm || "tablet";

                  return (
                    <tr
                      key={m.id || idx}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors"
                    >
                      {/* Row Index */}
                      <td className="py-4 px-4 text-center text-slate-500 font-mono text-sm sm:text-base">
                        {rowNum}
                      </td>

                      {/* Date & Time */}
                      <td className="py-4 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300 font-mono text-sm sm:text-base">
                        {formatDateTime(m.createdAt)}
                      </td>

                      {/* Medicine Name */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-base">
                          {prod.name || "Medicine"}
                          {prod.size && (
                            <span className="ml-1 text-sm font-medium text-slate-400">
                              ({prod.size})
                            </span>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                          {prod.genericName ? `${prod.genericName} • ` : ""}
                          {prod.manufacturer || "Standard"}
                        </div>
                      </td>

                      {/* Batch & Expiry */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                          Batch #{m.batchNumber || "Default"}
                        </div>
                        {expDate && (
                          <div className="text-xs text-slate-400 mt-0.5">
                            Exp: {new Date(expDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      {/* From (Normal plain text, strictly 'Godown', no box) */}
                      <td className="py-4 px-4 whitespace-nowrap text-slate-800 dark:text-slate-200 text-sm sm:text-base font-semibold">
                        Godown
                      </td>

                      {/* To Location (Normal plain text, no box) */}
                      <td className="py-4 px-4 whitespace-nowrap text-slate-800 dark:text-slate-200 text-sm sm:text-base font-semibold">
                        {m.toLocationLabel || "Shop"}
                      </td>

                      {/* Quantity (Normal plain text count of tablets/units, no box) */}
                      <td className="py-4 px-4 text-right whitespace-nowrap font-mono font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                        {Math.abs(m.quantity || 0).toLocaleString()} {unitLabel}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && filteredMovements.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                Showing <strong className="text-slate-900 dark:text-white">{(page - 1) * pageSize + 1}</strong> to{" "}
                <strong className="text-slate-900 dark:text-white">
                  {Math.min(page * pageSize, filteredMovements.length)}
                </strong>{" "}
                of <strong className="text-slate-900 dark:text-white">{filteredMovements.length}</strong> allocations
              </span>

              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-700">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value) || 15);
                    setPage(1);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                >
                  <option value={10}>10 / page</option>
                  <option value={15}>15 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from({ length: totalPages }).map((_, i) => {
                const pNum = i + 1;
                if (totalPages > 7 && pNum !== 1 && pNum !== totalPages && Math.abs(pNum - page) > 1) {
                  return null;
                }
                return (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => setPage(pNum)}
                    className={`w-8 h-8 rounded-lg font-bold text-xs sm:text-sm transition cursor-pointer ${
                      page === pNum
                        ? "bg-brand-primary text-white"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
