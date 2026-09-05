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
  Layers,
  Sparkles,
  Calculator,
  RefreshCw,
} from "lucide-react";

interface StockReceiveViewProps {
  onNavigate?: (module: any) => void;
}

interface PackagingOption {
  unit: string;
  label: string;
  factor: number;
}

interface ItemReceiptState {
  itemId: string;
  productId: string;
  productName: string;
  genericName?: string;
  sku?: string;
  batchNumber: string;
  expiryDate?: string;
  packageType?: string;
  sentQuantity: number;
  costPrice: number;
  
  // Available packaging options for this product
  packagingOptions: PackagingOption[];

  // Received
  receivedUnit: string;
  receivedPackQty: number;
  receivedExtraUnits: number;
  receivedQuantity: number; // total base units

  // Damaged
  damagedUnit: string;
  damagedPackQty: number;
  damagedExtraUnits: number;
  damagedQuantity: number; // total base units

  // Missing
  missingUnit: string;
  missingPackQty: number;
  missingExtraUnits: number;
  missingQuantity: number; // total base units

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

  const getPackagingOptions = (product: any, item: any): PackagingOption[] => {
    const opts: PackagingOption[] = [];
    const stripsPerBox = Number(product?.stripsPerBox || 0);
    const tabletsPerStrip = Number(product?.tabletsPerStrip || 0);
    const baseUnitName = (product?.unit || "Unit").toUpperCase();

    if (stripsPerBox > 1 && tabletsPerStrip > 1) {
      const boxFactor = stripsPerBox * tabletsPerStrip;
      opts.push({ unit: "BOX", label: `Box (${boxFactor} ${baseUnitName}s)`, factor: boxFactor });
      opts.push({ unit: "STRIP", label: `Strip (${tabletsPerStrip} ${baseUnitName}s)`, factor: tabletsPerStrip });
      opts.push({ unit: baseUnitName, label: `${baseUnitName} (1 ${baseUnitName})`, factor: 1 });
    } else if (item.conversionFactor && item.conversionFactor > 1) {
      const packUnit = item.packageType || "PACK";
      opts.push({ unit: packUnit, label: `${packUnit} (${item.conversionFactor} Units)`, factor: item.conversionFactor });
      opts.push({ unit: baseUnitName, label: `${baseUnitName} (1 Unit)`, factor: 1 });
    } else {
      const pType = (product?.defaultPackType || item.packageType || baseUnitName).toUpperCase();
      opts.push({ unit: pType, label: `${pType} (1 ${pType})`, factor: 1 });
      if (pType !== baseUnitName && baseUnitName !== "UNIT") {
        opts.push({ unit: baseUnitName, label: `${baseUnitName} (1 ${baseUnitName})`, factor: 1 });
      }
    }

    return opts;
  };

