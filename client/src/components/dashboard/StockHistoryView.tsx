"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useBranchContext } from "@/context/BranchContext";
import { Pagination } from "@/components/common/Pagination";
import {
  History,
  Search,
  Store,
  Loader2,
  PackageCheck,
  Calendar,
  Building2,
  Boxes,
  DollarSign,
  Tag,
  Clock,
  Layers,
  Filter,
} from "lucide-react";

interface StockHistoryViewProps {
  selectedBranchId?: string;
}

type DatePreset = "ALL" | "TODAY" | "YESTERDAY" | "THIS_MONTH" | "LAST_MONTH" | "THIS_YEAR" | "CUSTOM";

export function StockHistoryView({ selectedBranchId: propBranchId }: StockHistoryViewProps = {}) {
  const { user } = useAuth();
  const {
    selectedBranchId: contextBranchId,
    currentBranch,
  } = useBranchContext();

  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("THIS_MONTH");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Helper to format date range for API requests
  const getComputedDateRange = () => {
    const now = new Date();
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    if (datePreset === "TODAY") {
      const todayStr = formatDate(now);
      return { start: todayStr, end: todayStr };
    } else if (datePreset === "YESTERDAY") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = formatDate(y);
      return { start: yStr, end: yStr };
    } else if (datePreset === "THIS_MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: formatDate(firstDay), end: formatDate(lastDay) };
    } else if (datePreset === "LAST_MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: formatDate(firstDay), end: formatDate(lastDay) };
    } else if (datePreset === "THIS_YEAR") {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      return { start: formatDate(firstDay), end: formatDate(lastDay) };
    } else if (datePreset === "CUSTOM") {
      return { start: startDate, end: endDate };
    }
    return { start: "", end: "" };
  };

  const loadReceivingHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "10");
      if (effectiveBranchId && effectiveBranchId !== "all") {
        params.append("branchId", effectiveBranchId);
      }
      if (search.trim()) params.append("search", search.trim());

      const { start, end } = getComputedDateRange();
      if (start) params.append("startDate", start);
      if (end) params.append("endDate", end);

      const res = await fetchApi(`/inventory/receiving-history?${params.toString()}`);
      if (res.success && res.data) {
        const recList = Array.isArray(res.data) ? res.data : res.data.data || [];
        setRecords(recList);
        const pag = (res as any).pagination || res.meta;
        if (pag) {
          setTotalPages(pag.totalPages || 1);
          setTotalCount(pag.total || recList.length || 0);
        } else {
          setTotalPages(Math.ceil(recList.length / 10) || 1);
          setTotalCount(recList.length);
        }
      } else {
        // Fallback to movements with type=PURCHASE
        const fallbackRes = await fetchApi(`/inventory/movements?type=PURCHASE&${params.toString()}`);
        if (fallbackRes.success && fallbackRes.data) {
          const recList = Array.isArray(fallbackRes.data) ? fallbackRes.data : fallbackRes.data.data || [];
          setRecords(recList);
          const pag = (fallbackRes as any).pagination || fallbackRes.meta;
          if (pag) {
            setTotalPages(pag.totalPages || 1);
            setTotalCount(pag.total || recList.length || 0);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load stock receiving history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceivingHistory();
  }, [page, effectiveBranchId, datePreset, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadReceivingHistory();
  };

  // KPI Calculations
  const totalEntries = records.length;
  const totalPurchaseVal = records.reduce(
    (sum, r) => sum + (Number(r.totalPurchaseValue) || 0),
    0
  );
  const totalUnitsReceived = records.reduce(
    (sum, r) => sum + (Number(r.totalQuantityUnits) || Number(r.quantity) || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Stock Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Stock History</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <PackageCheck className="h-6 w-6 text-brand-primary" />
            Stock Receiving History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Log of stock inward receipts, batch arrivals, supplier purchases, and total received quantities.
          </p>
        </div>

        {/* Active Branch Scope Badge */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 shadow-xs">
          <Store className="h-4 w-4 text-brand-primary shrink-0" />
          <span>{currentBranch?.name || (effectiveBranchId ? "Selected Branch" : "All Branches (Consolidated)")}</span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-900">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Receiving Entries</div>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {loading ? "..." : totalEntries.toLocaleString()} Records
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-900">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Units Received</div>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {loading ? "..." : `${totalUnitsReceived.toLocaleString()} Units`}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-100 dark:border-amber-900">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Purchase Value</div>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {loading ? "..." : `৳ ${totalPurchaseVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        {/* Date Presets Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
              <Calendar className="h-3.5 w-3.5 text-brand-primary" />
              Date Filter:
            </span>
            {[
              { id: "ALL", label: "All Time" },
              { id: "TODAY", label: "Today" },
              { id: "YESTERDAY", label: "Yesterday" },
              { id: "THIS_MONTH", label: "This Month" },
              { id: "LAST_MONTH", label: "Last Month" },
              { id: "THIS_YEAR", label: "This Year" },
              { id: "CUSTOM", label: "Custom Date Range" },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => setDatePreset(preset.id as DatePreset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  datePreset === preset.id
                    ? "bg-brand-primary text-white shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Pickers & Search Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search product, supplier, batch, invoice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-900 dark:text-white"
            />
          </form>

          {/* Custom Date Inputs */}
          {datePreset === "CUSTOM" && (
            <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-400 font-medium pl-1">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-400 font-medium">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stock Receiving Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
            <p className="text-xs">Loading stock receiving history...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Boxes className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
              No stock receiving records found
            </p>
            <p className="text-xs mt-1">
              Intake records from direct batch entry and supplier purchases will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4">Batch Number</th>
                  <th className="py-3.5 px-4">Received Quantity</th>
                  <th className="py-3.5 px-4">Receiving Unit</th>
                  <th className="py-3.5 px-4">Total Equivalent</th>
                  <th className="py-3.5 px-4 text-right">Purchase Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {records.map((r) => {
                  const dateStr = r.receivedDate || r.createdAt;
                  const formattedDate = dateStr
                    ? new Date(dateStr).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—";

                  const prodName = r.product?.name || "Product";
                  const genericName = r.product?.genericName;
                  const supplierName = r.supplierName || r.supplier?.name || "Direct Intake";
                  const batchNo = r.batchNumber || "No Batch";
                  const recQtyLabel = r.receivedQuantityLabel || `${r.receivedQuantity || r.quantity || 0} ${r.receivingUnit || "Units"}`;
                  const recUnit = r.receivingUnit || "Unit";
                  const totalEquiv = r.totalEquivalentLabel || `${r.totalQuantityUnits || r.quantity || 0} Units`;
                  const purchaseVal = Number(r.totalPurchaseValue || 0);

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      {/* Product */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {prodName}
                        </div>
                        {genericName && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {genericName}
                          </div>
                        )}
                      </td>

                      {/* Supplier */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold">{supplierName}</span>
                        </div>
                        {r.invoiceNo && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Inv: #{r.invoiceNo}
                          </div>
                        )}
                      </td>

                      {/* Batch */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          <Tag className="h-3 w-3 text-brand-primary" />
                          {batchNo}
                        </span>
                      </td>

                      {/* Received Quantity */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
                        {recQtyLabel}
                      </td>

                      {/* Receiving Unit */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-900">
                          {recUnit}
                        </span>
                      </td>

                      {/* Total Equivalent */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                        {totalEquiv}
                      </td>

                      {/* Purchase Value */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-slate-900 dark:text-white">
                        ৳ {purchaseVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalCount}
          pageSize={10}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
