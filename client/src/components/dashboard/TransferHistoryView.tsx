"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import {
  FileSpreadsheet,
  Plus,
  ArrowLeftRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";

interface TransferHistoryViewProps {
  onNavigate: (module: any) => void;
}

export function TransferHistoryView({ onNavigate }: TransferHistoryViewProps) {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi("/transfers");
      if (res.success && res.data) setTransfers(res.data);
    } catch (err) {
      console.error("Failed to load transfer logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (id: string, status: "APPROVED" | "REJECTED" | "COMPLETED") => {
    try {
      const res = await fetchApi(`/transfers/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      if (!res.success) throw new Error(res.message || "Failed to update transfer status");
      loadData();
    } catch (err: any) {
      alert(err.message);
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
            <span className="text-brand-primary font-bold">Transfer History</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-brand-primary" />
            Inter-Branch Stock Transfers Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit logs for all outgoing and incoming stock transfers, approvals, and courier status across branch network.
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
            className="px-4 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Transfer Request
          </button>
        </div>
      </div>

      {/* Transfers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
            <p className="text-xs">Loading transfer transactions...</p>
          </div>
        ) : transfers.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <ArrowLeftRight className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No stock transfers recorded</p>
            <p className="text-xs mt-1">Click "New Transfer Request" above to transfer stock between branches.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">From Branch → To Branch</th>
                  <th className="py-3.5 px-4">Medicine & Formulation</th>
                  <th className="py-3.5 px-4">Quantity</th>
                  <th className="py-3.5 px-4">Transfer Status</th>
                  <th className="py-3.5 px-4">Notes</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {transfers.map((t) => {
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{t.fromBranch?.name || "Main Branch"}</span>
                          <span className="text-slate-400">→</span>
                          <span className="text-brand-primary">{t.toBranch?.name}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {t.product?.name || "Product"}
                        </div>
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
                              : t.status === "APPROVED" || t.status === "IN_TRANSIT"
                              ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40"
                              : t.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 text-[11px] truncate max-w-xs">
                        {t.notes || "—"}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(t.id, "APPROVED")}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 rounded-lg text-[10px] font-bold"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(t.id, "REJECTED")}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 rounded-lg text-[10px] font-bold"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {t.status === "APPROVED" && (
                            <button
                              onClick={() => handleUpdateStatus(t.id, "COMPLETED")}
                              className="px-2 py-1 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg text-[10px] font-bold"
                            >
                              Receive Stock
                            </button>
                          )}
                          {t.status === "COMPLETED" && (
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Settled
                            </span>
                          )}
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