  const handleOpenReceiveModal = async (transfer: any) => {
    setActiveTransfer(transfer);
    setModalError(null);
    setReceiveNotes("");
    setEnableImmediateSettlement(false);

    // Initialize item intake state with all received by default
    const itemsState: ItemReceiptState[] = (transfer.items || []).map((i: any) => {
      const options = getPackagingOptions(i.product, i);
      const defaultUnit = options[0]?.unit || i.packageType || "PIECE";
      const defaultFactor = options[0]?.factor || 1;
      const sentQty = Number(i.sentQuantity || i.quantity || 0);

      // Default: All received
      const initialPackQty = defaultFactor > 1 ? Math.floor(sentQty / defaultFactor) : sentQty;
      const initialExtraUnits = defaultFactor > 1 ? sentQty % defaultFactor : 0;

      return {
        itemId: i.id,
        productId: i.productId,
        productName: i.product?.name || "Product",
        genericName: i.product?.genericName,
        sku: i.product?.sku,
        batchNumber: i.batchNumber || "DEFAULT",
        expiryDate: i.expiryDate ? new Date(i.expiryDate).toISOString().split("T")[0] : undefined,
        packageType: i.packageType || "PIECE",
        sentQuantity: sentQty,
        costPrice: Number(i.costPrice || i.unitPrice || 0),
        packagingOptions: options,

        receivedUnit: defaultUnit,
        receivedPackQty: initialPackQty,
        receivedExtraUnits: initialExtraUnits,
        receivedQuantity: sentQty,

        damagedUnit: defaultUnit,
        damagedPackQty: 0,
        damagedExtraUnits: 0,
        damagedQuantity: 0,

        missingUnit: defaultUnit,
        missingPackQty: 0,
        missingExtraUnits: 0,
        missingQuantity: 0,

        notes: "",
      };
    });

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

  const calculateBaseUnits = (options: PackagingOption[], unitName: string, packQty: number, extraUnits: number): number => {
    const opt = options.find((o) => o.unit === unitName);
    const factor = opt ? opt.factor : 1;
    return Math.max(0, packQty * factor + extraUnits);
  };

  const handleUpdatePackaging = (
    itemId: string,
    category: "received" | "damaged" | "missing",
    field: "unit" | "packQty" | "extraUnits",
    value: any
  ) => {
    setReceiptItems((prev) =>
      prev.map((item) => {
        if (item.itemId !== itemId) return item;

        const updated = { ...item };
        if (category === "received") {
          if (field === "unit") updated.receivedUnit = value;
          if (field === "packQty") updated.receivedPackQty = Math.max(0, parseInt(value) || 0);
          if (field === "extraUnits") updated.receivedExtraUnits = Math.max(0, parseInt(value) || 0);
          updated.receivedQuantity = calculateBaseUnits(
            updated.packagingOptions,
            updated.receivedUnit,
            updated.receivedPackQty,
            updated.receivedExtraUnits
          );
        } else if (category === "damaged") {
          if (field === "unit") updated.damagedUnit = value;
          if (field === "packQty") updated.damagedPackQty = Math.max(0, parseInt(value) || 0);
          if (field === "extraUnits") updated.damagedExtraUnits = Math.max(0, parseInt(value) || 0);
          updated.damagedQuantity = calculateBaseUnits(
            updated.packagingOptions,
            updated.damagedUnit,
            updated.damagedPackQty,
            updated.damagedExtraUnits
          );

          // Automatically adjust received quantity to remaining usable balance
          const nonReceived = updated.damagedQuantity + updated.missingQuantity;
          const targetReceived = Math.max(0, updated.sentQuantity - nonReceived);
          const opt = updated.packagingOptions.find((o) => o.unit === updated.receivedUnit);
          const factor = opt ? opt.factor : 1;
          updated.receivedPackQty = factor > 1 ? Math.floor(targetReceived / factor) : targetReceived;
          updated.receivedExtraUnits = factor > 1 ? targetReceived % factor : 0;
          updated.receivedQuantity = targetReceived;
        } else if (category === "missing") {
          if (field === "unit") updated.missingUnit = value;
          if (field === "packQty") updated.missingPackQty = Math.max(0, parseInt(value) || 0);
          if (field === "extraUnits") updated.missingExtraUnits = Math.max(0, parseInt(value) || 0);
          updated.missingQuantity = calculateBaseUnits(
            updated.packagingOptions,
            updated.missingUnit,
            updated.missingPackQty,
            updated.missingExtraUnits
          );

          // Automatically adjust received quantity to remaining usable balance
          const nonReceived = updated.damagedQuantity + updated.missingQuantity;
          const targetReceived = Math.max(0, updated.sentQuantity - nonReceived);
          const opt = updated.packagingOptions.find((o) => o.unit === updated.receivedUnit);
          const factor = opt ? opt.factor : 1;
          updated.receivedPackQty = factor > 1 ? Math.floor(targetReceived / factor) : targetReceived;
          updated.receivedExtraUnits = factor > 1 ? targetReceived % factor : 0;
          updated.receivedQuantity = targetReceived;
        }

        return updated;
      })
    );
  };

  const handleAutoBalanceReceived = (itemId: string) => {
    setReceiptItems((prev) =>
      prev.map((item) => {
        if (item.itemId !== itemId) return item;

        const nonReceived = item.damagedQuantity + item.missingQuantity;
        const targetReceived = Math.max(0, item.sentQuantity - nonReceived);

        const opt = item.packagingOptions.find((o) => o.unit === item.receivedUnit);
        const factor = opt ? opt.factor : 1;

        const newPackQty = factor > 1 ? Math.floor(targetReceived / factor) : targetReceived;
        const newExtra = factor > 1 ? targetReceived % factor : 0;

        return {
          ...item,
          receivedPackQty: newPackQty,
          receivedExtraUnits: newExtra,
          receivedQuantity: targetReceived,
        };
      })
    );
  };

  // Calculations
  const totalSentValue = receiptItems.reduce(
    (acc, i) => acc + i.sentQuantity * i.costPrice,
    0
  );
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

  const destinationPayable = totalReceivedValue;

  const totalDamagedUnits = receiptItems.reduce((acc, i) => acc + i.damagedQuantity, 0);
  const totalMissingUnits = receiptItems.reduce((acc, i) => acc + i.missingQuantity, 0);

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
          `Quantity mismatch for "${item.productName}". Sent: ${item.sentQuantity} units, but Received (${item.receivedQuantity}) + Damaged (${item.damagedQuantity}) + Missing (${item.missingQuantity}) = ${sum} units.`
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
          reference: `Immediate Settlement on Intake (#${activeTransfer.id.substring(0, 8)})`,
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
        text: `Shipment #${activeTransfer.id.substring(0, 8)} successfully verified and received! ${
          totalReceivedValue > 0 ? `৳${totalReceivedValue.toFixed(2)} payable recorded.` : ""
        } Usable stock credited at ${activeTransfer.toBranch?.name}.`,
      });
      setActiveTransfer(null);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || "Error occurred during receiving");
    } finally {
      setReceiving(false);
    }
  };

  const selectedPayingAcc = destAccounts.find((a) => a.id === selectedDestAccId);
  const selectedRecAcc = sourceAccounts.find((a) => a.id === selectedSourceAccId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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
            Receive incoming shipments with unit-aware damage/missing recording, destination stock updates, and direct financial settlement.
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
              <div className="font-black text-xs">Shipments Awaiting Intake Verification</div>
              <p className="text-[11px] text-sky-700 dark:text-sky-300/80 mt-0.5">
                {pendingReceive.length} shipment(s) dispatched to this branch are ready to be verified, checked for packaging damage/loss, and accepted into stock.
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
                            className="px-3.5 py-1.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <PackageCheck className="h-3.5 w-3.5" />
                            <span>Verify & Receive</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onNavigate && onNavigate("stock_transfer_history")}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
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

      {/* Advanced Unit-Aware Stock Receive Modal */}
      {activeTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-5xl w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary font-mono text-[10px] font-bold">
                    #TRF-{activeTransfer.id.substring(0, 8).toUpperCase()}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <PackageCheck className="h-5 w-5 text-brand-primary" />
                    <span>Intake Inspection & Packaging Settlement</span>
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <span>Source:</span>
                  <strong className="text-slate-800 dark:text-white font-bold">{activeTransfer.fromBranch?.name}</strong>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  <span>Destination:</span>
                  <strong className="text-slate-800 dark:text-white font-bold">{activeTransfer.toBranch?.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTransfer(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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

            <form onSubmit={handleConfirmIntake} className="space-y-6">
              {/* Itemized Packaging Breakdown Cards */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-brand-primary" />
                    <span>Medications in Shipment ({receiptItems.length})</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Specify received, damaged (transit loss) and missing quantities in their respective units
                  </span>
                </div>

                {receiptItems.map((item, idx) => {
                  const totalAccounted = item.receivedQuantity + item.damagedQuantity + item.missingQuantity;
                  const isBalanced = totalAccounted === item.sentQuantity;
                  const linePayable = item.receivedQuantity * item.costPrice;
                  const lineDamagedLoss = item.damagedQuantity * item.costPrice;
                  const lineMissingLoss = item.missingQuantity * item.costPrice;

                  return (
                    <div
                      key={item.itemId}
                      className={`p-4 rounded-2xl border transition ${
                        isBalanced
                          ? "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                          : "bg-rose-50/30 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800"
                      }`}
                    >
                      {/* Product Header Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {item.productName}
                            </span>
                            {item.genericName && (
                              <span className="text-xs text-slate-500 font-medium">
                                ({item.genericName})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-3">
                            <span>Batch: <strong>{item.batchNumber}</strong></span>
                            {item.expiryDate && <span>Exp: {item.expiryDate}</span>}
                            <span>Cost Price: <strong className="text-brand-primary font-bold">৳{item.costPrice.toFixed(2)}/unit</strong></span>
                          </div>
                        </div>

                        {/* Sent Quantity & Balanced Badge */}
                        <div className="flex items-center gap-2.5">
                          <div className="px-3 py-1 rounded-xl bg-slate-200/60 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 text-xs font-bold font-mono">
                            Sent: {item.sentQuantity} lowest units
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAutoBalanceReceived(item.itemId)}
                            className="px-2.5 py-1 rounded-xl bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Set received to remaining balance"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>Auto-Balance</span>
                          </button>
                        </div>
                      </div>

                      {/* 3-Column Unit-Aware Breakdown: Received, Damaged, Missing */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-3">
                        {/* 1. Received (Usable Stock) */}
                        <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Received (Usable)</span>
                            </span>
                            <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              ৳{linePayable.toFixed(2)}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">
                                Unit
                              </label>
                              <select
                                value={item.receivedUnit}
                                onChange={(e) =>
                                  handleUpdatePackaging(item.itemId, "received", "unit", e.target.value)
                                }
                                className="w-full px-2 py-1.5 text-xs font-bold rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none cursor-pointer"
                              >
                                {item.packagingOptions.map((opt) => (
                                  <option key={opt.unit} value={opt.unit}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">
                                Qty
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={item.receivedPackQty}
                                onChange={(e) =>
                                  handleUpdatePackaging(item.itemId, "received", "packQty", e.target.value)
                                }
                                className="w-full px-2 py-1.5 text-xs font-bold rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none font-mono"
                              />
                            </div>
                          </div>

                          {/* Loose Units input if package has conversionFactor > 1 */}
                          {item.packagingOptions.some((o) => o.unit === item.receivedUnit && o.factor > 1) && (
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">
                                + Extra Loose Units
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={item.receivedExtraUnits}
                                onChange={(e) =>
                                  handleUpdatePackaging(item.itemId, "received", "extraUnits", e.target.value)
                                }
                                placeholder="0"
                                className="w-full px-2 py-1 text-xs font-bold rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none font-mono"
                              />
                            </div>
                          )}

                          <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono font-semibold pt-1 border-t border-emerald-200/50 dark:border-emerald-800/40">
                            Total Usable: <strong>{item.receivedQuantity}</strong> units (added to stock)
                          </div>
                        </div>

                        {/* 2. Damaged (Transit Loss) */}
                        <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                              <span>Damaged (Transit Loss)</span>
                            </span>
                            <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400">
                              ৳{lineDamagedLoss.toFixed(2)} Loss
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-amber-700 dark:text-amber-400 mb-0.5">
                                Unit
                              </label>
                              <select
                                value={item.damagedUnit}
                                onChange={(e) =>
                                  handleUpdatePackaging(item.itemId, "damaged", "unit", e.target.value)
                                }
                                className="w-full px-2 py-1.5 text-xs font-bold rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none cursor-pointer"
                              >
                                {item.packagingOptions.map((opt) => (
                                  <option key={opt.unit} value={opt.unit}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[9px] uppercase font-bold text-amber-700 dark:text-amber-400 mb-0.5">
                                Qty
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={item.damagedPackQty}
                                onChange={(e) =>
                                  handleUpdatePackaging(item.itemId, "damaged", "packQty", e.target.value)
                                }
                                className="w-full px-2 py-1.5 text-xs font-bold rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none font-mono"
                              />
                            </div>
                          </div>

                          {item.packagingOptions.some((o) => o.unit === item.damagedUnit && o.factor > 1) && (
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-amber-700 dark:text-amber-400 mb-0.5">
                                + Extra Loose Units
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={item.damagedExtraUnits}
                                onChange={(e) =>
                                  handleUpdatePackaging(item.itemId, "damaged", "extraUnits", e.target.value)
                                }
                                placeholder="0"
                                className="w-full px-2 py-1 text-xs font-bold rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none font-mono"
                              />
                            </div>
                          )}

                          <div className="text-[10px] text-amber-700 dark:text-amber-300 font-mono font-semibold pt-1 border-t border-amber-200/50 dark:border-amber-800/40">
                            Total Damaged: <strong>{item.damagedQuantity}</strong> units (Source Loss)
                          </div>
                        </div>

                        {/* 3. Missing (Missing Units) */}
                        <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1">
                              <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                              <span>Missing in Transit</span>
                            </span>
                            <span className="text-[10px] font-mono font-bold text-rose-700 dark:text-rose-400">
                              ৳{lineMissingLoss.toFixed(2)} Loss
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-rose-700 dark:text-rose-400 mb-0.5">
                                Unit
                              </label>
                              <select
                                value={item.missingUnit}
                                onChange={(e) =>
                                  handleUpdatePackaging(item.itemId, "missing", "unit", e.target.value)
                                }
                                className="w-full px-2 py-1.5 text-xs font-bold rounded-lg border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none cursor-pointer"
                              >
                                {item.packagingOptions.map((opt) => (
                                  <option key={opt.unit} value={opt.unit}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[9px] uppercase font-bold text-rose-700 dark:text-rose-400 mb-0.5">
                                Qty
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={item.missingPackQty}
                                onChange={(e) =>
                                  handleUpdatePackaging(item.itemId, "missing", "packQty", e.target.value)
                                }
                                className="w-full px-2 py-1.5 text-xs font-bold rounded-lg border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none font-mono"
                              />
                            </div>
                          </div>

                          {item.packagingOptions.some((o) => o.unit === item.missingUnit && o.factor > 1) && (
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-rose-700 dark:text-rose-400 mb-0.5">
                                + Extra Loose Units
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={item.missingExtraUnits}
                                onChange={(e) =>
                                  handleUpdatePackaging(item.itemId, "missing", "extraUnits", e.target.value)
                                }
                                placeholder="0"
                                className="w-full px-2 py-1 text-xs font-bold rounded-lg border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none font-mono"
                              />
                            </div>
                          )}

                          <div className="text-[10px] text-rose-700 dark:text-rose-300 font-mono font-semibold pt-1 border-t border-rose-200/50 dark:border-rose-800/40">
                            Total Missing: <strong>{item.missingQuantity}</strong> units
                          </div>
                        </div>
                      </div>

                      {/* Line Balance Indicator */}
                      <div className="mt-3 pt-2 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[10px] ${
                              isBalanced
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse"
                            }`}
                          >
                            {isBalanced ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                <span>100% Accounted ({totalAccounted} / {item.sentQuantity} units)</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3" />
                                <span>Mismatch: {totalAccounted} / {item.sentQuantity} units ({item.sentQuantity - totalAccounted} unassigned)</span>
                              </>
                            )}
                          </span>
                        </div>

                        <div className="text-[11px] font-medium text-slate-500">
                          Destination Payable: <strong className="text-emerald-600 font-black font-mono">৳{linePayable.toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Financial & Accounting Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-slate-500" />
                    <span>Sent Shipment Value</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-slate-800 dark:text-slate-200">
                    ৳{totalSentValue.toFixed(2)}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Total {receiptItems.reduce((acc, i) => acc + i.sentQuantity, 0)} units dispatched from {activeTransfer.fromBranch?.name}.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-1">
                  <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Damaged / Missing Losses (Deducted)</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-amber-700 dark:text-amber-200">
                    -৳{(totalDamagedValue + totalMissingValue).toFixed(2)}
                  </div>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400">
                    {totalDamagedUnits + totalMissingUnits} damaged/missing units deducted & charged to {activeTransfer.fromBranch?.name}.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-1">
                  <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Net Destination Payable (Usable Stock)</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-200">
                    ৳{destinationPayable.toFixed(2)}
                  </div>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">
                    Strictly for {receiptItems.reduce((acc, i) => acc + i.receivedQuantity, 0)} usable units added to {activeTransfer.toBranch?.name}.
                  </p>
                </div>
              </div>

              {/* Direct Financial Settlement Section */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        Settle Payment Immediately on Intake?
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Transfer ৳{totalReceivedValue.toFixed(2)} directly from {activeTransfer.toBranch?.name} to {activeTransfer.fromBranch?.name} accounts now.
                      </div>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableImmediateSettlement}
                      onChange={(e) => setEnableImmediateSettlement(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div>
                  </label>
                </div>

                {enableImmediateSettlement && (
                  <div className="pt-3 border-t border-slate-200/70 dark:border-slate-700/70 space-y-3.5 animate-in fade-in duration-150">
                    {/* Visual Account Route Banner */}
                    <div className="p-3 rounded-xl bg-brand-primary/5 border border-brand-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {activeTransfer.toBranch?.name} ({selectedPayingAcc?.name || "Paying Account"})
                        </span>
                        <ArrowRight className="h-4 w-4 text-brand-primary shrink-0" />
                        <span className="font-bold text-slate-900 dark:text-white">
                          {activeTransfer.fromBranch?.name} ({selectedRecAcc?.name || "Receiving Account"})
                        </span>
                      </div>
                      <div className="font-mono font-black text-brand-primary text-sm">
                        ৳{totalReceivedValue.toFixed(2)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Destination Paying Account */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Paying Account ({activeTransfer.toBranch?.name})
                        </label>
                        <select
                          value={selectedDestAccId}
                          onChange={(e) => setSelectedDestAccId(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                        >
                          {destAccounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.type}) — Available: ৳{Number(a.balance || 0).toFixed(2)}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Money will be deducted from this account at {activeTransfer.toBranch?.name}.
                        </p>
                      </div>

                      {/* Source Receiving Account */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Receiving Account ({activeTransfer.fromBranch?.name})
                        </label>
                        <select
                          value={selectedSourceAccId}
                          onChange={(e) => setSelectedSourceAccId(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                        >
                          {sourceAccounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.type}) — Current: ৳{Number(a.balance || 0).toFixed(2)}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Money will be credited into this account at {activeTransfer.fromBranch?.name}.
                        </p>
                      </div>
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
                  placeholder="e.g. 1 box arrived damaged due to courier carton crush, remaining bottles intact"
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs text-slate-500">
                  {hasMismatch ? (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Please balance all medication quantities before confirming.</span>
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>All quantities balanced and ready for stock credit.</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTransfer(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={receiving || hasMismatch}
                    className="px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs shadow-md transition flex items-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {receiving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Confirming Intake...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Confirm Intake & Credit Stock</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
