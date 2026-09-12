"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Branch } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { OwnerModule } from "./DashboardSidebar";
import { DateRangeFilter, DatePreset, getComputedDateRange } from "./DateRangeFilter";
import { Pagination } from "@/components/common/Pagination";
import {
  FileSpreadsheet,
  Plus,
  ArrowLeftRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  Store,
  DollarSign,
  Package,
  Calendar,
  Layers,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Truck,
  Phone,
  MapPin,
  User,
  FileText,
  Building,
} from "lucide-react";

interface TransferHistoryViewProps {
  onNavigate: (module: OwnerModule) => void;
}

export function TransferHistoryView({ onNavigate }: TransferHistoryViewProps) {
  const { user } = useAuth();
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
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Details Modal State
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const { start, end } = getComputedDateRange(datePreset, startDate, endDate);
      const params = new URLSearchParams();
      params.append("limit", "100");
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
      setDetailsLoading(true);
      setSelectedTransfer(transfer);
      const res = await fetchApi<any>(`/transfers/${transfer.id}`);
      if (res.success && res.data) {
        setSelectedTransfer(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch transfer details", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Filter transfers
  const filteredTransfers = transfers.filter((t) => {
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

  useEffect(() => {
    setPage(1);
  }, [searchQuery, branchFilter, statusFilter, datePreset, startDate, endDate]);

  const totalPages = Math.ceil(filteredTransfers.length / pageSize) || 1;
  const paginatedTransfers = filteredTransfers.slice((page - 1) * pageSize, page * pageSize);

  // Ledger Summary Totals
  const totalTransfersCount = transfers.length;
  const totalSentValue = transfers.reduce(
    (acc, t) => acc + Number(t.sentTotalValue || t.totalValue || 0),
    0
  );
  const totalReceivedValue = transfers.reduce(
    (acc, t) => acc + Number(t.receivedTotalValue || 0),
    0
  );
  const totalDamageLossValue = transfers.reduce(
    (acc, t) => acc + Number(t.damagedTotalValue || 0) + Number(t.missingTotalValue || 0),
    0
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Stock Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Transfer History & Ledger</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileSpreadsheet className="h-6 w-6 text-brand-primary" />
            <span>Inter-Branch Stock Transfers Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit logs for outgoing & incoming stock transfers, usable received values, and transit damage/loss valuations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("stock_stock_receive")}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
          >
            Stock Receive Hub
          </button>
          <button
            onClick={() => onNavigate("stock_transfer_stock")}
            className="px-4 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Transfer Request</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
            <span>Total Transfers</span>
            <ArrowLeftRight className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {totalTransfersCount}
          </div>
          <div className="text-[10px] text-slate-500">Across all branch network</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
            <span>Dispatched Cost Valuation</span>
            <DollarSign className="h-4 w-4 text-brand-primary" />
          </div>
          <div className="text-2xl font-black text-brand-primary font-mono">
            ৳{totalSentValue.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500">Total purchase/cost price</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
            <span>Usable Received Stock Value</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            ৳{totalReceivedValue.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500">Credited to destination inventories</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center justify-between">
            <span>Damage & Loss Valuation</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            ৳{totalDamageLossValue.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500">Recorded transit loss</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
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
          <div className="relative w-full md:w-72">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search transfer ID, branch, product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs outline-none cursor-pointer"
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
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs outline-none cursor-pointer"
            >
              <option value="">All Transfer Status</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="RECEIVED">Received & Inspected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transfers Ledger Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
            <span>Loading transfer transactions...</span>
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            <ArrowLeftRight className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No stock transfers recorded</p>
            <p className="mt-0.5">Click "New Transfer Request" above to initiate a transfer between branches.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Transfer Date</th>
                  <th className="py-3.5 px-4">From → To Branch</th>
                  <th className="py-3.5 px-4">Medications Included</th>
                  <th className="py-3.5 px-4">Sent Value</th>
                  <th className="py-3.5 px-4">Received Usable Value</th>
                  <th className="py-3.5 px-4">Transit Loss</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {paginatedTransfers.map((t) => {
                  const sentVal = Number(t.sentTotalValue || t.totalValue || 0);
                  const receivedVal = Number(t.receivedTotalValue || 0);
                  const lossVal = Number(t.damagedTotalValue || 0) + Number(t.missingTotalValue || 0);

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{t.fromBranch?.name || "Main Branch"}</span>
                          <span className="text-slate-400">→</span>
                          <span className="text-brand-primary">{t.toBranch?.name}</span>
                        </div>
                        {(t.courierName || t.trackingId) && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              <Truck className="h-2.5 w-2.5 text-indigo-500" />
                              <span>{t.courierName || "Courier"}</span>
                              {t.trackingId && <span className="font-mono text-slate-500">#{t.trackingId}</span>}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {(t.items || []).length} medication batch(es)
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">
                          {(t.items || []).map((i: any) => i.product?.name).filter(Boolean).join(", ") || "—"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-black font-mono text-slate-900 dark:text-white">
                        ৳{sentVal.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 font-black font-mono text-emerald-600">
                        {t.status === "RECEIVED" || t.status === "COMPLETED" ? `৳${receivedVal.toFixed(2)}` : "—"}
                      </td>

                      <td className="py-3.5 px-4">
                        {lossVal > 0 ? (
                          <span className="font-black font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span>৳{lossVal.toFixed(2)}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">৳0.00</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === "COMPLETED" || t.status === "RECEIVED"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : t.status === "IN_TRANSIT"
                              ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 animate-pulse"
                              : t.status === "CANCELLED"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {t.status === "IN_TRANSIT" ? "IN TRANSIT" : t.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openDetailsModal(t)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs"
                        >
                          Details
                        </button>
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
          totalItems={filteredTransfers.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      {/* Transfer Details Modal */}
      {selectedTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-4xl w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Package className="h-5 w-5 text-brand-primary" />
                  <span>Transfer #{selectedTransfer.id.substring(0, 8)} Audit Details</span>
                </h3>
                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                  <span>
                    <strong>From:</strong> {selectedTransfer.fromBranch?.name}
                  </span>
                  <span>→</span>
                  <span>
                    <strong>To:</strong> {selectedTransfer.toBranch?.name}
                  </span>
                  <span>|</span>
                  <span>
                    <strong>Date:</strong> {new Date(selectedTransfer.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTransfer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total Sent Cost Value</div>
                <div className="text-lg font-black font-mono text-slate-900 dark:text-white">
                  ৳{Number(selectedTransfer.sentTotalValue || selectedTransfer.totalValue || 0).toFixed(2)}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                  Received Usable Value
                </div>
                <div className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-200">
                  ৳{Number(selectedTransfer.receivedTotalValue || 0).toFixed(2)}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1">
                <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                  Damage & Loss Value
                </div>
                <div className="text-lg font-black font-mono text-amber-700 dark:text-amber-200">
                  ৳{(Number(selectedTransfer.damagedTotalValue || 0) + Number(selectedTransfer.missingTotalValue || 0)).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Professional Courier & Dispatch Logistics Details */}
            <div className="p-4.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200">
                <span className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Courier & Delivery Logistics</span>
                </span>
                <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                  ID: #{selectedTransfer.id?.substring(0, 8)?.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Courier / Delivery Company</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-bold">
                    {selectedTransfer.courierName || "Internal / Self Delivery"}
                  </strong>
                  {selectedTransfer.courierHub && (
                    <div className="text-[10px] text-slate-400">Hub: {selectedTransfer.courierHub}</div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Waybill / Tracking ID</span>
                  <strong className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                    {selectedTransfer.trackingId || "N/A"}
                  </strong>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Delivery Rider & Contact</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-bold block">
                    {selectedTransfer.deliveryPersonName || "Unassigned"}
                  </strong>
                  {selectedTransfer.deliveryPersonContact && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      📞 {selectedTransfer.deliveryPersonContact}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Dispatch Date & Time</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-medium block">
                    {selectedTransfer.dispatchDate
                      ? new Date(selectedTransfer.dispatchDate).toLocaleString()
                      : new Date(selectedTransfer.createdAt).toLocaleString()}
                  </strong>
                </div>
              </div>

              {(selectedTransfer.deliveryNote || selectedTransfer.notes) && (
                <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40 text-[11px]">
                  <span className="text-slate-400">Delivery Instructions / Notes: </span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {selectedTransfer.deliveryNote || selectedTransfer.notes}
                  </span>
                </div>
              )}
            </div>

            {/* Product items table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 font-bold text-xs text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                Itemized Medication Batches & Stock Breakdown
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 dark:bg-slate-800/30 font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-2">Batch</th>
                    <th className="py-2.5 px-2">Pack Unit</th>
                    <th className="py-2.5 px-2 text-center">Sent</th>
                    <th className="py-2.5 px-2 text-center text-emerald-600">Received</th>
                    <th className="py-2.5 px-2 text-center text-amber-600">Damaged</th>
                    <th className="py-2.5 px-2 text-center text-rose-600">Missing</th>
                    <th className="py-2.5 px-3 text-right">Cost Price (৳)</th>
                    <th className="py-2.5 px-3 text-right">Received Value (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {(selectedTransfer.items || []).map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.product?.name || "Product"}
                        </div>
                        {item.product?.genericName && (
                          <div className="text-[10px] text-slate-400">{item.product.genericName}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-[11px] text-slate-500">
                        {item.batchNumber || "Default"}
                      </td>
                      <td className="py-2.5 px-2 font-bold text-[11px] text-slate-600 dark:text-slate-400">
                        {item.packageType || "PIECE"}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-900 dark:text-white">
                        {item.sentQuantity || item.quantity}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-emerald-600">
                        {item.receivedQuantity || 0}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-amber-600">
                        {item.damagedQuantity || 0}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-rose-600">
                        {item.missingQuantity || 0}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        ৳{Number(item.costPrice || item.unitPrice || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black font-mono text-emerald-600">
                        ৳{Number(item.receivedValue || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedTransfer(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
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
