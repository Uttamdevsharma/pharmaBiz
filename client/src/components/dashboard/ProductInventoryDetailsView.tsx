"use client";

import React, { useState, useMemo } from "react";
import {
  calculatePackaging,
  calculateBatchBulkPackaging,
  PackagingConfig,
} from "@/lib/packaging";
import {
  Boxes,
  MapPin,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  Search,
  Filter,
  Layers,
  Archive,
  ChevronRight,
  TrendingDown,
  DollarSign,
  Package,
  Barcode,
  Share2,
} from "lucide-react";

interface ProductInventoryDetailsViewProps {
  product: any;
  batches: any[];
  selectedBranchId: string;
  onSelectBatch: (batch: any) => void;
  onBackToStockList: () => void;
  onNavigateToAllocate: (batchId: string, productId?: string) => void;
}

type DateRangeFilter = "THIS_MONTH" | "TODAY" | "YESTERDAY" | "LAST_MONTH" | "THIS_YEAR" | "ALL" | "CUSTOM";
type BatchStatusFilter = "ALL" | "ACTIVE" | "NEAR_EXPIRY" | "EXPIRED" | "FULLY_SOLD" | "LOW_STOCK" | "OUT_OF_STOCK";

export function ProductInventoryDetailsView({
  product,
  batches,
  selectedBranchId,
  onSelectBatch,
  onBackToStockList,
  onNavigateToAllocate,
}: ProductInventoryDetailsViewProps) {
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>("THIS_MONTH");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const [statusFilter, setStatusFilter] = useState<BatchStatusFilter>("ALL");
  const [batchSearch, setBatchSearch] = useState<string>("");

  const packConfig: PackagingConfig = {
    packageType: product?.productType || product?.category || "MEDICINE",
    boxesPerCarton: product?.qtyPerLevel2 || 10,
    stripsPerBox: product?.stripsPerBox || 10,
    tabletsPerStrip: product?.tabletsPerStrip || 10,
    unit: product?.unit || "tablet",
  };

  const now = new Date();

  // Date range calculation helpers based on local date boundaries
  const dateRangeBounds = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (dateFilter) {
      case "ALL":
        return { start: null, end: null };
      case "TODAY":
        return { start: today, end: endOfToday };
      case "YESTERDAY": {
        const yStart = new Date(today);
        yStart.setDate(yStart.getDate() - 1);
        const yEnd = new Date(yStart);
        yEnd.setHours(23, 59, 59, 999);
        return { start: yStart, end: yEnd };
      }
      case "THIS_MONTH": {
        const mStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        return { start: mStart, end: endOfToday };
      }
      case "LAST_MONTH": {
        const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return { start: lmStart, end: lmEnd };
      }
      case "THIS_YEAR": {
        const yStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        return { start: yStart, end: endOfToday };
      }
      case "CUSTOM": {
        if (!customStartDate && !customEndDate) return { start: null, end: null };
        let start = null;
        if (customStartDate) {
          const [sYear, sMonth, sDay] = customStartDate.split("-").map(Number);
          start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
        }
        let end = null;
        if (customEndDate) {
          const [eYear, eMonth, eDay] = customEndDate.split("-").map(Number);
          end = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
        }
        return { start, end };
      }
      default:
        return { start: null, end: null };
    }
  }, [dateFilter, customStartDate, customEndDate]);

  // Filter and FEFO sort batches
  const filteredBatches = useMemo(() => {
    return batches
      .filter((b) => {
        // 1. Text Search (batchNumber, barcode)
        if (batchSearch) {
          const q = batchSearch.toLowerCase();
          const matchNum = b.batchNumber?.toLowerCase().includes(q);
          const matchBar = b.barcode?.toLowerCase().includes(q);
          if (!matchNum && !matchBar) return false;
        }

        // 2. Date Range Filter (based on actual Received Date, falling back to createdAt for legacy records)
        if (dateRangeBounds.start || dateRangeBounds.end) {
          const rawDate = b.receivedDate || b.createdAt;
          const bDate = rawDate ? new Date(rawDate) : null;
          if (bDate) {
            if (dateRangeBounds.start && bDate < dateRangeBounds.start) return false;
            if (dateRangeBounds.end && bDate > dateRangeBounds.end) return false;
          } else {
            return false;
          }
        }

        // 3. Batch Status Filter
        const bExp = b.expiryDate ? new Date(b.expiryDate) : null;
        const isExp = bExp ? bExp < now : false;
        const daysLeft = bExp ? Math.ceil((bExp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

        if (statusFilter === "ACTIVE") {
          if (isExp || b.quantity <= 0) return false;
        } else if (statusFilter === "NEAR_EXPIRY") {
          if (isExp || daysLeft === null || daysLeft > 90 || b.quantity <= 0) return false;
        } else if (statusFilter === "EXPIRED") {
          if (!isExp) return false;
        } else if (statusFilter === "FULLY_SOLD" || statusFilter === "OUT_OF_STOCK") {
          if (b.quantity > 0) return false;
        } else if (statusFilter === "LOW_STOCK") {
          const threshold = b.lowStockThreshold || b.minStockLevel || 10;
          if (b.quantity <= 0 || b.quantity > threshold) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Primary FEFO Sorting: Earliest expiry first
        const expA = a.expiryDate ? new Date(a.expiryDate).getTime() : 9999999999999;
        const expB = b.expiryDate ? new Date(b.expiryDate).getTime() : 9999999999999;
        if (expA !== expB) return expA - expB;
        // Secondary: Most recent batch by received date
        const recA = new Date(a.receivedDate || a.createdAt || 0).getTime();
        const recB = new Date(b.receivedDate || b.createdAt || 0).getTime();
        return recB - recA;
      });
  }, [batches, batchSearch, dateRangeBounds, statusFilter, now]);

  return (
    <div className="space-y-6">
      {/* Breadcrumbs & Product Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
            <button
              onClick={onBackToStockList}
              className="hover:text-brand-primary transition"
            >
              Stock Management
            </button>
            <ChevronRight className="h-3 w-3" />
            <button
              onClick={onBackToStockList}
              className="hover:text-brand-primary transition"
            >
              Stock List
            </button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-brand-primary font-bold">
              {product?.name}
            </span>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onBackToStockList}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition"
              title="Back to product list"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  {product?.name}
                </h2>
                {product?.size && (
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-2 py-0.5 rounded-lg font-bold">
                    {product.size}
                  </span>
                )}
                <span className="bg-brand-primary/10 text-brand-primary text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {product?.productType || product?.category || "Medicine"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {product?.genericName && <span className="font-semibold text-brand-primary">{product.genericName} • </span>}
                {product?.manufacturer || product?.brandName || "Brand"} • SKU: {product?.sku}
                {product?.barcode && ` • Barcode: ${product.barcode}`}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onBackToStockList}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          All Products
        </button>
      </div>

      {/* Date Range & Batch Status Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Date Range Filter Options */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Received Date:
            </span>
            {(
              [
                { id: "THIS_MONTH", label: "This Month" },
                { id: "TODAY", label: "Today" },
                { id: "YESTERDAY", label: "Yesterday" },
                { id: "LAST_MONTH", label: "Last Month" },
                { id: "THIS_YEAR", label: "This Year" },
                { id: "ALL", label: "All Historical" },
                { id: "CUSTOM", label: "Custom" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setDateFilter(opt.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  dateFilter === opt.id
                    ? "bg-brand-primary text-white shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}

            {dateFilter === "CUSTOM" && (
              <div className="flex items-center gap-1.5 ml-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>
            )}
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search batch # or barcode..."
              value={batchSearch}
              onChange={(e) => setBatchSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
            />
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Batch Status:
          </span>
          {(
            [
              { id: "ALL", label: "All Batches" },
              { id: "ACTIVE", label: "Active" },
              { id: "NEAR_EXPIRY", label: "Near Expiry (≤90d)" },
              { id: "EXPIRED", label: "Expired" },
              { id: "FULLY_SOLD", label: "Fully Sold" },
              { id: "LOW_STOCK", label: "Low Stock" },
            ] as const
          ).map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                statusFilter === st.id
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Batches Table (FEFO Sorted) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="h-4 w-4 text-brand-primary" />
            Product Batches History & Stock ({filteredBatches.length} batch{filteredBatches.length !== 1 ? "es" : ""})
          </h3>
          <span className="text-[11px] font-medium text-slate-400">
            Sorted by FEFO (Earliest Expiry First) • Click any row for deep details
          </span>
        </div>

        {filteredBatches.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Boxes className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
              No batches match the selected date or status filters.
            </p>
            <p className="text-xs mt-1">Try changing the date range to "All" or resetting filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3 px-4">Batch Number / Barcode</th>
                  <th className="py-3 px-4">Received Date</th>
                  <th className="py-3 px-4">Expiry Date (FEFO)</th>
                  <th className="py-3 px-4">Packaging Breakdown</th>
                  <th className="py-3 px-4">Purchase Price</th>
                  <th className="py-3 px-4">Selling Price</th>
                  <th className="py-3 px-4">Current Stock & Value</th>
                  <th className="py-3 px-4">Locations</th>
                  <th className="py-3 px-4 text-right">Status / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {filteredBatches.map((b) => {
                  const bPkg = calculateBatchBulkPackaging(b, b.quantity, packConfig);
                  const isExp = b.expiryDate ? new Date(b.expiryDate) < now : false;
                  const daysLeft = b.expiryDate
                    ? Math.ceil((new Date(b.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    : null;

                  const locCount = (b.locations || []).filter((l: any) => l.quantity > 0).length;
                  const batchVal = Number(b.purchasePrice || 0) * b.quantity;

                  return (
                    <tr
                      key={b.id}
                      onClick={() => onSelectBatch(b)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white text-xs group-hover:text-brand-primary transition flex items-center gap-1.5">
                          {b.batchNumber || "Unassigned"}
                          <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 text-brand-primary transition" />
                        </div>
                        {b.barcode && (
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Barcode className="h-3 w-3" />
                            {b.barcode}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {b.receivedDate
                            ? new Date(b.receivedDate).toLocaleDateString()
                            : b.createdAt
                            ? new Date(b.createdAt).toLocaleDateString()
                            : "—"}
                        </div>
                        {b.mfgDate && (
                          <div className="text-[10px] text-slate-400">
                            Mfg: {new Date(b.mfgDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {b.expiryDate ? (
                          <div>
                            <div className="font-mono font-bold">
                              {new Date(b.expiryDate).toLocaleDateString()}
                            </div>
                            {isExp ? (
                              <span className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Expired
                              </span>
                            ) : daysLeft !== null && daysLeft <= 90 ? (
                              <span className="text-[10px] text-amber-600 font-bold">
                                {daysLeft}d remaining
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {bPkg.fullCartons} Carton{bPkg.fullCartons !== 1 ? "s" : ""} • {bPkg.remainingLooseBoxes} Loose Box{bPkg.remainingLooseBoxes !== 1 ? "es" : ""}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Equiv: {bPkg.totalEquivalentBoxes} Boxes ({bPkg.totalStrips} Strips)
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        {b.purchasePrice ? `৳${Number(b.purchasePrice).toFixed(2)}` : "—"}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-brand-primary">
                        ৳{Number(b.sellingPrice).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900 dark:text-white">
                          {b.quantity.toLocaleString()} {b.unit || "tabs"}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-semibold">
                          Val: ৳{batchVal.toFixed(2)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {locCount > 0 ? `${locCount} Location${locCount !== 1 ? "s" : ""}` : "Bulk Only"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isExp ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                              Expired
                            </span>
                          ) : b.quantity <= 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              Fully Sold
                            </span>
                          ) : daysLeft !== null && daysLeft <= 90 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                              Near Expiry
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                              Active
                            </span>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectBatch(b);
                            }}
                            className="px-3 py-1 bg-brand-primary text-white rounded-lg text-xs font-bold hover:bg-brand-primary/90 transition"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
