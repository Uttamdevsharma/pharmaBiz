"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Branch } from "@/types";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeftRight,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Store,
  Package,
  Calendar,
  Send,
  Boxes,
  Lock,
  Search,
  Check,
  RotateCcw,
  FileSpreadsheet,
  AlertTriangle,
  Info,
  Truck,
  Phone,
  MapPin,
  User,
  Clock,
  FileText,
  Building,
} from "lucide-react";

interface TransferStockViewProps {
  onNavigate: (module: any) => void;
}

interface PackagingOption {
  label: string;
  unit: string;
  factor: number;
}

interface SelectedTransferItem {
  id: string; // unique row id
  productId: string;
  inventoryId: string;
  batchNumber: string;
  expiryDate?: string;
  productName: string;
  genericName?: string;
  category?: string;
  baseUnit: string;
  availableStock: number; // in base units (e.g. 590 tablets)
  costPrice: number; // purchase price per base unit

  // Packaging configuration (derived rigidly from batch/product data)
  packagingOptions: PackagingOption[];
  selectedUnit: string;
  conversionFactor: number; // e.g. 100 for BOX, 10 for STRIP, 1 for TABLET
  packageQuantity: number; // e.g. 5 boxes
  maxPackageQuantity: number; // Math.floor(availableStock / conversionFactor)
  sentQuantity: number; // packageQuantity * conversionFactor
  transferValue: number; // sentQuantity * costPrice
}

