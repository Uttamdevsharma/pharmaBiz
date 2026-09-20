"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useBranchContext } from "@/context/BranchContext";
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
  const [pageSize, setPageSize] = useState(10);
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
      params.append("limit", pageSize.toString());
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
          setTotalPages(pag.totalPages || Math.ceil((pag.total || recList.length) / pageSize) || 1);
          setTotalCount(pag.total !== undefined ? pag.total : recList.length);
        } else {
          setTotalPages(Math.ceil(recList.length / pageSize) || 1);
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
            setTotalPages(pag.totalPages || Math.ceil((pag.total || recList.length) / pageSize) || 1);
            setTotalCount(pag.total !== undefined ? pag.total : recList.length);
          } else {
            setTotalPages(Math.ceil(recList.length / pageSize) || 1);
            setTotalCount(recList.length);
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
  }, [page, pageSize, effectiveBranchId, datePreset, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadReceivingHistory();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Stock Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Stock History</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <PackageCheck className="h-7 w-7 text-brand-primary" />
            Stock History
          </h2>
        </div>

        {/* Active Branch Scope Badge */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
          <Store className="h-4 w-4 text-brand-primary shrink-0" />
          <span>{currentBranch?.name || (effectiveBranchId ? "Selected Branch" : "All Branches")}</span>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        {/* Date Presets Bar */}
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          {[
            { id: "ALL", label: "All Time" },
            { id: "TODAY", label: "Today" },
            { id: "YESTERDAY", label: "Yesterday" },
            { id: "THIS_MONTH", label: "This Month" },
            { id: "LAST_MONTH", label: "Last Month" },
            { id: "THIS_YEAR", label: "This Year" },
            { id: "CUSTOM", label: "Custom Date" },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setDatePreset(preset.id as DatePreset);
                setPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                datePreset === preset.id
                  ? "bg-brand-primary text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Date Inputs */}
        {datePreset === "CUSTOM" && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-slate-500 font-bold">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-brand-primary"
              />
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-slate-500 font-bold">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-brand-primary"
              />
            </div>
          </div>
        )}

        {/* Search Row */}
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search product, supplier, batch, invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition"
          />
        </form>
      </div>

      {/* Stock Receiving Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
            <p className="text-xs sm:text-sm font-semibold">Loading stock history...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Boxes className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300">
              No stock history records found
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Stock intake and purchase receipt logs will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-4 px-4 font-bold">Date & Time</th>
                  <th className="py-4 px-4 font-bold">Product</th>
                  <th className="py-4 px-4 font-bold">Batch #</th>
                  <th className="py-4 px-4 font-bold">Supplier / Source</th>
                  <th className="py-4 px-4 font-bold">Received Quantity</th>
                  <th className="py-4 px-4 font-bold text-right">Purchase Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.map((r) => {
                  const dateStr = r.receivedDate || r.createdAt;
                  const formattedDate = dateStr
                    ? new Date(dateStr).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—";

                  const prodName = r.product?.name || "Product";
                  const genericName = r.product?.genericName;
                  const supplierName = r.supplierName || r.supplier?.name || "Direct Intake";
                  const batchNo = r.batchNumber || "—";
                  const recQtyLabel = r.receivedQuantityLabel || `${r.receivedQuantity || r.quantity || 0} ${r.receivingUnit || "Units"}`;
                  const totalEquiv = r.totalEquivalentLabel || (r.totalQuantityUnits ? `${r.totalQuantityUnits} Units` : null);
                  const purchaseVal = Number(r.totalPurchaseValue || 0);

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* Date & Time */}
                      <td className="py-4 px-4 whitespace-nowrap font-mono text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        {formattedDate}
                      </td>

                      {/* Product */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {prodName}
                        </div>
                        {genericName && (
                          <div className="text-xs text-slate-400 mt-0.5 font-medium">
                            {genericName}
                          </div>
                        )}
                      </td>

                      {/* Batch # */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          <Tag className="h-3 w-3 text-brand-primary" />
                          {batchNo}
                        </span>
                      </td>

                      {/* Supplier / Source */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{supplierName}</span>
                        </div>
                        {r.invoiceNo && (
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            Inv #{r.invoiceNo}
                          </div>
                        )}
                      </td>

                      {/* Received Quantity */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-black text-xs sm:text-sm text-brand-primary">
                          {recQtyLabel}
                        </div>
                        {totalEquiv && totalEquiv !== recQtyLabel && (
                          <div className="text-xs text-slate-400 font-semibold mt-0.5">
                            ({totalEquiv})
                          </div>
                        )}
                      </td>

                      {/* Purchase Value */}
                      <td className="py-4 px-4 text-right whitespace-nowrap font-mono font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                        ৳ {purchaseVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Always-Visible Pagination Controls */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="ml-2 font-medium text-slate-600 dark:text-slate-400">
              Showing{" "}
              <strong className="text-slate-900 dark:text-white">
                {(totalCount || records.length) === 0 ? 0 : (page - 1) * pageSize + 1}
              </strong>{" "}
              to{" "}
              <strong className="text-slate-900 dark:text-white">
                {Math.min(page * pageSize, totalCount || records.length)}
              </strong>{" "}
              of{" "}
              <strong className="text-slate-900 dark:text-white">{totalCount || records.length}</strong> records
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={page <= 1}
              title="First Page"
              className="h-8 w-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-8 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <div className="px-2.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              Page <span className="text-brand-primary font-black">{page}</span> of{" "}
              <span className="font-bold">{Math.max(1, totalPages || Math.ceil((totalCount || records.length) / pageSize))}</span>
            </div>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(Math.max(1, totalPages || Math.ceil((totalCount || records.length) / pageSize)), p + 1))}
              disabled={page >= Math.max(1, totalPages || Math.ceil((totalCount || records.length) / pageSize))}
              className="h-8 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage(Math.max(1, totalPages || Math.ceil((totalCount || records.length) / pageSize)))}
              disabled={page >= Math.max(1, totalPages || Math.ceil((totalCount || records.length) / pageSize))}
              title="Last Page"
              className="h-8 w-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
