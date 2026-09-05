"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Branch } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { OwnerModule } from "./DashboardSidebar";
import {
  Inbox,
  Store,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PackageCheck,
  AlertTriangle,
  ArrowRight,
  Layers,
  RefreshCw,
  Search,
  Filter,
  FileSpreadsheet,
  Plus,
  Truck,
  X,
  Building,
  Phone,
  User,
  Clock,
  FileText,
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
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi<any[]>("/transfers?limit=100");
      if (res.success && res.data) {
        setTransfers(res.data);
      }
    } catch (err) {
      console.error("Failed to load incoming transfers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter transfers for the selected receiving branch
  const incomingTransfers = transfers.filter((t) => {
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

  const pendingReceive = incomingTransfers.filter(
    (t) => t.status === "IN_TRANSIT" || t.status === "PENDING" || t.status === "APPROVED"
  );

  const handleStartInspection = (transferId: string) => {
    if (onInspectTransfer) {
      onInspectTransfer(transferId);
    } else if (onNavigate) {
      onNavigate("stock_inspection");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Stock Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Stock Receive Hub</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Inbox className="h-6 w-6 text-brand-primary" />
            <span>Stock Receiving & History</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Inspect and receive incoming stock shipments from peer branches with real batch and cost price verification.
          </p>
        </div>

        {/* Branch Selector & Fast Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-2xl">
            <Store className="h-4 w-4 text-slate-400" />
            <select
              disabled={isBranchLocked}
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer disabled:opacity-60"
            >
              <option value="">All Receiving Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} (Receiving Branch)
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Pending Incoming Alert Banner */}
      {pendingReceive.length > 0 && (
        <div className="p-5 bg-sky-500/10 border border-sky-500/30 text-sky-900 dark:text-sky-200 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-sky-500/20 text-sky-600 dark:text-sky-300 flex items-center justify-center font-black text-lg shrink-0">
              {pendingReceive.length}
            </div>
            <div>
              <div className="font-black text-sm text-sky-950 dark:text-sky-100">
                Shipments Awaiting Intake Verification
              </div>
              <p className="text-xs text-sky-800 dark:text-sky-300/80 mt-0.5">
                {pendingReceive.length} shipment(s) dispatched to this branch require physical inspection and intake verification before stock is credited.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search transfer ID, source branch, product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs outline-none cursor-pointer w-full sm:w-auto"
          >
            <option value="">All Statuses</option>
            <option value="IN_TRANSIT">In Transit / Awaiting Intake</option>
            <option value="RECEIVED">Received & Inspected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Incoming Transfers & History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
            <Loader2 className="h-7 w-7 animate-spin text-brand-primary" />
            <span>Loading receiving history...</span>
          </div>
        ) : incomingTransfers.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs space-y-2">
            <Inbox className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No shipments found in history for this branch
            </p>
            <p className="text-xs">
              When peer branches dispatch stock to this location, they will appear here ready for inspection.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                <tr>
                  <th className="py-4 px-4">Transfer Date</th>
                  <th className="py-4 px-4">Source Branch</th>
                  <th className="py-4 px-4">Destination Branch</th>
                  <th className="py-4 px-4">Products Included</th>
                  <th className="py-4 px-4">Sent Cost Value</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4 text-right">Intake Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {incomingTransfers.map((t) => {
                  const isAwaitingReceive =
                    t.status === "IN_TRANSIT" || t.status === "PENDING" || t.status === "APPROVED";
                  const sentValue = Number(t.sentTotalValue || t.totalValue || 0);

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-4 px-4 font-mono text-slate-500 text-[11px]">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>

                      <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                        <div>{t.fromBranch?.name || "Source Branch"}</div>
                        {(t.courierName || t.trackingId || t.deliveryPersonName) && (
                          <button
                            type="button"
                            onClick={() => setSelectedCourierTransfer(t)}
                            className="flex items-center gap-1 mt-1 text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 px-2 py-0.5 rounded-md font-medium transition cursor-pointer"
                            title="Click to view full Courier Details"
                          >
                            <Truck className="h-3 w-3 text-indigo-500 shrink-0" />
                            <span className="font-bold">{t.courierName || "Courier"}</span>
                            {t.courierHub && <span className="text-slate-400">({t.courierHub})</span>}
                            {t.trackingId && <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">#{t.trackingId}</span>}
                          </button>
                        )}
                      </td>

                      <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                        {t.toBranch?.name || "Destination Branch"}
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {(t.items || []).length} medication batch(es)
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">
                          {(t.items || []).map((i: any) => i.product?.name).filter(Boolean).join(", ") || "View details"}
                        </div>
                      </td>

                      <td className="py-4 px-4 font-black font-mono text-brand-primary text-sm">
                        ৳{sentValue.toFixed(2)}
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${
                            t.status === "RECEIVED" || t.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : isAwaitingReceive
                              ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 animate-pulse"
                              : "bg-slate-500/10 text-slate-500"
                          }`}
                        >
                          {t.status === "IN_TRANSIT" ? "IN TRANSIT" : t.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        {isAwaitingReceive ? (
                          <button
                            type="button"
                            onClick={() => handleStartInspection(t.id)}
                            className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <PackageCheck className="h-3.5 w-3.5" />
                            <span>Verify & Receive</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onNavigate && onNavigate("stock_transfer_history")}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                          >
                            Inspected / Ledger
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Courier Logistics Modal */}
      {selectedCourierTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-xl w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                <Truck className="h-5 w-5" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Courier Logistics & Consignment Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCourierTransfer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* System Generated / Linked Info */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Transfer Reference ID:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  #{selectedCourierTransfer.id?.substring(0, 8)?.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Source Branch:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedCourierTransfer.fromBranch?.name || "Main Branch"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Destination Branch:</span>
                <span className="font-bold text-brand-primary">
                  {selectedCourierTransfer.toBranch?.name}
                </span>
              </div>
            </div>

            {/* Courier Information Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase">
                  <Building className="h-3 w-3 text-indigo-500" />
                  <span>Courier / Company</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  {selectedCourierTransfer.courierName || "Internal / Self Delivery"}
                </div>
                {selectedCourierTransfer.courierHub && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Hub/Branch: <strong className="text-slate-700 dark:text-slate-300">{selectedCourierTransfer.courierHub}</strong>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase">
                  <FileText className="h-3 w-3 text-indigo-500" />
                  <span>Tracking / Waybill ID</span>
                </div>
                <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                  {selectedCourierTransfer.trackingId || "N/A"}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase">
                  <User className="h-3 w-3 text-indigo-500" />
                  <span>Delivery Person / Rider</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {selectedCourierTransfer.deliveryPersonName || "Unassigned"}
                </div>
                {selectedCourierTransfer.deliveryPersonContact && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                    <Phone className="h-3 w-3 text-slate-400" />
                    <span>{selectedCourierTransfer.deliveryPersonContact}</span>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase">
                  <Clock className="h-3 w-3 text-indigo-500" />
                  <span>Dispatch Date & Time</span>
                </div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedCourierTransfer.dispatchDate
                    ? new Date(selectedCourierTransfer.dispatchDate).toLocaleString()
                    : new Date(selectedCourierTransfer.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            {(selectedCourierTransfer.deliveryNote || selectedCourierTransfer.notes) && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Delivery & Handling Note</div>
                <p className="text-slate-700 dark:text-slate-300 font-medium italic">
                  "{selectedCourierTransfer.deliveryNote || selectedCourierTransfer.notes}"
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const id = selectedCourierTransfer.id;
                  setSelectedCourierTransfer(null);
                  handleStartInspection(id);
                }}
                className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <PackageCheck className="h-4 w-4" />
                <span>Proceed to Inspection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
