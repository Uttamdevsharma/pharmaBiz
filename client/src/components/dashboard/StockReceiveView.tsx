"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Branch } from "@/types";
import { useAuth } from "@/context/AuthContext";
import {
  Inbox,
  Store,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  PackageCheck,
  AlertTriangle,
  HelpCircle,
  CreditCard,
  DollarSign,
  X,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

interface StockReceiveViewProps {
  onNavigate?: (module: any) => void;
}

interface ItemReceiptState {
  itemId: string;
  productId: string;
  productName: string;
  genericName?: string;
  batchNumber: string;
  expiryDate?: string;
  packageType?: string;
  sentQuantity: number;
  costPrice: number;
  receivedQuantity: number;
  damagedQuantity: number;
  missingQuantity: number;
  notes?: string;
}

export function StockReceiveView({ onNavigate }: StockReceiveViewProps = {}) {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || "");
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Receive Modal State
  const [activeTransfer, setActiveTransfer] = useState<any | null>(null);
  const [receiptItems, setReceiptItems] = useState<ItemReceiptState[]>([]);
  const [receiveNotes, setReceiveNotes] = useState<string>("");
  const [receiving, setReceiving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Immediate Settlement Toggle & Accounts
  const [enableImmediateSettlement, setEnableImmediateSettlement] = useState(false);
  const [destAccounts, setDestAccounts] = useState<any[]>([]);
  const [sourceAccounts, setSourceAccounts] = useState<any[]>([]);
  const [selectedSourceAccId, setSelectedSourceAccId] = useState("");
  const [selectedDestAccId, setSelectedDestAccId] = useState("");

  const isBranchLocked = Boolean(
    user?.branchId && user?.role !== "COMPANY_OWNER" && user?.role !== "SUPER_ADMIN"
  );

  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetchApi<Branch[]>("/branches");
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
      const res = await fetchApi<any[]>("/transfers?limit=50");
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

  const incomingTransfers = transfers.filter(
    (t) => !selectedBranchId || t.toBranchId === selectedBranchId
  );

  const pendingReceive = incomingTransfers.filter(
    (t) => t.status === "IN_TRANSIT" || t.status === "PENDING" || t.status === "APPROVED"
  );

  const handleOpenReceiveModal = async (transfer: any) => {
    setActiveTransfer(transfer);
    setModalError(null);
    setReceiveNotes("");
    setEnableImmediateSettlement(false);

    // Initialize item intake state with all received by default
    const itemsState: ItemReceiptState[] = (transfer.items || []).map((i: any) => ({
      itemId: i.id,
      productId: i.productId,
      productName: i.product?.name || "Product",
      genericName: i.product?.genericName,
      batchNumber: i.batchNumber || "DEFAULT",
      expiryDate: i.expiryDate ? new Date(i.expiryDate).toISOString().split("T")[0] : undefined,
      packageType: i.packageType || "PIECE",
      sentQuantity: Number(i.sentQuantity || i.quantity || 0),
      costPrice: Number(i.costPrice || i.unitPrice || 0),
      receivedQuantity: Number(i.sentQuantity || i.quantity || 0),
      damagedQuantity: 0,
      missingQuantity: 0,
      notes: "",
    }));

    setReceiptItems(itemsState);

    // Fetch accounts for both branches
    try {
      const [toAccs, fromAccs] = await Promise.all([
        fetchApi<any[]>(`/accounting/accounts?branchId=${transfer.toBranchId}`),
        fetchApi<any[]>(`/accounting/accounts?branchId=${transfer.fromBranchId}`),
      ]);
      if (toAccs.success && toAccs.data) {
        setDestAccounts(toAccs.data);
        if (toAccs.data.length > 0) setSelectedDestAccId(toAccs.data[0].id);
      }
      if (fromAccs.success && fromAccs.data) {
        setSourceAccounts(fromAccs.data);
        if (fromAccs.data.length > 0) setSelectedSourceAccId(fromAccs.data[0].id);
      }
    } catch (err) {
      console.error("Failed to load accounts for settlement", err);
    }
  };

  const handleUpdateItemReceipt = (
    itemId: string,
    field: "receivedQuantity" | "damagedQuantity" | "missingQuantity" | "notes",
    value: any
  ) => {
    setReceiptItems((prev) =>
      prev.map((item) => {
        if (item.itemId !== itemId) return item;
        return {
          ...item,
          [field]: field === "notes" ? value : Math.max(0, parseInt(value) || 0),
        };
      })
    );
  };

  // Calculations
  const totalReceivedValue = receiptItems.reduce(
    (acc, i) => acc + i.receivedQuantity * i.costPrice,
    0
  );
  const totalDamagedValue = receiptItems.reduce(
    (acc, i) => acc + i.damagedQuantity * i.costPrice,
    0
  );
  const totalMissingValue = receiptItems.reduce(
    (acc, i) => acc + i.missingQuantity * i.costPrice,
    0
  );

  const hasMismatch = receiptItems.some(
    (i) => i.receivedQuantity + i.damagedQuantity + i.missingQuantity !== i.sentQuantity
  );

  const handleConfirmIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTransfer) return;
    setModalError(null);

    // Validate quantities
    for (const item of receiptItems) {
      const sum = item.receivedQuantity + item.damagedQuantity + item.missingQuantity;
      if (sum !== item.sentQuantity) {
        setModalError(
          `Quantity mismatch for "${item.productName}". Sent: ${item.sentQuantity}, but Received (${item.receivedQuantity}) + Damaged (${item.damagedQuantity}) + Missing (${item.missingQuantity}) = ${sum}.`
        );
        return;
      }
    }

    try {
      setReceiving(true);

      const payload: any = {
        notes: receiveNotes.trim() || undefined,
        items: receiptItems.map((i) => ({
          itemId: i.itemId,
          receivedQuantity: i.receivedQuantity,
          damagedQuantity: i.damagedQuantity,
          missingQuantity: i.missingQuantity,
          notes: i.notes?.trim() || undefined,
        })),
      };

      if (enableImmediateSettlement && totalReceivedValue > 0) {
        if (!selectedDestAccId || !selectedSourceAccId) {
          setModalError("Please select both paying and receiving accounts for immediate settlement.");
          setReceiving(false);
          return;
        }

        payload.immediateSettlement = {
          sourceAccountId: selectedDestAccId,
          destinationAccountId: selectedSourceAccId,
          amount: totalReceivedValue,
          paymentMethod:
            destAccounts.find((a) => a.id === selectedDestAccId)?.type || "CASH",
          reference: `Immediate Settlement on Intake`,
        };
      }

      const res = await fetchApi(`/transfers/${activeTransfer.id}/receive`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to receive transfer");
      }

      setFeedback({
        type: "success",
        text: `Shipment #${activeTransfer.id.substring(0, 8)} successfully received! Usable stock has been updated at ${activeTransfer.toBranch?.name}.`,
      });
      setActiveTransfer(null);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || "Error occurred during receiving");
    } finally {
      setReceiving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
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
            <span>Stock Receiving & Intake Hub</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Receive incoming shipments, account for damaged/missing quantities, update destination stock, and record cost payables.
          </p>
        </div>

        {/* Branch Selector */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-xl">
          <Store className="h-4 w-4 text-slate-400" />
          <select
            disabled={isBranchLocked}
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer disabled:opacity-60"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} (Receiving Branch)
              </option>
            ))}
          </select>
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

      {/* Pending Incoming Alert Banner */}
      {pendingReceive.length > 0 && (
        <div className="p-4 bg-sky-500/10 border border-sky-500/30 text-sky-900 dark:text-sky-200 rounded-3xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-sky-500/20 text-sky-600 flex items-center justify-center font-black">
              {pendingReceive.length}
            </div>
            <div>
              <div className="font-black text-xs">Shipments Awaiting Intake Confirmation</div>
              <p className="text-[11px] text-sky-700 dark:text-sky-300/80 mt-0.5">
                {pendingReceive.length} shipment(s) dispatched to this branch are ready to be verified and accepted into stock.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Transfers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
            <span>Loading receiving queue...</span>
          </div>
        ) : incomingTransfers.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            <Inbox className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No shipments found for this branch</p>
            <p className="mt-0.5">When peer branches dispatch stock to this location, they will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Transfer Date</th>
                  <th className="py-3.5 px-4">Source Branch</th>
                  <th className="py-3.5 px-4">Medications Included</th>
                  <th className="py-3.5 px-4">Sent Cost Value</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Settlement</th>
                  <th className="py-3.5 px-4 text-right">Intake Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {incomingTransfers.map((t) => {
                  const isAwaitingReceive =
                    t.status === "IN_TRANSIT" || t.status === "PENDING" || t.status === "APPROVED";
                  const sentValue = Number(t.sentTotalValue || t.totalValue || 0);

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {t.fromBranch?.name || "Source Branch"}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {(t.items || []).length} medication batch(es)
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">
                          {(t.items || []).map((i: any) => i.product?.name).filter(Boolean).join(", ") || "View details"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-black font-mono text-brand-primary">
                        ৳{sentValue.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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

                      <td className="py-3.5 px-4 text-right">
                        {isAwaitingReceive ? (
                          <button
                            type="button"
                            onClick={() => handleOpenReceiveModal(t)}
                            className="px-3.5 py-1.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 ml-auto"
                          >
                            <PackageCheck className="h-3.5 w-3.5" />
                            <span>Verify & Receive</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onNavigate && onNavigate("stock_transfer_history")}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                          >
                            View Ledger
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

      {/* Itemized Stock Receive Modal */}
      {activeTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-4xl w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <PackageCheck className="h-5 w-5 text-brand-primary" />
                  <span>Receive Shipment #{activeTransfer.id.substring(0, 8)}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dispatched from <strong>{activeTransfer.fromBranch?.name}</strong> to{" "}
                  <strong>{activeTransfer.toBranch?.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setActiveTransfer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmIntake} className="space-y-5">
              {/* Product items table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3">Medication & Batch</th>
                      <th className="py-3 px-2 text-center">Sent Units</th>
                      <th className="py-3 px-2 text-center text-emerald-600">Received Units</th>
                      <th className="py-3 px-2 text-center text-amber-600">Damaged Units</th>
                      <th className="py-3 px-2 text-center text-rose-600">Missing Units</th>
                      <th className="py-3 px-3 text-right">Cost Price</th>
                      <th className="py-3 px-3 text-right">Received Payable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {receiptItems.map((item) => {
                      const sum = item.receivedQuantity + item.damagedQuantity + item.missingQuantity;
                      const isBalanced = sum === item.sentQuantity;
                      const linePayable = item.receivedQuantity * item.costPrice;

                      return (
                        <tr key={item.itemId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {item.productName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Batch: {item.batchNumber} | Pack: {item.packageType}
                            </div>
                            {!isBalanced && (
                              <div className="text-[10px] font-bold text-rose-500 mt-0.5">
                                ⚠️ Total accounted: {sum} / {item.sentQuantity}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-2 text-center font-black font-mono text-slate-900 dark:text-white">
                            {item.sentQuantity}
                          </td>

                          <td className="py-3 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              max={item.sentQuantity}
                              value={item.receivedQuantity}
                              onChange={(e) =>
                                handleUpdateItemReceipt(item.itemId, "receivedQuantity", e.target.value)
                              }
                              className="w-16 px-2 py-1 text-center font-bold text-xs rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 outline-none"
                            />
                          </td>

                          <td className="py-3 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              max={item.sentQuantity}
                              value={item.damagedQuantity}
                              onChange={(e) =>
                                handleUpdateItemReceipt(item.itemId, "damagedQuantity", e.target.value)
                              }
                              className="w-16 px-2 py-1 text-center font-bold text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 outline-none"
                            />
                          </td>

                          <td className="py-3 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              max={item.sentQuantity}
                              value={item.missingQuantity}
                              onChange={(e) =>
                                handleUpdateItemReceipt(item.itemId, "missingQuantity", e.target.value)
                              }
                              className="w-16 px-2 py-1 text-center font-bold text-xs rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 outline-none"
                            />
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-slate-500">
                            ৳{item.costPrice.toFixed(2)}
                          </td>

                          <td className="py-3 px-3 text-right font-black font-mono text-emerald-600">
                            ৳{linePayable.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    Received Usable Value (Payable)
                  </div>
                  <div className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-200 mt-0.5">
                    ৳{totalReceivedValue.toFixed(2)}
                  </div>
                  <p className="text-[10px] text-emerald-600/80 mt-0.5">
                    Stock added to destination branch
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                  <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                    Damaged Stock Loss
                  </div>
                  <div className="text-lg font-black font-mono text-amber-700 dark:text-amber-200 mt-0.5">
                    ৳{totalDamagedValue.toFixed(2)}
                  </div>
                  <p className="text-[10px] text-amber-600/80 mt-0.5">
                    Excluded from payable, logged as loss
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                  <div className="text-[11px] font-bold text-rose-700 dark:text-rose-300">
                    Missing Stock Loss
                  </div>
                  <div className="text-lg font-black font-mono text-rose-700 dark:text-rose-200 mt-0.5">
                    ৳{totalMissingValue.toFixed(2)}
                  </div>
                  <p className="text-[10px] text-rose-600/80 mt-0.5">
                    Excluded from payable, logged in audit
                  </p>
                </div>
              </div>

              {/* Immediate Settlement Toggle */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-brand-primary" />
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      Settle Payment Immediately on Intake?
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableImmediateSettlement}
                    onChange={(e) => setEnableImmediateSettlement(e.target.checked)}
                    className="h-4 w-4 rounded text-brand-primary cursor-pointer"
                  />
                </div>

                {enableImmediateSettlement && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-700">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Paying Account ({activeTransfer.toBranch?.name})
                      </label>
                      <select
                        value={selectedDestAccId}
                        onChange={(e) => setSelectedDestAccId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                      >
                        {destAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.type}) — Balance: ৳{Number(a.balance || 0).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Receiving Account ({activeTransfer.fromBranch?.name})
                      </label>
                      <select
                        value={selectedSourceAccId}
                        onChange={(e) => setSelectedSourceAccId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                      >
                        {sourceAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.type})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Intake Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Intake Inspection Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 4 bottles found cracked upon delivery box opening"
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTransfer(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={receiving || hasMismatch}
                  className="px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs shadow-sm transition flex items-center gap-2 disabled:opacity-50"
                >
                  {receiving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Confirming Intake...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Confirm & Credit to Stock</span>
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
