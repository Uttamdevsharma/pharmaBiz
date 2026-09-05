"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Branch } from "@/types";
import { useAuth } from "@/context/AuthContext";
import {
  FileSpreadsheet,
  Plus,
  ArrowLeftRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  CreditCard,
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
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

interface TransferHistoryViewProps {
  onNavigate: (module: any) => void;
}

export function TransferHistoryView({ onNavigate }: TransferHistoryViewProps) {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [branchFilter, setBranchFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [settlementFilter, setSettlementFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Details & Settlement Modal State
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Settlement Form State
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settlePayingAccId, setSettlePayingAccId] = useState<string>("");
  const [settleReceivingAccId, setSettleReceivingAccId] = useState<string>("");
  const [settleRef, setSettleRef] = useState<string>("");
  const [settleNotes, setSettleNotes] = useState<string>("");
  const [payingAccounts, setPayingAccounts] = useState<any[]>([]);
  const [receivingAccounts, setReceivingAccounts] = useState<any[]>([]);
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tRes, bRes] = await Promise.all([
        fetchApi<any[]>("/transfers?limit=100"),
        fetchApi<Branch[]>("/branches"),
      ]);

      if (tRes.success && tRes.data) setTransfers(tRes.data);
      if (bRes.success && bRes.data) setBranches(bRes.data);
    } catch (err) {
      console.error("Failed to load transfer history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const openSettleModal = async (transfer: any) => {
    setSelectedTransfer(transfer);
    setSettleError(null);
    const due = Number(transfer.remainingDue || 0);
    setSettleAmount(due);
    setSettleRef(`Payment for Transfer #${transfer.id.substring(0, 8)}`);
    setSettleNotes("");

    try {
      const [payAccs, recAccs] = await Promise.all([
        fetchApi<any[]>(`/accounting/accounts?branchId=${transfer.toBranchId}`),
        fetchApi<any[]>(`/accounting/accounts?branchId=${transfer.fromBranchId}`),
      ]);

      if (payAccs.success && payAccs.data) {
        setPayingAccounts(payAccs.data);
        if (payAccs.data.length > 0) setSettlePayingAccId(payAccs.data[0].id);
      }

      if (recAccs.success && recAccs.data) {
        setReceivingAccounts(recAccs.data);
        if (recAccs.data.length > 0) setSettleReceivingAccId(recAccs.data[0].id);
      }

      setSettleModalOpen(true);
    } catch (err) {
      console.error("Failed to load accounts", err);
    }
  };

  const handleExecuteSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;
    setSettleError(null);

    if (settleAmount <= 0) {
      setSettleError("Settlement amount must be greater than zero.");
      return;
    }

    if (!settlePayingAccId || !settleReceivingAccId) {
      setSettleError("Please select both paying and receiving accounts.");
      return;
    }

    try {
      setSettling(true);
      const res = await fetchApi(`/transfers/${selectedTransfer.id}/settle`, {
        method: "POST",
        body: JSON.stringify({
          sourceAccountId: settlePayingAccId,
          destinationAccountId: settleReceivingAccId,
          amount: settleAmount,
          paymentMethod:
            payingAccounts.find((a) => a.id === settlePayingAccId)?.type || "CASH",
          reference: settleRef || undefined,
          notes: settleNotes || undefined,
        }),
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to settle payment");
      }

      setFeedback({
        type: "success",
        text: `Settlement of ৳${settleAmount.toFixed(2)} recorded successfully!`,
      });
      setSettleModalOpen(false);
      await loadData();
      if (selectedTransfer) {
        const updated = await fetchApi<any>(`/transfers/${selectedTransfer.id}`);
        if (updated.success) setSelectedTransfer(updated.data);
      }
    } catch (err: any) {
      setSettleError(err.message || "Settlement failed");
    } finally {
      setSettling(false);
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
    if (settlementFilter && t.settlementStatus !== settlementFilter) {
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

  // Ledger Summary Totals
  const totalTransfersCount = transfers.length;
  const totalSentValue = transfers.reduce(
    (acc, t) => acc + Number(t.sentTotalValue || t.totalValue || 0),
    0
  );
  const totalDamageLossValue = transfers.reduce(
    (acc, t) => acc + Number(t.damagedTotalValue || 0) + Number(t.missingTotalValue || 0),
    0
  );
  const totalOutstandingDue = transfers.reduce(
    (acc, t) => acc + Number(t.remainingDue || 0),
    0
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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
            Audit logs for all outgoing and incoming stock transfers, damage/loss valuations, and inter-branch settlement transactions.
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

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between animate-in fade-in ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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
          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center justify-between">
            <span>Damage & Loss Valuation</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            ৳{totalDamageLossValue.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500">Recorded transit loss</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center justify-between">
            <span>Outstanding Payables Due</span>
            <CreditCard className="h-4 w-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">
            ৳{totalOutstandingDue.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500">Awaiting inter-branch settlement</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
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
            <option value="RECEIVED">Received</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={settlementFilter}
            onChange={(e) => setSettlementFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs outline-none cursor-pointer"
          >
            <option value="">All Settlement Status</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
          </select>
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
                  <th className="py-3.5 px-4">Medications</th>
                  <th className="py-3.5 px-4">Sent Value</th>
                  <th className="py-3.5 px-4">Payable Value</th>
                  <th className="py-3.5 px-4">Remaining Due</th>
                  <th className="py-3.5 px-4">Transfer Status</th>
                  <th className="py-3.5 px-4">Settlement</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredTransfers.map((t) => {
                  const sentVal = Number(t.sentTotalValue || t.totalValue || 0);
                  const payableVal = Number(t.payableAmount || 0);
                  const remainingDue = Number(t.remainingDue || 0);
                  const hasDamageOrLoss = Number(t.damagedTotalValue || 0) + Number(t.missingTotalValue || 0) > 0;

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
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {(t.items || []).length} item batch(es)
                        </div>
                        {hasDamageOrLoss && (
                          <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Loss: ৳{(Number(t.damagedTotalValue || 0) + Number(t.missingTotalValue || 0)).toFixed(2)}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-black font-mono text-slate-900 dark:text-white">
                        ৳{sentVal.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 font-black font-mono text-emerald-600">
                        ৳{payableVal.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 font-black font-mono text-sky-600">
                        ৳{remainingDue.toFixed(2)}
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

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.settlementStatus === "PAID"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : t.settlementStatus === "PARTIALLY_PAID"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {t.settlementStatus || "UNPAID"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openDetailsModal(t)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs"
                        >
                          Details
                        </button>
                        {remainingDue > 0 && (t.status === "RECEIVED" || t.status === "COMPLETED") && (
                          <button
                            type="button"
                            onClick={() => openSettleModal(t)}
                            className="px-2.5 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs shadow-xs"
                          >
                            Settle Due
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

      {/* Transfer Details Modal */}
      {selectedTransfer && !settleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-4xl w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Package className="h-5 w-5 text-brand-primary" />
                  <span>Transfer #{selectedTransfer.id.substring(0, 8)} Full Audit</span>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] font-bold text-slate-400">Total Sent Value</div>
                <div className="text-base font-black font-mono text-slate-900 dark:text-white mt-0.5">
                  ৳{Number(selectedTransfer.sentTotalValue || selectedTransfer.totalValue || 0).toFixed(2)}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Received Payable Value
                </div>
                <div className="text-base font-black font-mono text-emerald-700 dark:text-emerald-200 mt-0.5">
                  ৳{Number(selectedTransfer.payableAmount || 0).toFixed(2)}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  Damage & Loss Value
                </div>
                <div className="text-base font-black font-mono text-amber-700 dark:text-amber-200 mt-0.5">
                  ৳{(Number(selectedTransfer.damagedTotalValue || 0) + Number(selectedTransfer.missingTotalValue || 0)).toFixed(2)}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
                <div className="text-[10px] font-bold text-sky-600 dark:text-sky-400">
                  Remaining Due
                </div>
                <div className="text-base font-black font-mono text-sky-700 dark:text-sky-200 mt-0.5">
                  ৳{Number(selectedTransfer.remainingDue || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Product items table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 font-bold text-xs text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                Itemized Product Batches & Stock Breakdown
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
                    <th className="py-2.5 px-3 text-right">Cost (৳)</th>
                    <th className="py-2.5 px-3 text-right">Payable (৳)</th>
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

            {/* Settlements Audit Ledger */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden space-y-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 font-bold text-xs text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span>Inter-Branch Payment Settlements Audit</span>
                <span className="text-[11px] font-bold text-slate-400">
                  Status: {selectedTransfer.settlementStatus || "UNPAID"}
                </span>
              </div>

              {(selectedTransfer.settlements || []).length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No payment settlements recorded yet for this transfer.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/30 font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Paying Account ({selectedTransfer.toBranch?.name})</th>
                      <th className="py-2.5 px-3">Receiving Account ({selectedTransfer.fromBranch?.name})</th>
                      <th className="py-2.5 px-3">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {selectedTransfer.settlements.map((s: any) => (
                      <tr key={s.id}>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          {new Date(s.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-black font-mono text-emerald-600">
                          ৳{Number(s.amount).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">
                          {s.paymentMethod}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {s.sourceAccount?.name || "Paying Account"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {s.destinationAccount?.name || "Receiving Account"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                          {s.reference || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedTransfer(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Close
              </button>

              {Number(selectedTransfer.remainingDue || 0) > 0 &&
                (selectedTransfer.status === "RECEIVED" || selectedTransfer.status === "COMPLETED") && (
                  <button
                    type="button"
                    onClick={() => openSettleModal(selectedTransfer)}
                    className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs shadow-sm transition flex items-center gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Settle Remaining Due (৳{Number(selectedTransfer.remainingDue).toFixed(2)})</span>
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Settle Payment Modal */}
      {settleModalOpen && selectedTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-brand-primary" />
                  <span>Settle Inter-Branch Payable</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Transfer #{selectedTransfer.id.substring(0, 8)} | Remaining Due:{" "}
                  <strong className="text-brand-primary font-mono">
                    ৳{Number(selectedTransfer.remainingDue || 0).toFixed(2)}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => setSettleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {settleError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{settleError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteSettlement} className="space-y-4 text-xs">
              {/* Route Visual Banner */}
              <div className="p-3 rounded-2xl bg-brand-primary/5 border border-brand-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedTransfer.toBranch?.name} ({payingAccounts.find((a) => a.id === settlePayingAccId)?.name || "Paying"})
                  </span>
                  <ArrowRight className="h-4 w-4 text-brand-primary shrink-0" />
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedTransfer.fromBranch?.name} ({receivingAccounts.find((a) => a.id === settleReceivingAccId)?.name || "Receiving"})
                  </span>
                </div>
                <div className="font-mono font-black text-brand-primary text-sm">
                  ৳{settleAmount.toFixed(2)}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Paying Financial Account (Destination — {selectedTransfer.toBranch?.name}) *
                </label>
                <select
                  required
                  value={settlePayingAccId}
                  onChange={(e) => setSettlePayingAccId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                >
                  {payingAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type}) — Balance: ৳{Number(acc.balance || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Money will be deducted from this account at {selectedTransfer.toBranch?.name}.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Receiving Financial Account (Source — {selectedTransfer.fromBranch?.name}) *
                </label>
                <select
                  required
                  value={settleReceivingAccId}
                  onChange={(e) => setSettleReceivingAccId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                >
                  {receivingAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type}) — Current Balance: ৳{Number(acc.balance || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Money will be credited into this account at {selectedTransfer.fromBranch?.name}.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Settlement Amount (৳) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Number(selectedTransfer.remainingDue || 0)}
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-bold font-mono text-sm text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Transaction Reference / TrxID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. bKash TrxID: 9J4K2L8 or Bank Cheque #102938"
                  value={settleRef}
                  onChange={(e) => setSettleRef(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSettleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settling}
                  className="px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold shadow-sm transition flex items-center gap-2 disabled:opacity-50"
                >
                  {settling ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing Settlement...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Execute Settlement</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