export function TransferStockView({ onNavigate }: TransferStockViewProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [availableInventory, setAvailableInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockSearch, setStockSearch] = useState("");

  const [dispatchedTransfer, setDispatchedTransfer] = useState<any | null>(null);

  const isBranchLocked = Boolean(
    user?.branchId && user?.role !== "COMPANY_OWNER" && user?.role !== "SUPER_ADMIN"
  );

  const [fromBranchId, setFromBranchId] = useState<string>(user?.branchId || "");
  const [toBranchId, setToBranchId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<SelectedTransferItem[]>([]);

  // Courier Logistics State
  const [courierName, setCourierName] = useState<string>("Steadfast");
  const [customCourierName, setCustomCourierName] = useState<string>("");
  const [courierHub, setCourierHub] = useState<string>("");
  const [trackingId, setTrackingId] = useState<string>("");
  const [deliveryPersonName, setDeliveryPersonName] = useState<string>("");
  const [deliveryPersonContact, setDeliveryPersonContact] = useState<string>("");
  const [dispatchDate, setDispatchDate] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [deliveryNote, setDeliveryNote] = useState<string>("");

  // Load branches
  useEffect(() => {
    async function loadBranches() {
      try {
        setLoading(true);
        const bRes = await fetchApi<Branch[]>("/branches");
        if (bRes.success && bRes.data && bRes.data.length > 0) {
          const activeBranches = bRes.data.filter((b) => b.isActive !== false);
          setBranches(activeBranches);

          const initialFrom = isBranchLocked && user?.branchId ? user.branchId : fromBranchId || activeBranches[0].id;
          setFromBranchId(initialFrom);

          const destCandidate = activeBranches.find((b) => b.id !== initialFrom);
          if (destCandidate) {
            setToBranchId(destCandidate.id);
          }
        }
      } catch (err) {
        console.error("Failed to load branches", err);
      } finally {
        setLoading(false);
      }
    }
    loadBranches();
  }, [user?.branchId, isBranchLocked]);

  const availableDestinations = branches.filter((b) => b.id !== fromBranchId && b.isActive !== false);

  // Automatically keep toBranchId synchronized with available destination branches
  useEffect(() => {
    if (availableDestinations.length > 0) {
      if (!toBranchId || toBranchId === fromBranchId || !availableDestinations.some((b) => b.id === toBranchId)) {
        setToBranchId(availableDestinations[0].id);
      }
    } else {
      setToBranchId("");
    }
  }, [fromBranchId, branches]);

  // Load source branch inventory whenever fromBranchId changes
  useEffect(() => {
    async function loadSourceInventory() {
      if (!fromBranchId) return;
      try {
        setInventoryLoading(true);
        const res = await fetchApi<any>(`/inventory/branch/${fromBranchId}?limit=500`);
        const rawList = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        const inStock = rawList.filter((inv: any) => Number(inv.quantity || 0) > 0);
        setAvailableInventory(inStock);
        setSelectedItems([]); // Reset items cart on source branch change
      } catch (err) {
        console.error("Failed to load source inventory", err);
      } finally {
        setInventoryLoading(false);
      }
    }
    loadSourceInventory();
  }, [fromBranchId]);

  // Helper: Derive rigid packaging options from batch & product metadata
  const derivePackagingOptions = (inv: any): PackagingOption[] => {
    const stripsPerBox = Number(inv.stripsPerBox || inv.product?.stripsPerBox || 0);
    const tabletsPerStrip = Number(inv.tabletsPerStrip || inv.product?.tabletsPerStrip || 0);
    const category = (inv.category || inv.product?.category || "").toLowerCase();
    const defaultPack = (inv.packageType || inv.product?.defaultPackType || "PIECE").toUpperCase();

    const options: PackagingOption[] = [];

    if (stripsPerBox > 1 && tabletsPerStrip > 1) {
      const boxFactor = stripsPerBox * tabletsPerStrip;
      options.push({ label: `BOX (${boxFactor} Tablets)`, unit: "BOX", factor: boxFactor });
      options.push({ label: `STRIP (${tabletsPerStrip} Tablets)`, unit: "STRIP", factor: tabletsPerStrip });
      options.push({ label: `TABLET (Single Unit)`, unit: "TABLET", factor: 1 });
    } else if (stripsPerBox > 1) {
      options.push({ label: `BOX (${stripsPerBox} Units)`, unit: "BOX", factor: stripsPerBox });
      options.push({ label: `PIECE / UNIT`, unit: "PIECE", factor: 1 });
    } else if (category.includes("syrup") || defaultPack === "BOTTLE") {
      options.push({ label: "BOTTLE", unit: "BOTTLE", factor: 1 });
    } else if (category.includes("injection") || defaultPack === "VIAL" || defaultPack === "AMPOULE") {
      options.push({ label: defaultPack, unit: defaultPack, factor: 1 });
    } else {
      options.push({ label: defaultPack, unit: defaultPack, factor: 1 });
      if (defaultPack !== "PIECE" && defaultPack !== "UNIT") {
        options.push({ label: "PIECE / UNIT", unit: "PIECE", factor: 1 });
      }
    }

    return options;
  };

  // Add batch to selected transfer items
  const handleToggleAddBatch = (inv: any) => {
    const existingIndex = selectedItems.findIndex((i) => i.inventoryId === inv.id);
    if (existingIndex >= 0) {
      setSelectedItems((prev) => prev.filter((i) => i.inventoryId !== inv.id));
      return;
    }

    const costPrice = Number(inv.purchasePrice ?? inv.basePrice ?? inv.product?.basePrice ?? 0);
    const availableStock = Number(inv.quantity || 0);
    const packagingOptions = derivePackagingOptions(inv);
    const defaultOpt = packagingOptions[0];

    const maxPkg = Math.floor(availableStock / defaultOpt.factor);
    const initialPkgQty = maxPkg >= 1 ? 1 : 0;
    const initialSentUnits = initialPkgQty * defaultOpt.factor;

    const newItem: SelectedTransferItem = {
      id: Math.random().toString(),
      productId: inv.productId,
      inventoryId: inv.id,
      batchNumber: inv.batchNumber || "DEFAULT",
      expiryDate: inv.expiryDate ? new Date(inv.expiryDate).toISOString().split("T")[0] : undefined,
      productName: inv.productName || inv.product?.name || "Product",
      genericName: inv.genericName || inv.product?.genericName,
      category: inv.category || inv.product?.category,
      baseUnit: inv.unit || inv.product?.unit || "unit",
      availableStock,
      costPrice,
      packagingOptions,
      selectedUnit: defaultOpt.unit,
      conversionFactor: defaultOpt.factor,
      packageQuantity: initialPkgQty,
      maxPackageQuantity: maxPkg,
      sentQuantity: initialSentUnits,
      transferValue: initialSentUnits * costPrice,
    };

    setSelectedItems((prev) => [...prev, newItem]);
  };

  // Handle unit package change
  const handlePackagingUnitChange = (itemId: string, unitName: string) => {
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const opt = item.packagingOptions.find((o) => o.unit === unitName) || item.packagingOptions[0];
        const newMaxPkg = Math.floor(item.availableStock / opt.factor);
        const newPkgQty = Math.min(item.packageQuantity || 1, Math.max(1, newMaxPkg));
        const newSentUnits = newPkgQty * opt.factor;

        return {
          ...item,
          selectedUnit: opt.unit,
          conversionFactor: opt.factor,
          maxPackageQuantity: newMaxPkg,
          packageQuantity: newPkgQty,
          sentQuantity: newSentUnits,
          transferValue: newSentUnits * item.costPrice,
        };
      })
    );
  };

  // Handle package quantity change with strict capping
  const handlePackageQuantityChange = (itemId: string, qty: number) => {
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const validPkgQty = Math.max(1, Math.min(qty, item.maxPackageQuantity));
        const newSentUnits = validPkgQty * item.conversionFactor;

        return {
          ...item,
          packageQuantity: validPkgQty,
          sentQuantity: newSentUnits,
          transferValue: newSentUnits * item.costPrice,
        };
      })
    );
  };

  const handleRemoveSelectedItem = (id: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.id !== id));
  };

  const totalTransferValue = selectedItems.reduce((acc, i) => acc + i.transferValue, 0);
  const totalTransferUnits = selectedItems.reduce((acc, i) => acc + i.sentQuantity, 0);

  // Filter available stock for Step 2
  const filteredStock = availableInventory.filter((inv) => {
    if (!stockSearch) return true;
    const q = stockSearch.toLowerCase();
    const name = (inv.productName || inv.product?.name || "").toLowerCase();
    const generic = (inv.genericName || inv.product?.genericName || "").toLowerCase();
    const batch = (inv.batchNumber || "").toLowerCase();
    const sku = (inv.sku || inv.product?.sku || "").toLowerCase();
    return name.includes(q) || generic.includes(q) || batch.includes(q) || sku.includes(q);
  });

  // Step 1 Validation & Proceed
  const handleProceedToStep2 = () => {
    setError(null);
    if (!fromBranchId) {
      setError("Please select a valid source branch.");
      return;
    }
    if (!toBranchId) {
      setError("Please select a destination branch.");
      return;
    }
    if (fromBranchId === toBranchId) {
      setError("Source and destination branches cannot be the same.");
      return;
    }
    setCurrentStep(2);
  };

  // Step 2 Proceed
  const handleProceedToStep3 = () => {
    setError(null);
    if (selectedItems.length === 0) {
      setError("Please select at least one medication batch to transfer.");
      return;
    }
    setCurrentStep(3);
  };

  // Final Dispatch
  const handleDispatchTransfer = async () => {
    setError(null);

    if (selectedItems.length === 0) {
      setError("No medication batches selected.");
      return;
    }

    for (const item of selectedItems) {
      if (item.sentQuantity <= 0) {
        setError(`Please enter a valid transfer quantity for "${item.productName}".`);
        return;
      }
      if (item.sentQuantity > item.availableStock) {
        setError(
          `Transfer quantity for "${item.productName}" (${item.sentQuantity}) exceeds available stock (${item.availableStock}).`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      const finalCourierName = courierName === "Other" ? customCourierName : courierName;

      const payload = {
        fromBranchId,
        toBranchId,
        notes: notes.trim() || undefined,
        courierName: finalCourierName.trim() || undefined,
        courierHub: courierHub.trim() || undefined,
        trackingId: trackingId.trim() || undefined,
        deliveryPersonName: deliveryPersonName.trim() || undefined,
        deliveryPersonContact: deliveryPersonContact.trim() || undefined,
        dispatchDate: dispatchDate ? new Date(dispatchDate).toISOString() : undefined,
        deliveryNote: deliveryNote.trim() || undefined,
        items: selectedItems.map((i) => ({
          productId: i.productId,
          inventoryId: i.inventoryId,
          batchNumber: i.batchNumber,
          expiryDate: i.expiryDate ? new Date(i.expiryDate).toISOString() : undefined,
          packageType: i.selectedUnit,
          packageQuantity: i.packageQuantity,
          conversionFactor: i.conversionFactor,
          sentQuantity: i.sentQuantity,
          costPrice: i.costPrice,
        })),
      };

      const res = await fetchApi<any>("/transfers", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to dispatch stock transfer");
      }

      setDispatchedTransfer(res.data);
    } catch (err: any) {
      setError(err.message || "An error occurred while dispatching the transfer");
    } finally {
      setSubmitting(false);
    }
  };

  const fromBranchName = branches.find((b) => b.id === fromBranchId)?.name || "Assigned Branch";
  const toBranchName = branches.find((b) => b.id === toBranchId)?.name || "Destination Branch";

  // Reset to create another transfer
  const handleCreateAnother = () => {
    setDispatchedTransfer(null);
    setSelectedItems([]);
    setNotes("");
    setCurrentStep(1);
  };

  // Render Dispatched Success Screen
  if (dispatchedTransfer) {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-emerald-200 dark:border-emerald-800 shadow-xl text-center space-y-6">
          <div className="h-20 w-20 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto border border-emerald-500/20 shadow-inner">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Transfer Dispatched & In Transit
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Stock Transfer Dispatched Successfully!
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Stock has been deducted from <strong>{fromBranchName}</strong>. The destination branch manager at <strong>{toBranchName}</strong> has been notified to receive and inspect the shipment.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 text-left space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-700 text-xs font-mono">
              <span className="text-slate-400">Transfer Reference:</span>
              <strong className="text-brand-primary font-bold">
                #{dispatchedTransfer.id?.substring(0, 8)?.toUpperCase()}
              </strong>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Source Branch</span>
                <strong className="text-slate-800 dark:text-slate-200 font-bold">{fromBranchName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Destination Branch</span>
                <strong className="text-slate-800 dark:text-slate-200 font-bold">{toBranchName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Total Sent Units</span>
                <strong className="text-slate-800 dark:text-slate-200 font-bold">{totalTransferUnits} Units</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Dispatched Valuation (Cost)</span>
                <strong className="text-brand-primary font-black text-sm">৳{totalTransferValue.toFixed(2)}</strong>
              </div>
            </div>

            {/* Courier Shipment Summary */}
            {(dispatchedTransfer.courierName || dispatchedTransfer.trackingId || dispatchedTransfer.deliveryPersonName) && (
              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700/80 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
                {dispatchedTransfer.courierName && (
                  <div>
                    <span className="text-slate-400 block">Courier</span>
                    <strong className="text-slate-800 dark:text-slate-200">{dispatchedTransfer.courierName} {dispatchedTransfer.courierHub ? `(${dispatchedTransfer.courierHub})` : ""}</strong>
                  </div>
                )}
                {dispatchedTransfer.trackingId && (
                  <div>
                    <span className="text-slate-400 block">Tracking ID</span>
                    <strong className="font-mono text-brand-primary font-bold">{dispatchedTransfer.trackingId}</strong>
                  </div>
                )}
                {dispatchedTransfer.deliveryPersonName && (
                  <div>
                    <span className="text-slate-400 block">Rider / Contact</span>
                    <strong className="text-slate-800 dark:text-slate-200">{dispatchedTransfer.deliveryPersonName} {dispatchedTransfer.deliveryPersonContact ? `(${dispatchedTransfer.deliveryPersonContact})` : ""}</strong>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate("stock_transfer_history")}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>View Transfer Ledger</span>
            </button>
            <button
              type="button"
              onClick={handleCreateAnother}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Initiate Another Transfer</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Stock Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Transfer Stock</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <ArrowLeftRight className="h-6 w-6 text-brand-primary" />
            <span>Inter-Branch Stock Transfer</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Step-by-step transfer dispatch with rigid batch packaging controls and purchase/cost price valuation.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("stock_transfer_history")}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Transfer Ledger</span>
        </button>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="grid grid-cols-3 gap-2">
          {/* Step 1 Tab */}
          <div
            onClick={() => setCurrentStep(1)}
            className={`p-3 rounded-2xl cursor-pointer transition border flex items-center gap-3 ${
              currentStep === 1
                ? "bg-brand-primary/10 border-brand-primary text-brand-primary"
                : currentStep > 1
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                : "bg-slate-50 dark:bg-slate-800/40 border-transparent text-slate-400"
            }`}
          >
            <div
              className={`h-7 w-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                currentStep === 1
                  ? "bg-brand-primary text-white"
                  : currentStep > 1
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-500"
              }`}
            >
              {currentStep > 1 ? <Check className="h-4 w-4" /> : "1"}
            </div>
            <div className="overflow-hidden">
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">Step 1</div>
              <div className="text-xs font-black truncate">Branch Routing</div>
            </div>
          </div>

          {/* Step 2 Tab */}
          <div
            onClick={() => {
              if (fromBranchId && toBranchId && fromBranchId !== toBranchId) {
                setCurrentStep(2);
              }
            }}
            className={`p-3 rounded-2xl transition border flex items-center gap-3 ${
              currentStep === 2
                ? "bg-brand-primary/10 border-brand-primary text-brand-primary cursor-pointer"
                : currentStep > 2
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 cursor-pointer"
                : "bg-slate-50 dark:bg-slate-800/40 border-transparent text-slate-400"
            }`}
          >
            <div
              className={`h-7 w-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                currentStep === 2
                  ? "bg-brand-primary text-white"
                  : currentStep > 2
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-500"
              }`}
            >
              {currentStep > 2 ? <Check className="h-4 w-4" /> : "2"}
            </div>
            <div className="overflow-hidden">
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">Step 2</div>
              <div className="text-xs font-black truncate">Select Batches ({selectedItems.length})</div>
            </div>
          </div>

          {/* Step 3 Tab */}
          <div
            onClick={() => {
              if (selectedItems.length > 0) {
                setCurrentStep(3);
              }
            }}
            className={`p-3 rounded-2xl transition border flex items-center gap-3 ${
              currentStep === 3
                ? "bg-brand-primary/10 border-brand-primary text-brand-primary cursor-pointer"
                : "bg-slate-50 dark:bg-slate-800/40 border-transparent text-slate-400"
            }`}
          >
            <div
              className={`h-7 w-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                currentStep === 3
                  ? "bg-brand-primary text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-500"
              }`}
            >
              3
            </div>
            <div className="overflow-hidden">
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">Step 3</div>
              <div className="text-xs font-black truncate">Configure & Dispatch</div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Single Branch Warning */}
      {branches.length < 2 && !loading && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 rounded-2xl flex items-center gap-3 text-xs">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <strong>Single Branch Detected: </strong>
            Your pharmacy currently has only 1 active branch ({branches[0]?.name || "Main Branch"}). Inter-branch stock transfers require at least 2 branches under the same pharmacy.
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: Branch Routing View */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Store className="h-5 w-5 text-brand-primary" />
                <span>Step 1: Select Source & Destination Branches</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                The source branch is automatically set to your assigned branch. Select the target branch for stock delivery.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Pricing: Actual Purchase Cost (৳)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* From (Source Branch) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>From (Source Branch)</span>
                <span className="text-red-500">*</span>
                {isBranchLocked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    <Lock className="h-2.5 w-2.5" /> Assigned Branch (Locked)
                  </span>
                )}
              </label>
              {isBranchLocked ? (
                <div className="p-3.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Store className="h-4 w-4 text-slate-400" />
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-white">{fromBranchName}</div>
                      <div className="text-[10px] text-slate-400 font-medium">Origin Branch</div>
                    </div>
                  </div>
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
              ) : (
                <select
                  required
                  value={fromBranchId}
                  onChange={(e) => {
                    const newFrom = e.target.value;
                    setFromBranchId(newFrom);
                    const nextDest = branches.find((b) => b.id !== newFrom && b.isActive !== false);
                    setToBranchId(nextDest?.id || "");
                  }}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.location ? `(${b.location})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* To (Destination Branch) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                To (Destination Branch) <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={toBranchId}
                disabled={availableDestinations.length === 0}
                onChange={(e) => setToBranchId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none cursor-pointer disabled:opacity-50"
              >
                {availableDestinations.length === 0 ? (
                  <option value="">No other active branches available</option>
                ) : (
                  availableDestinations.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.location ? `(${b.location})` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PROFESSIONAL COURIER & DISPATCH LOGISTICS SECTION */}
          {/* ========================================================================= */}
          <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-brand-primary" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Courier Logistics & Delivery Details
                </h4>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Inter-Branch Parcel Dispatch</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Courier Company */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Courier / Delivery Company
                </label>
                <select
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="Steadfast">Steadfast Courier</option>
                  <option value="Pathao">Pathao Courier</option>
                  <option value="RedX">RedX Express</option>
                  <option value="Sundarban">Sundarban Courier</option>
                  <option value="SA Parivahan">SA Parivahan</option>
                  <option value="Internal Rider">Internal Rider / Self Delivery</option>
                  <option value="Other">Other Courier Service</option>
                </select>
                {courierName === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter Courier Service Name"
                    value={customCourierName}
                    onChange={(e) => setCustomCourierName(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                  />
                )}
              </div>

              {/* Courier Branch / Hub */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Building className="h-3 w-3 text-slate-400" />
                  <span>Courier Hub / Branch</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dhanmondi Hub, Uttara Branch"
                  value={courierHub}
                  onChange={(e) => setCourierHub(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none font-medium"
                />
              </div>

              {/* Courier Tracking / Consignment ID */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <FileText className="h-3 w-3 text-slate-400" />
                  <span>Tracking / Waybill ID</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. CN-984723910, SDFC-4821"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none"
                />
              </div>

              {/* Delivery Person Name */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <User className="h-3 w-3 text-slate-400" />
                  <span>Delivery Person / Rider Name</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mohammad Rafiq"
                  value={deliveryPersonName}
                  onChange={(e) => setDeliveryPersonName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none font-medium"
                />
              </div>

              {/* Delivery Person Contact */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-400" />
                  <span>Rider Contact Number</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 01712345678"
                  value={deliveryPersonContact}
                  onChange={(e) => setDeliveryPersonContact(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none"
                />
              </div>

              {/* Dispatch Date & Time */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span>Dispatch Date & Time</span>
                </label>
                <input
                  type="datetime-local"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                />
              </div>
            </div>

            {/* Optional Delivery Note */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Delivery & Handling Instructions (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Keep cold chain boxes upright, handle fragile saline bottles with care"
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Transfer Notes / Dispatch Reason (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Counter stock replenishment, urgent requisition"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              disabled={!fromBranchId || !toBranchId || fromBranchId === toBranchId}
              onClick={handleProceedToStep2}
              className="px-6 py-3 rounded-2xl bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50 active:scale-98"
            >
              <span>Continue to Select Batches</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: Available Inventory Batches Selection */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="h-5 w-5 text-brand-primary" />
                <span>Step 2: Available Inventory Batches at {fromBranchName}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Select the medication batches to transfer. ({availableInventory.length} in-stock batches found)
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search medication, generic, batch..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none"
              />
            </div>
          </div>

          {inventoryLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader2 className="h-7 w-7 animate-spin text-brand-primary" />
              <span>Loading source branch batches...</span>
            </div>
          ) : availableInventory.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 space-y-2">
              <Package className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="font-bold text-slate-700 dark:text-slate-300">
                No active in-stock inventory found at {fromBranchName}.
              </p>
              <p className="text-[11px]">
                Add stock via Inward Stock / Purchases before initiating a transfer.
              </p>
            </div>
          ) : filteredStock.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No matching inventory batches found for "{stockSearch}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-96 overflow-y-auto pr-1">
              {filteredStock.map((inv) => {
                const isSelected = selectedItems.some((i) => i.inventoryId === inv.id);
                const costPrice = Number(inv.purchasePrice ?? inv.basePrice ?? inv.product?.basePrice ?? 0);
                const prodName = inv.productName || inv.product?.name || "Product";
                const genName = inv.genericName || inv.product?.genericName;
                const stripsPerBox = Number(inv.stripsPerBox || inv.product?.stripsPerBox || 0);
                const tabletsPerStrip = Number(inv.tabletsPerStrip || inv.product?.tabletsPerStrip || 0);

                return (
                  <div
                    key={inv.id}
                    className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? "bg-brand-primary/10 border-brand-primary/60 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-brand-primary/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                          {prodName}
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                          {inv.quantity} in-stock
                        </span>
                      </div>
                      {genName && <div className="text-[10px] text-slate-400 mt-0.5">{genName}</div>}

                      {/* Packaging specification pill */}
                      <div className="mt-2 text-[10px] text-slate-500 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                        {stripsPerBox > 1 && tabletsPerStrip > 1 ? (
                          <span>
                            Pack: <strong>1 Box = {stripsPerBox * tabletsPerStrip} Tabs</strong> ({stripsPerBox}×{tabletsPerStrip})
                          </span>
                        ) : (
                          <span>
                            Pack Unit: <strong>{inv.packageType || inv.product?.defaultPackType || "Piece"}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                      <div>
                        <span>Batch: </span>
                        <strong className="font-mono text-slate-700 dark:text-slate-300">
                          {inv.batchNumber || "Default"}
                        </strong>
                      </div>
                      <div>
                        <span>Cost: </span>
                        <strong className="text-brand-primary font-bold">৳{costPrice.toFixed(2)}</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleAddBatch(inv)}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-brand-primary hover:bg-brand-primary/90 text-white shadow-xs active:scale-98"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Selected</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add to Transfer</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 2 Footer Navigation */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 transition flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Step 1</span>
            </button>

            <button
              type="button"
              disabled={selectedItems.length === 0}
              onClick={handleProceedToStep3}
              className="px-6 py-2.5 rounded-2xl bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50 active:scale-98"
            >
              <span>Proceed to Transfer Quantities ({selectedItems.length} items)</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: Products to Transfer (Strict Packaging & Calculations) */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden animate-in fade-in space-y-6">
          <div className="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-brand-primary" />
                <span>Step 3: Products to Transfer & Packaging Control</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Packaging configurations and units/pack are non-editable. Transfer quantities cannot exceed available batch stock.
              </p>
            </div>

            <div className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl text-slate-700 dark:text-slate-300">
              Route: <span className="text-brand-primary">{fromBranchName}</span> → <span className="text-brand-primary">{toBranchName}</span>
            </div>
          </div>

          {selectedItems.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 space-y-3">
              <p>No products selected yet.</p>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold"
              >
                Go to Step 2 to select batches
              </button>
            </div>
          ) : (
            <div className="px-6 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-3">Medication & Batch</th>
                    <th className="py-3.5 px-3">Package Unit</th>
                    <th className="py-3.5 px-3">Units / Pack (Fixed)</th>
                    <th className="py-3.5 px-3">Package Qty</th>
                    <th className="py-3.5 px-3">Total Sent (Units)</th>
                    <th className="py-3.5 px-3">Cost Price (৳)</th>
                    <th className="py-3.5 px-3">Transfer Value (৳)</th>
                    <th className="py-3.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {selectedItems.map((item) => {
                    const isExceeding = item.packageQuantity > item.maxPackageQuantity;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        {/* Medication Info */}
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.productName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Batch: {item.batchNumber} {item.expiryDate ? `| Exp: ${item.expiryDate}` : ""}
                          </div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                            Available In-Stock: {item.availableStock} {item.baseUnit}s
                          </div>
                        </td>

                        {/* Package Unit Selector (Derived from Batch) */}
                        <td className="py-3.5 px-3">
                          <select
                            value={item.selectedUnit}
                            onChange={(e) => handlePackagingUnitChange(item.id, e.target.value)}
                            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs cursor-pointer outline-none"
                          >
                            {item.packagingOptions.map((opt) => (
                              <option key={opt.unit} value={opt.unit}>
                                {opt.unit}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Units / Pack (Strictly Non-Editable) */}
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {item.conversionFactor} {item.baseUnit}s / {item.selectedUnit}
                          </span>
                        </td>

                        {/* Package Quantity Input (Strictly Capped) */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-1">
                            <input
                              type="number"
                              min="1"
                              max={item.maxPackageQuantity}
                              value={item.packageQuantity}
                              onChange={(e) =>
                                handlePackageQuantityChange(
                                  item.id,
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className={`w-20 px-2.5 py-1.5 rounded-xl border font-bold text-xs font-mono outline-none ${
                                isExceeding
                                  ? "border-red-500 bg-red-50 text-red-700"
                                  : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                              }`}
                            />
                            <div className="text-[10px] text-slate-400">
                              Max: {item.maxPackageQuantity} {item.selectedUnit}s
                            </div>
                          </div>
                        </td>

                        {/* Total Sent Units */}
                        <td className="py-3.5 px-3">
                          <div className="font-black font-mono text-slate-900 dark:text-white text-xs">
                            {item.sentQuantity} {item.baseUnit}s
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ({item.packageQuantity} × {item.conversionFactor})
                          </div>
                        </td>

                        {/* Cost Price */}
                        <td className="py-3.5 px-3 font-bold font-mono text-slate-700 dark:text-slate-300">
                          ৳{item.costPrice.toFixed(2)}
                        </td>

                        {/* Line Total Value */}
                        <td className="py-3.5 px-3 font-black font-mono text-brand-primary text-sm">
                          ৳{item.transferValue.toFixed(2)}
                        </td>

                        {/* Action Remove */}
                        <td className="py-3.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedItem(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Step 3 Footer Summary & Action */}
          {selectedItems.length > 0 && (
            <div className="p-6 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6 text-xs">
                <div>
                  <span className="text-slate-400">Medications: </span>
                  <strong className="text-slate-900 dark:text-white font-bold">{selectedItems.length}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Total Sent Units: </span>
                  <strong className="text-slate-900 dark:text-white font-bold">{totalTransferUnits}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Total Valuation (Cost Price): </span>
                  <strong className="text-brand-primary font-black text-base">
                    ৳{totalTransferValue.toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Batches</span>
                </button>

                <button
                  type="button"
                  disabled={submitting || selectedItems.length === 0}
                  onClick={handleDispatchTransfer}
                  className="px-7 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50 active:scale-98"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Dispatching Stock Transfer...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Dispatch Stock Transfer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
