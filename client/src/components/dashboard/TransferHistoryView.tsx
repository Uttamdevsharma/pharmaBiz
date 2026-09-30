"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { Branch } from "@/types";
import { OwnerModule } from "./DashboardSidebar";
import { DateRangeFilter, DatePreset, getComputedDateRange } from "./DateRangeFilter";
import {
  Plus,
  ArrowLeftRight,
  Eye,
  X,
  Search,
  ArrowRight,
  Truck,
  FileText,
  Inbox,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";

interface TransferHistoryViewProps {
  onNavigate: (module: OwnerModule) => void;
}

export function TransferHistoryView({ onNavigate }: TransferHistoryViewProps) {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [branchFilter, setBranchFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [datePreset, setDatePreset] = useState<DatePreset>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Details Modal
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const { start, end } = getComputedDateRange(datePreset, startDate, endDate);
      const params = new URLSearchParams();
      params.append("limit", "200");
      if (branchFilter) params.append("branchId", branchFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);
      if (start) params.append("startDate", start);
      if (end) params.append("endDate", end);

      const [tRes, bRes] = await Promise.all([
        fetchApi<any[]>(`/transfers?${params.toString()}`),
        fetchApi<Branch[]>("/branches"),
      ]);

      if (tRes.success && tRes.data) {
        setTransfers(Array.isArray(tRes.data) ? tRes.data : (tRes.data as any).data || []);
      }
      if (bRes.success && bRes.data) setBranches(bRes.data);
    } catch (err) {
      console.error("Failed to load transfer history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [datePreset, startDate, endDate, branchFilter, statusFilter]);

  const openDetailsModal = async (transfer: any) => {
    try {
      setSelectedTransfer(transfer);
      const res = await fetchApi<any>(`/transfers/${transfer.id}`);
      if (res.success && res.data) {
        setSelectedTransfer(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch transfer details", err);
    }
  };

  // Filter transfers
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      if (branchFilter && t.fromBranchId !== branchFilter && t.toBranchId !== branchFilter) {
        return false;
      }
      if (statusFilter && t.status !== statusFilter) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchId = t.id.toLowerCase().includes(q);
        const matchFrom = t.fromBranch?.name?.toLowerCase().includes(q);
        const matchTo = t.toBranch?.name?.toLowerCase().includes(q);
        const matchProd = (t.items || []).some((i: any) =>
          i.product?.name?.toLowerCase().includes(q)
        );
        if (!matchId && !matchFrom && !matchTo && !matchProd) return false;
      }
      return true;
    });
  }, [transfers, branchFilter, statusFilter, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, branchFilter, statusFilter, datePreset, startDate, endDate]);

  const totalPages = Math.ceil(filteredTransfers.length / limit) || 1;
  const paginatedTransfers = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredTransfers.slice(start, start + limit);
  }, [filteredTransfers, page, limit]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* 1. Header (Exact Standard, No Descriptions, Rounded-None) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-none">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Transfer History
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate("stock_stock_receive")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none"
          >
            <Inbox className="h-4 w-4 text-brand-primary" />
            <span>Stock Receive</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("stock_transfer_stock")}
            className="px-4 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-none text-xs sm:text-sm font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>New Transfer</span>
          </button>
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
          label="Transfer Date Filter"
        />

        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search transfer ID, branch, product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm outline-none focus:border-brand-primary dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold text-xs sm:text-sm outline-none cursor-pointer rounded-none"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold text-xs sm:text-sm outline-none cursor-pointer rounded-none"
            >
              <option value="">All Statuses</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="RECEIVED">Received</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
          Total transfers: <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredTransfers.length}</span>
        </div>
      </div>

      {/* 3. Main Table - Exact FundTransfer Typography & Spacing */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/75 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Transfer ID & Date</th>
                <th className="py-3 px-4">Route (From → To)</th>
                <th className="py-3 px-4">Items & Quantity</th>
                <th className="py-3 px-4">Dispatched Value</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="py-3 px-4">
                      <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded-none" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded-none" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded-none" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-none" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-none" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-none ml-auto" />
                    </td>
                  </tr>
                ))
              ) : paginatedTransfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                    <ArrowLeftRight className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">No transfer records found for the selected period.</p>
                  </td>
                </tr>
              ) : (
                paginatedTransfers.map((t) => {
                  const sentVal = Number(t.sentTotalValue || t.totalValue || 0);
                  const totalUnits = (t.items || []).reduce(
                    (acc: number, i: any) => acc + Number(i.sentQuantity || 0),
                    0
                  );

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                          #{t.id.slice(0, 8)}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          {new Date(t.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                          <span>{t.fromBranch?.name || "Source"}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{t.toBranch?.name || "Destination"}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {t.items?.length || 0} Product{(t.items?.length || 0) > 1 ? "s" : ""}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {totalUnits.toLocaleString()} Units Sent
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-brand-primary text-sm">
                        ৳{Math.round(sentVal).toLocaleString("en-BD")}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-bold border rounded-none uppercase ${
                            t.status === "RECEIVED"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                              : t.status === "CANCELLED"
                              ? "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700"
                              : "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-800"
                          }`}
                        >
                          {t.status === "IN_TRANSIT" ? "In Transit" : t.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openDetailsModal(t)}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-semibold transition inline-flex items-center gap-1.5"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View Details</span>
                        </button>
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

      {/* 4. Details Modal (Rounded-None) */}
      {selectedTransfer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-none w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-primary" />
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Transfer Challan & Audit #{selectedTransfer.id?.slice(0, 8)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransfer(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1 text-sm">
              {/* Route & Transport Card */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-none">
                <div>
                  <div className="text-xs uppercase font-bold text-slate-400">Route</div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                    {selectedTransfer.fromBranch?.name} → {selectedTransfer.toBranch?.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Dispatched: {new Date(selectedTransfer.createdAt).toLocaleString()}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase font-bold text-slate-400">Transport / Courier</div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                    {selectedTransfer.courierName || "Direct Handover"}
                    {selectedTransfer.trackingId && (
                      <span className="font-mono text-xs font-normal text-slate-500 ml-1">
                        (Track: {selectedTransfer.trackingId})
                      </span>
                    )}
                  </div>
                  {selectedTransfer.deliveryPersonName && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      Driver: {selectedTransfer.deliveryPersonName}{" "}
                      {selectedTransfer.deliveryPersonContact && `(${selectedTransfer.deliveryPersonContact})`}
                    </div>
                  )}
                </div>
              </div>

              {/* Itemized Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800 uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800 text-xs">
                    <tr>
                      <th className="py-2.5 px-3">Product & Batch</th>
                      <th className="py-2.5 px-3">Sent Qty</th>
                      <th className="py-2.5 px-3">Cost Price</th>
                      <th className="py-2.5 px-3">Total Value</th>
                      <th className="py-2.5 px-3">Received Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {(selectedTransfer.items || []).map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.product?.name || "Product"}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            Batch: {item.batchNumber || "DEFAULT"}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold">
                          {item.packageQuantity ? (
                            <span>
                              {item.packageQuantity} {item.packageType || "Boxes"}{" "}
                              <span className="text-xs text-slate-500 font-normal">
                                ({item.sentQuantity} units)
                              </span>
                            </span>
                          ) : (
                            <span>{item.sentQuantity} units</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          ৳{Number(item.costPrice || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-brand-primary">
                          ৳{Number(item.sentValue || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-xs sm:text-sm">
                          {selectedTransfer.status === "RECEIVED" ? (
                            <span className="text-emerald-600 font-bold">
                              Received: {item.receivedQuantity || item.sentQuantity}
                              {Number(item.damagedQuantity || 0) > 0 && (
                                <span className="text-amber-600 ml-1">
                                  ({item.damagedQuantity} damaged)
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-sky-600 font-bold">In Transit</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={() => setSelectedTransfer(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-none text-xs sm:text-sm font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
