"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { Branch } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { OwnerModule } from "./DashboardSidebar";
import { DateRangeFilter, DatePreset, getComputedDateRange } from "./DateRangeFilter";
import {
  Inbox,
  Store,
  PackageCheck,
  RefreshCw,
  Search,
  Truck,
  X,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";

interface StockReceiveViewProps {
  onNavigate?: (module: OwnerModule) => void;
  onInspectTransfer?: (transferId: string) => void;
}

export function StockReceiveView({ onNavigate, onInspectTransfer }: StockReceiveViewProps) {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || "");
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedCourierTransfer, setSelectedCourierTransfer] = useState<any | null>(null);

  const [datePreset, setDatePreset] = useState<DatePreset>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const isBranchLocked = Boolean(
    user?.branchId && user?.role !== "COMPANY_OWNER" && user?.role !== "SUPER_ADMIN"
  );

  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetchApi<Branch[]>("/branches");
        if (res.success && res.data && res.data.length > 0) {
          const active = res.data.filter((b) => b.isActive !== false);
          setBranches(active);
          if (!selectedBranchId) {
            setSelectedBranchId(user?.branchId || active[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load branches", err);
      }
    }
    loadBranches();
  }, [user?.branchId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { start, end } = getComputedDateRange(datePreset, startDate, endDate);
      const params = new URLSearchParams();
      params.append("limit", "200");
      if (selectedBranchId) params.append("branchId", selectedBranchId);
      if (statusFilter) params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);
      if (start) params.append("startDate", start);
      if (end) params.append("endDate", end);

      const res = await fetchApi<any[]>(`/transfers?${params.toString()}`);
      if (res.success && res.data) {
        setTransfers(Array.isArray(res.data) ? res.data : (res.data as any).data || []);
      }
    } catch (err) {
      console.error("Failed to load incoming transfers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId, datePreset, startDate, endDate, statusFilter]);

  // Filter transfers for the selected receiving branch
  const incomingTransfers = useMemo(() => {
    return transfers.filter((t) => {
      if (selectedBranchId && t.toBranchId !== selectedBranchId) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchId = (t.id || "").toLowerCase().includes(q);
        const matchFrom = (t.fromBranch?.name || "").toLowerCase().includes(q);
        const matchItems = (t.items || []).some(
          (i: any) =>
            (i.product?.name || "").toLowerCase().includes(q) ||
            (i.product?.genericName || "").toLowerCase().includes(q)
        );
        if (!matchId && !matchFrom && !matchItems) return false;
      }
      return true;
    });
  }, [transfers, selectedBranchId, statusFilter, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedBranchId, statusFilter, datePreset, startDate, endDate]);

  const totalPages = Math.ceil(incomingTransfers.length / limit) || 1;
  const paginatedTransfers = useMemo(() => {
    const start = (page - 1) * limit;
    return incomingTransfers.slice(start, start + limit);
  }, [incomingTransfers, page, limit]);

  const handleStartInspection = (transferId: string) => {
    if (onInspectTransfer) {
      onInspectTransfer(transferId);
    } else if (onNavigate) {
      onNavigate("stock_inspection");
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* 1. Header (Exact Standard, No Descriptions, Rounded-None) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-none">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Stock Receive
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Receiving Branch Selector */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-none text-xs sm:text-sm">
            <Store className="h-4 w-4 text-slate-400" />
            <span className="font-semibold text-slate-500">Receiving At:</span>
            <select
              disabled={isBranchLocked}
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent font-bold text-slate-900 dark:text-white outline-none cursor-pointer disabled:opacity-60"
            >
              <option value="">All Receiving Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-none text-xs font-bold transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
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
          label="Receiving Date Filter"
        />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search transfer ID, sender branch, product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm outline-none focus:border-brand-primary dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold text-xs sm:text-sm outline-none cursor-pointer rounded-none"
            >
              <option value="">All Statuses</option>
              <option value="IN_TRANSIT">In Transit / Awaiting Intake</option>
              <option value="RECEIVED">Received & Inspected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
          Total incoming shipments: <span className="font-semibold text-slate-800 dark:text-slate-200">{incomingTransfers.length}</span>
        </div>
      </div>

      {/* 3. Main Table - Exact FundTransfer Typography & Spacing */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/75 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Transfer ID & Date</th>
                <th className="py-3 px-4">Sender Branch</th>
                <th className="py-3 px-4">Logistics / Courier</th>
                <th className="py-3 px-4">Products & Sent Value</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Intake Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="py-3 px-4">
                      <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded-none" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded-none" />
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
                      <div className="h-8 w-28 bg-slate-200 dark:bg-slate-700 rounded-none ml-auto" />
                    </td>
                  </tr>
                ))
              ) : paginatedTransfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                    <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">No incoming shipments found for this branch.</p>
                  </td>
                </tr>
              ) : (
                paginatedTransfers.map((t) => {
                  const isAwaitingReceive = t.status === "IN_TRANSIT" || t.status === "PENDING";
                  const sentVal = Number(t.sentTotalValue || t.totalValue || 0);

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

                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {t.fromBranch?.name || "Main Branch"}
                      </td>

                      <td className="py-3 px-4">
                        {t.courierName || t.trackingId ? (
                          <button
                            type="button"
                            onClick={() => setSelectedCourierTransfer(t)}
                            className="font-semibold text-brand-primary hover:underline text-left inline-flex items-center gap-1.5"
                          >
                            <Truck className="h-3.5 w-3.5" />
                            <span>{t.courierName || "Courier"}</span>
                            {t.trackingId && <span className="font-mono text-xs">({t.trackingId})</span>}
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">Direct Transfer</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {t.items?.length || 0} Item{(t.items?.length || 0) > 1 ? "s" : ""}
                        </div>
                        <div className="font-mono text-xs text-brand-primary mt-0.5 font-bold">
                          ৳{Math.round(sentVal).toLocaleString("en-BD")}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-bold border rounded-none uppercase ${
                            t.status === "RECEIVED" || t.status === "COMPLETED"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                              : isAwaitingReceive
                              ? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-800"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {t.status === "IN_TRANSIT" ? "In Transit" : t.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isAwaitingReceive ? (
                          <button
                            type="button"
                            onClick={() => handleStartInspection(t.id)}
                            className="px-3.5 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-none text-xs sm:text-sm font-semibold transition inline-flex items-center gap-1.5 shadow-xs"
                          >
                            <PackageCheck className="h-4 w-4" />
                            <span>Verify & Receive</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onNavigate && onNavigate("stock_transfer_history")}
                            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm font-semibold transition"
                          >
                            View Ledger
                          </button>
                        )}
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

      {/* 4. Courier Details Modal (Rounded-None) */}
      {selectedCourierTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-none w-full max-w-md shadow-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-brand-primary" />
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Consignment & Logistics Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCourierTransfer(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-none text-xs sm:text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Transfer ID:</span>
                <span className="font-mono font-bold">#{selectedCourierTransfer.id?.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">From Branch:</span>
                <span className="font-semibold">{selectedCourierTransfer.fromBranch?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">To Branch:</span>
                <span className="font-bold text-brand-primary">{selectedCourierTransfer.toBranch?.name}</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Courier / Service:</span>
                <span className="font-bold">{selectedCourierTransfer.courierName || "Internal Courier"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Waybill / Tracking:</span>
                <span className="font-mono font-bold text-brand-primary">{selectedCourierTransfer.trackingId || "N/A"}</span>
              </div>
              {selectedCourierTransfer.deliveryPersonName && (
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Driver / Contact:</span>
                  <span className="font-semibold">
                    {selectedCourierTransfer.deliveryPersonName} ({selectedCourierTransfer.deliveryPersonContact || "N/A"})
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCourierTransfer(null)}
                className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-none text-xs sm:text-sm font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
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
