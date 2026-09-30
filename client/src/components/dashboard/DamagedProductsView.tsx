"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import { DateRangeFilter, DatePreset, getComputedDateRange } from "./DateRangeFilter";
import {
  AlertTriangle,
  Search,
  Store,
  ArrowRight,
  RefreshCw,
  FileSpreadsheet,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { useBranchContext } from "@/context/BranchContext";

interface DamagedProductsViewProps {
  onNavigate?: (module: OwnerModule) => void;
  selectedBranchId?: string;
}

function formatQuantityWithPackaging(qty: number, item: any): string {
  const p = item.product;
  const stripsPerBox = Number(p?.stripsPerBox || 0);
  const tabletsPerStrip = Number(p?.tabletsPerStrip || 0);
  const baseUnit = (p?.unit || "tablet").toLowerCase();

  if (stripsPerBox > 1 && tabletsPerStrip > 1) {
    const boxSize = stripsPerBox * tabletsPerStrip;
    if (qty >= boxSize && qty % boxSize === 0) {
      const boxes = qty / boxSize;
      return `${boxes} Box${boxes > 1 ? "es" : ""} (${qty} ${baseUnit}s)`;
    } else if (qty >= tabletsPerStrip && qty % tabletsPerStrip === 0) {
      const strips = qty / tabletsPerStrip;
      return `${strips} Strip${strips > 1 ? "s" : ""} (${qty} ${baseUnit}s)`;
    }
    return `${qty} ${baseUnit}s`;
  }

  const pType = (item.packageType || p?.defaultPackType || baseUnit).toLowerCase();
  return `${qty} ${pType}${qty > 1 && !pType.endsWith("s") ? "s" : ""}`;
}

export function DamagedProductsView({ onNavigate, selectedBranchId: propBranchId }: DamagedProductsViewProps) {
  const {
    selectedBranchId: contextBranchId,
    currentBranch,
    isAllBranches,
  } = useBranchContext();

  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;

  const [loading, setLoading] = useState(true);
  const [damagedData, setDamagedData] = useState<any>({
    summary: {
      totalDamagedUnits: 0,
      totalMissingUnits: 0,
      totalDamagedValue: 0,
      totalMissingValue: 0,
      totalLossValue: 0,
      incidentCount: 0,
    },
    data: [],
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const loadData = async () => {
    try {
      setLoading(true);
      const { start, end } = getComputedDateRange(datePreset, startDate, endDate);
      const queryParams = new URLSearchParams();
      if (effectiveBranchId && effectiveBranchId !== "all") {
        queryParams.append("branchId", effectiveBranchId);
      }
      if (searchQuery) {
        queryParams.append("search", searchQuery);
      }
      if (start) queryParams.append("startDate", start);
      if (end) queryParams.append("endDate", end);

      const damRes: any = await fetchApi(
        `/transfers/damaged-products?${queryParams.toString()}`
      );

      if (damRes.success) {
        setDamagedData({
          summary: damRes.summary || {
            totalDamagedUnits: 0,
            totalMissingUnits: 0,
            totalDamagedValue: 0,
            totalMissingValue: 0,
            totalLossValue: 0,
            incidentCount: 0,
          },
          data: Array.isArray(damRes.data) ? damRes.data : [],
        });
      }
    } catch (err) {
      console.error("Failed to load damaged products data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [effectiveBranchId, datePreset, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const records = damagedData.data || [];

  useEffect(() => {
    setPage(1);
  }, [searchQuery, effectiveBranchId, datePreset, startDate, endDate]);

  const totalPages = Math.ceil(records.length / limit) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * limit;
    return records.slice(start, start + limit);
  }, [records, page, limit]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* 1. Header (Exact Standard, No Descriptions, Rounded-None) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-none">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Damaged Products
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-none text-xs font-bold transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("stock_transfer_history")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none"
            >
              <FileSpreadsheet className="h-4 w-4 text-brand-primary" />
              <span>Transfer Ledger</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Filter Bar - Exact FundTransfer Standard (Rounded-None) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 rounded-none space-y-3">
        <DateRangeFilter
          datePreset={datePreset}
          setDatePreset={setDatePreset}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          label="Damage Record Date Filter"
        />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search medication, generic, batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm outline-none focus:border-brand-primary dark:text-white"
            />
          </form>

          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-none">
            <Store className="h-4 w-4 text-amber-500" />
            <span>Scope:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {isAllBranches ? "All Branches" : (currentBranch?.name || "Selected Branch")}
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
          Total incidents: <span className="font-semibold text-slate-800 dark:text-slate-200">{records.length}</span>
        </div>
      </div>

      {/* 3. Main Table - Exact FundTransfer Typography & Spacing */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/75 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Medication & Batch</th>
                <th className="py-3 px-4">Route (From → To)</th>
                <th className="py-3 px-4">Damaged / Missing Qty</th>
                <th className="py-3 px-4">Cost Price</th>
                <th className="py-3 px-4">Total Loss Value</th>
                <th className="py-3 px-4 text-right">Transfer Ref & Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="py-3 px-4">
                      <div className="space-y-1.5">
                        <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded-none" />
                        <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded-none" />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded-none" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded-none" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded-none" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-none" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded-none ml-auto" />
                    </td>
                  </tr>
                ))
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">No damaged or missing items recorded for this period.</p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item: any, idx: number) => {
                  const hasDamage = Number(item.damagedQuantity || 0) > 0;
                  const hasMissing = Number(item.missingQuantity || 0) > 0;
                  const totalLossVal = Number(item.totalLossValue || 0);

                  return (
                    <tr key={`${item.transferId}-${item.productId}-${idx}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.product?.name || "Product"}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          Batch: {item.batchNumber || "DEFAULT"}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                          <span>{item.fromBranch?.name || "Source"}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{item.toBranch?.name || "Dest"}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {hasDamage && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 rounded-none text-xs font-semibold">
                              {formatQuantityWithPackaging(item.damagedQuantity, item)} Damaged
                            </span>
                          )}
                          {hasMissing && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 rounded-none text-xs font-semibold">
                              {formatQuantityWithPackaging(item.missingQuantity, item)} Missing
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 text-sm">
                        ৳{Number(item.costPrice || 0).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                        ৳{totalLossVal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-bold text-brand-primary text-sm">
                          #{item.transferId?.slice(0, 8)}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          {new Date(item.receivedAt || item.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer - Exact FundTransfer Standard */}
        {!loading && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/75 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-xs sm:text-sm">
            <div className="text-slate-500">
              Page <span className="font-semibold text-slate-800 dark:text-slate-200">{page}</span> of{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Rows per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs rounded-none outline-none text-slate-700 dark:text-slate-200"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={page <= 1}
                  className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer disabled:cursor-not-allowed"
                  title="First Page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer disabled:cursor-not-allowed"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer disabled:cursor-not-allowed"
                  title="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                  className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer disabled:cursor-not-allowed"
                  title="Last Page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
