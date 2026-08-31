"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Branch } from "@/types";
import { useAuth } from "@/context/AuthContext";
import {
  Inbox,
  Store,
  CheckCircle2,
  Loader2,
  Clock,
} from "lucide-react";

interface StockReceiveViewProps {
  onNavigate?: (module: any) => void;
}

export function StockReceiveView({ onNavigate: _onNavigate }: StockReceiveViewProps = {}) {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || "");
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [receivingId, setReceivingId] = useState<string | null>(null);

  const isBranchLocked = Boolean(
    user?.branchId && user?.role !== "COMPANY_OWNER" && user?.role !== "SUPER_ADMIN"
  );

  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetchApi("/branches");
        if (res.success && res.data && res.data.length > 0) {
          setBranches(res.data);
          if (!selectedBranchId) {
            setSelectedBranchId(user?.branchId || res.data[0].id);
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
      const res = await fetchApi("/transfers");
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

  // Filter transfers destined for selected branch
  const incomingTransfers = transfers.filter(
    (t) => !selectedBranchId || t.toBranchId === selectedBranchId
  );

  const pendingReceive = incomingTransfers.filter(
    (t) => t.status === "APPROVED" || t.status === "IN_TRANSIT"
  );

  const handleConfirmReceive = async (id: string) => {
    try {
      setReceivingId(id);
      const res = await fetchApi(`/transfers/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      if (!res.success) throw new Error(res.message || "Failed to confirm stock receipt");
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReceivingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Stock Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Stock Receive</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Inbox className="h-6 w-6 text-brand-primary" />
            Stock Receiving & Intake Confirmation Hub
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verify dispatched shipments arriving from peer branches, verify quantities, and accept units into active branch stock.
          </p>
        </div>

        {/* Branch Selector */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-xl">
          <Store className="h-4 w-4 text-slate-400" />
          <select
            disabled={isBranchLocked}
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none disabled:opacity-60"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} (Receiving Branch)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pending Requisition Cards */}
      {pendingReceive.length > 0 && (
        <div className="p-4 bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/50 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-600 flex items-center justify-center font-black">
              {pendingReceive.length}
            </div>
            <div>
              <div className="font-bold text-xs text-sky-900 dark:text-sky-200">
                Shipments Awaiting Intake Confirmation
              </div>
              <div className="text-[10px] text-sky-600 dark:text-sky-400">
                {pendingReceive.length} approved transfer(s) are ready to be credited to this branch
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Transfers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
            <p className="text-xs">Loading receiving queue...</p>
          </div>
        ) : incomingTransfers.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Inbox className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No incoming shipments for this branch</p>
            <p className="text-xs mt-1">When other branches transfer items here, they will appear in this hub.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3.5 px-4">Dispatch Date</th>
                  <th className="py-3.5 px-4">Originating Branch</th>
                  <th className="py-3.5 px-4">Medicine & Formulation</th>
                  <th className="py-3.5 px-4">Quantity to Receive</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Notes</th>
                  <th className="py-3.5 px-4 text-right">Receipt Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {incomingTransfers.map((t) => {
                  const isReadyToReceive = t.status === "APPROVED" || t.status === "IN_TRANSIT";
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {t.fromBranch?.name || "Main Branch"}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{t.product?.name}</div>
                        {t.product?.genericName && (
                          <div className="text-[10px] text-slate-400">
                            Generic: {t.product.genericName}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-black font-mono text-slate-900 dark:text-white">
                        {t.quantity} {t.product?.unit || "units"}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40"
                              : isReadyToReceive
                              ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40"
                          }`}
                        >
                          {t.status === "COMPLETED" ? "RECEIVED" : isReadyToReceive ? "READY TO RECEIVE" : t.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 text-[11px] truncate max-w-xs">
                        {t.notes || "—"}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isReadyToReceive ? (
                          <button
                            disabled={receivingId === t.id}
                            onClick={() => handleConfirmReceive(t.id)}
                            className="px-3 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-[11px] font-bold shadow-xs transition flex items-center gap-1.5 ml-auto disabled:opacity-50"
                          >
                            {receivingId === t.id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Receiving...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Accept & Receive
                              </>
                            )}
                          </button>
                        ) : t.status === "COMPLETED" ? (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 justify-end">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Received & In-Stock
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1 justify-end">
                            <Clock className="h-3 w-3" /> Awaiting Approval
                          </span>
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
    </div>
  );
}
