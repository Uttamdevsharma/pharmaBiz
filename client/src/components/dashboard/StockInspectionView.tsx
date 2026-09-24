"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import { showAlert } from "@/lib/swal";
import {
  PackageCheck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Layers,
  Sparkles,
  Calculator,
  RefreshCw,
  Store,
  Calendar,
  DollarSign,
  Package,
  Truck,
  Phone,
  User,
  Clock,
  FileText,
  Building,
} from "lucide-react";

interface StockInspectionViewProps {
  transferId: string;
  onNavigate: (module: OwnerModule) => void;
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

  // Received & Usable
  receivedUnit: string;
  receivedPackQty: number;
  receivedExtraUnits: number;
  receivedQuantity: number; // total base units

  // Damaged (Transit Loss)
  damagedUnit: string;
  damagedPackQty: number;
  damagedExtraUnits: number;
  damagedQuantity: number; // total base units

  // Missing in Transit
  missingUnit: string;
  missingPackQty: number;
  missingExtraUnits: number;
  missingQuantity: number; // total base units

  notes?: string;
}

export function StockInspectionView({ transferId, onNavigate }: StockInspectionViewProps) {
  const [transfer, setTransfer] = useState<any | null>(null);
  const [receiptItems, setReceiptItems] = useState<ItemReceiptState[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiveNotes, setReceiveNotes] = useState<string>("");

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

  const loadTransferDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi<any>(`/transfers/${transferId}`);
      if (res.success && res.data) {
        const t = res.data;
        setTransfer(t);

        // Map items to inspection state (defaulting to 100% received)
        const itemsState: ItemReceiptState[] = (t.items || []).map((i: any) => {
          const options = getPackagingOptions(i.product, i);
          const defaultUnit = options[0]?.unit || i.packageType || "PIECE";
          const defaultFactor = options[0]?.factor || 1;
          const sentQty = Number(i.sentQuantity || i.quantity || 0);

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
      } else {
        throw new Error(res.message || "Failed to load transfer details");
      }
    } catch (err: any) {
      setError(err.message || "Could not retrieve shipment inspection data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (transferId) {
      loadTransferDetails();
    }
  }, [transferId]);

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

          // Auto-adjust received to remaining balance
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

          // Auto-adjust received to remaining balance
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
  const totalSentValue = receiptItems.reduce((acc, i) => acc + i.sentQuantity * i.costPrice, 0);
  const totalReceivedValue = receiptItems.reduce((acc, i) => acc + i.receivedQuantity * i.costPrice, 0);
  const totalDamagedValue = receiptItems.reduce((acc, i) => acc + i.damagedQuantity * i.costPrice, 0);
  const totalMissingValue = receiptItems.reduce((acc, i) => acc + i.missingQuantity * i.costPrice, 0);
  const totalLossValue = totalDamagedValue + totalMissingValue;

  const totalSentUnits = receiptItems.reduce((acc, i) => acc + i.sentQuantity, 0);
  const totalReceivedUnits = receiptItems.reduce((acc, i) => acc + i.receivedQuantity, 0);
  const totalDamagedUnits = receiptItems.reduce((acc, i) => acc + i.damagedQuantity, 0);
  const totalMissingUnits = receiptItems.reduce((acc, i) => acc + i.missingQuantity, 0);

  const hasMismatch = receiptItems.some(
    (i) => i.receivedQuantity + i.damagedQuantity + i.missingQuantity !== i.sentQuantity
  );

  const handleConfirmIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transfer) return;
    setError(null);

    // Validate quantities
    for (const item of receiptItems) {
      const sum = item.receivedQuantity + item.damagedQuantity + item.missingQuantity;
      if (sum !== item.sentQuantity) {
        setError(
          `Quantity mismatch for "${item.productName}". Sent: ${item.sentQuantity} units, but Received (${item.receivedQuantity}) + Damaged (${item.damagedQuantity}) + Missing (${item.missingQuantity}) = ${sum} units.`
        );
        return;
      }
    }

    try {
      setSubmitting(true);

      const payload = {
        notes: receiveNotes.trim() || undefined,
        items: receiptItems.map((i) => ({
          itemId: i.itemId,
          receivedQuantity: i.receivedQuantity,
          damagedQuantity: i.damagedQuantity,
          missingQuantity: i.missingQuantity,
          notes: i.notes?.trim() || undefined,
        })),
      };

      const res = await fetchApi(`/transfers/${transfer.id}/receive`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to finalize stock intake");
      }

      await showAlert.success(
        "Stock Received Successfully!",
        "Shipment items have been physically verified and added to your branch inventory.",
        { timer: 2500 }
      );

      // Navigate back to receive queue
      onNavigate("stock_stock_receive");
    } catch (err: any) {
      const msg = err.message || "Error occurred during receiving";
      setError(msg);
      showAlert.error("Intake Failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 text-xs">
        <p className="font-semibold text-slate-500">Preparing shipment workspace...</p>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Shipment Not Found</h3>
        <p className="text-xs text-slate-500">The requested transfer shipment could not be located.</p>
        <button
          onClick={() => onNavigate("stock_stock_receive")}
          className="px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold"
        >
          Return to Stock Receive Hub
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <button
              type="button"
              onClick={() => onNavigate("stock_stock_receive")}
              className="hover:text-brand-primary flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Stock Receive Hub</span>
            </button>
            <span>/</span>
            <span className="text-brand-primary font-bold">Stock Receiving & Inspection</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <PackageCheck className="h-7 w-7 text-brand-primary" />
              <span>Stock Receiving & Inspection</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary font-mono text-xs font-bold">
              #TRF-{transfer.id.substring(0, 8).toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Internal inventory transfer inspection. Record usable, damaged, and missing stock with exact purchase/cost valuation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate("stock_stock_receive")}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Back to Queue
          </button>
        </div>
      </div>

      {/* Shipment Route & Telemetry Banner */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-brand-primary/10 text-brand-primary rounded-2xl">
            <Store className="h-6 w-6" />
          </div>
          <div className="space-y-0.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inter-Branch Route</div>
            <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
              <span>{transfer.fromBranch?.name || "Source Branch"}</span>
              <ArrowRight className="h-4 w-4 text-brand-primary" />
              <span>{transfer.toBranch?.name || "Destination Branch"}</span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>Dispatched: {new Date(transfer.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Total Dispatched Cost</div>
            <div className="text-base font-black font-mono text-brand-primary">৳{totalSentValue.toFixed(2)}</div>
          </div>
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Medication Batches</div>
            <div className="text-base font-black font-mono text-slate-900 dark:text-white">{receiptItems.length} Batches</div>
          </div>
        </div>
      </div>

      {/* Courier & Dispatch Logistics Details Card */}
      <div className="p-5 rounded-3xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-indigo-200/60 dark:border-indigo-800/60 text-xs font-bold text-indigo-900 dark:text-indigo-200">
          <div className="flex items-center gap-2">
            <Truck className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
            <span className="uppercase tracking-wider">Courier Logistics & Parcel Information</span>
          </div>
          <span className="text-[10px] font-mono bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-bold">
            Waybill / Consignment
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">Courier / Delivery Service</span>
            <strong className="text-slate-900 dark:text-white font-bold text-sm">
              {transfer.courierName || "Internal / Self Delivery"}
            </strong>
            {transfer.courierHub && (
              <div className="text-[10px] text-slate-500 font-medium">Hub: {transfer.courierHub}</div>
            )}
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">Tracking / Waybill ID</span>
            <strong className="font-mono text-indigo-600 dark:text-indigo-400 font-bold text-sm">
              {transfer.trackingId || "N/A"}
            </strong>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">Delivery Rider / Contact</span>
            <strong className="text-slate-900 dark:text-white font-bold block">
              {transfer.deliveryPersonName || "Unassigned Rider"}
            </strong>
            {transfer.deliveryPersonContact && (
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                📞 {transfer.deliveryPersonContact}
              </span>
            )}
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">Dispatch Date & Time</span>
            <strong className="text-slate-800 dark:text-slate-200 font-medium block text-xs">
              {transfer.dispatchDate
                ? new Date(transfer.dispatchDate).toLocaleString()
                : new Date(transfer.createdAt).toLocaleString()}
            </strong>
          </div>
        </div>

        {(transfer.deliveryNote || transfer.notes) && (
          <div className="pt-2 border-t border-indigo-200/50 dark:border-indigo-900/40 text-[11px]">
            <span className="text-slate-400 font-bold">Special Delivery & Handling Notes: </span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              {transfer.deliveryNote || transfer.notes}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      <form onSubmit={handleConfirmIntake} className="space-y-6">
        {/* ========================================================================= */}
        {/* PRODUCT BATCHES INSPECTION CARDS */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Layers className="h-4 w-4 text-brand-primary" />
              <span>Medication Batches in Shipment ({receiptItems.length})</span>
            </h2>
            <span className="text-xs text-slate-400">
              Inspect each medication batch and record usable stock, transit damage, or missing units.
            </span>
          </div>

          {receiptItems.map((item, idx) => {
            const totalAccounted = item.receivedQuantity + item.damagedQuantity + item.missingQuantity;
            const isBalanced = totalAccounted === item.sentQuantity;
            const lineReceivedVal = item.receivedQuantity * item.costPrice;
            const lineDamagedVal = item.damagedQuantity * item.costPrice;
            const lineMissingVal = item.missingQuantity * item.costPrice;

            return (
              <div
                key={item.itemId}
                className={`p-5 rounded-3xl border transition shadow-xs space-y-4 ${
                  isBalanced
                    ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    : "bg-rose-50/20 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800"
                }`}
              >
                {/* Product Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono text-xs font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <h3 className="font-black text-base text-slate-900 dark:text-white">{item.productName}</h3>
                      {item.genericName && (
                        <span className="text-xs text-slate-500 font-medium">({item.genericName})</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-1 flex flex-wrap items-center gap-3">
                      <span>
                        Batch: <strong className="text-slate-800 dark:text-slate-200">{item.batchNumber}</strong>
                      </span>
                      {item.expiryDate && <span>Exp: {item.expiryDate}</span>}
                      <span>
                        Purchase Cost:{" "}
                        <strong className="text-brand-primary font-bold">৳{item.costPrice.toFixed(2)}/unit</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-black font-mono">
                      Sent: {item.sentQuantity} lowest units
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAutoBalanceReceived(item.itemId)}
                      className="px-3 py-1.5 rounded-xl bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      title="Set received to remaining balance"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Auto-Balance</span>
                    </button>
                  </div>
                </div>

                {/* 3-Column Inspection Grid: Received & Usable, Damaged, Missing */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 1. Received & Usable Stock */}
                  <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Received & Usable Stock</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        ৳{lineReceivedVal.toFixed(2)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                          Unit / Pack
                        </label>
                        <select
                          value={item.receivedUnit}
                          onChange={(e) =>
                            handleUpdatePackaging(item.itemId, "received", "unit", e.target.value)
                          }
                          className="w-full px-2.5 py-2 text-xs font-bold rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none cursor-pointer"
                        >
                          {item.packagingOptions.map((opt) => (
                            <option key={opt.unit} value={opt.unit}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                          Pack Qty
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.receivedPackQty}
                          onChange={(e) =>
                            handleUpdatePackaging(item.itemId, "received", "packQty", e.target.value)
                          }
                          className="w-full px-2.5 py-2 text-xs font-bold rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none font-mono"
                        />
                      </div>
                    </div>

                    {item.packagingOptions.some((o) => o.unit === item.receivedUnit && o.factor > 1) && (
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 mb-1">
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
                          className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none font-mono"
                        />
                      </div>
                    )}

                    <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-mono font-semibold pt-1 border-t border-emerald-200/50 dark:border-emerald-800/40">
                      Total Usable Stock: <strong>{item.receivedQuantity}</strong> units
                    </div>
                  </div>

                  {/* 2. Damaged / Transit Loss */}
                  <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span>Damaged / Transit Loss</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">
                        ৳{lineDamagedVal.toFixed(2)} Loss
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 mb-1">
                          Unit / Pack
                        </label>
                        <select
                          value={item.damagedUnit}
                          onChange={(e) =>
                            handleUpdatePackaging(item.itemId, "damaged", "unit", e.target.value)
                          }
                          className="w-full px-2.5 py-2 text-xs font-bold rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none cursor-pointer"
                        >
                          {item.packagingOptions.map((opt) => (
                            <option key={opt.unit} value={opt.unit}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 mb-1">
                          Pack Qty
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.damagedPackQty}
                          onChange={(e) =>
                            handleUpdatePackaging(item.itemId, "damaged", "packQty", e.target.value)
                          }
                          className="w-full px-2.5 py-2 text-xs font-bold rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none font-mono"
                        />
                      </div>
                    </div>

                    {item.packagingOptions.some((o) => o.unit === item.damagedUnit && o.factor > 1) && (
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 mb-1">
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
                          className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none font-mono"
                        />
                      </div>
                    )}

                    <div className="text-[11px] text-amber-800 dark:text-amber-300 font-mono font-semibold pt-1 border-t border-amber-200/50 dark:border-amber-800/40">
                      Total Damaged Units: <strong>{item.damagedQuantity}</strong> units
                    </div>
                  </div>

                  {/* 3. Missing in Transit */}
                  <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                        <ShieldAlert className="h-4 w-4 text-rose-600" />
                        <span>Missing in Transit</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-rose-700 dark:text-rose-400">
                        ৳{lineMissingVal.toFixed(2)} Loss
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-rose-800 dark:text-rose-300 mb-1">
                          Unit / Pack
                        </label>
                        <select
                          value={item.missingUnit}
                          onChange={(e) =>
                            handleUpdatePackaging(item.itemId, "missing", "unit", e.target.value)
                          }
                          className="w-full px-2.5 py-2 text-xs font-bold rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none cursor-pointer"
                        >
                          {item.packagingOptions.map((opt) => (
                            <option key={opt.unit} value={opt.unit}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-rose-800 dark:text-rose-300 mb-1">
                          Pack Qty
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.missingPackQty}
                          onChange={(e) =>
                            handleUpdatePackaging(item.itemId, "missing", "packQty", e.target.value)
                          }
                          className="w-full px-2.5 py-2 text-xs font-bold rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none font-mono"
                        />
                      </div>
                    </div>

                    {item.packagingOptions.some((o) => o.unit === item.missingUnit && o.factor > 1) && (
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-rose-800 dark:text-rose-300 mb-1">
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
                          className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none font-mono"
                        />
                      </div>
                    )}

                    <div className="text-[11px] text-rose-800 dark:text-rose-300 font-mono font-semibold pt-1 border-t border-rose-200/50 dark:border-rose-800/40">
                      Total Missing Units: <strong>{item.missingQuantity}</strong> units
                    </div>
                  </div>
                </div>

                {/* Line Balance Footer */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                  <div>
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl font-bold text-[11px] ${
                        isBalanced
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse"
                      }`}
                    >
                      {isBalanced ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>100% Accounted ({totalAccounted} / {item.sentQuantity} units)</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>
                            Quantity Mismatch: {totalAccounted} / {item.sentQuantity} units ({item.sentQuantity - totalAccounted} unassigned)
                          </span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-slate-500 font-medium">
                    <span>
                      Usable Stock: <strong className="text-emerald-600 font-mono font-bold">৳{lineReceivedVal.toFixed(2)}</strong>
                    </span>
                    {(lineDamagedVal > 0 || lineMissingVal > 0) && (
                      <span>
                        Loss: <strong className="text-rose-600 font-mono font-bold">৳{(lineDamagedVal + lineMissingVal).toFixed(2)}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* STOCK VALUE & LOSS SUMMARY */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Calculator className="h-4 w-4 text-brand-primary" />
            <span>Stock Value & Loss Summary</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Dispatched Stock Value */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Dispatched Stock Value</span>
                <Package className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                ৳{Math.round(totalSentValue).toLocaleString("en-BD")}
              </div>
              <p className="text-xs text-slate-500">
                {totalSentUnits} total units dispatched from {transfer.fromBranch?.name}.
              </p>
            </div>

            {/* Received & Usable Stock Value */}
            <div className="p-5 rounded-3xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 shadow-xs space-y-1">
              <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center justify-between">
                <span>Usable Stock Credited</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-200">
                ৳{Math.round(totalReceivedValue).toLocaleString("en-BD")}
              </div>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400">
                {totalReceivedUnits} usable units will be added to {transfer.toBranch?.name} inventory.
              </p>
            </div>

            {/* Total Damaged & Missing Loss */}
            <div className="p-5 rounded-3xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 shadow-xs space-y-1">
              <div className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center justify-between">
                <span>Total Company Loss</span>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black font-mono text-amber-700 dark:text-amber-200">
                ৳{Math.round(totalLossValue).toLocaleString("en-BD")}
              </div>
              <p className="text-xs text-amber-700/80 dark:text-amber-400">
                {totalDamagedUnits + totalMissingUnits} damaged/missing units recorded as company stock loss.
              </p>
            </div>
          </div>
        </div>

        {/* Intake Inspection Notes */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Intake Inspection Notes / Observations (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Courier carton arrived intact, 2 bottles found cracked inside packaging"
            value={receiveNotes}
            onChange={(e) => setReceiveNotes(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
          />
        </div>

        {/* Final Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs">
            {hasMismatch ? (
              <span className="text-rose-600 font-bold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Please ensure all sent quantities are balanced before confirming intake.</span>
              </span>
            ) : (
              <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>All product quantities verified and ready to be credited to branch stock.</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate("stock_stock_receive")}
              className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || hasMismatch}
              className="px-7 py-3 rounded-2xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs shadow-md transition flex items-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Finalizing Intake & Crediting Stock...</span>
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
  );
}
