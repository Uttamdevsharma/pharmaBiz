"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Branch } from "@/types";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeftRight,
  ArrowLeft,
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
} from "lucide-react";

interface TransferStockViewProps {
  onNavigate: (module: any) => void;
}

interface TransferItemRow {
  id: string; // local row id
  productId: string;
  inventoryId?: string;
  batchNumber: string;
  expiryDate?: string;
  packageType: string;
  packageQuantity: number;
  conversionFactor: number;
  sentQuantity: number;
  costPrice: number;
  availableStock: number;
  productName: string;
  genericName?: string;
  unit: string;
}

export function TransferStockView({ onNavigate }: TransferStockViewProps) {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [availableInventory, setAvailableInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [stockSearch, setStockSearch] = useState("");

  const isBranchLocked = Boolean(
    user?.branchId && user?.role !== "COMPANY_OWNER" && user?.role !== "SUPER_ADMIN"
  );

  const [fromBranchId, setFromBranchId] = useState<string>(user?.branchId || "");
  const [toBranchId, setToBranchId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<TransferItemRow[]>([]);

  // Load branches
  useEffect(() => {
    async function loadBranches() {
      try {
        setLoading(true);
        const bRes = await fetchApi<Branch[]>("/branches");
        if (bRes.success && bRes.data && bRes.data.length > 0) {
          const activeBranches = bRes.data.filter((b) => b.isActive !== false);
          setBranches(activeBranches);

          // If branch manager, strictly lock to their branch
          const initialFrom = (isBranchLocked && user?.branchId) ? user.branchId : (fromBranchId || activeBranches[0].id);
          setFromBranchId(initialFrom);

          // Find first destination branch different from initialFrom
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

  // Load source branch inventory whenever fromBranchId changes
  useEffect(() => {
    async function loadSourceInventory() {
      if (!fromBranchId) return;
      try {
        setInventoryLoading(true);
        // Request branch inventory via primary endpoint with fallback
        const res = await fetchApi<any>(`/inventory/branch/${fromBranchId}?limit=500`);
        const rawList = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];

        // Filter items with positive available stock
        const inStock = rawList.filter((inv: any) => Number(inv.quantity || 0) > 0);
        setAvailableInventory(inStock);
        setItems([]); // Reset items cart on source branch change
      } catch (err) {
        console.error("Failed to load source inventory", err);
      } finally {
        setInventoryLoading(false);
      }
    }
    loadSourceInventory();
  }, [fromBranchId]);

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

  // Update destination branch options if fromBranchId changes
  const handleFromBranchChange = (newFromId: string) => {
    setFromBranchId(newFromId);
    const nextDest = branches.find((b) => b.id !== newFromId && b.isActive !== false);
    setToBranchId(nextDest?.id || "");
  };

  const handleAddItem = (inventoryItem: any) => {
    // Check if already in list
    const existingIndex = items.findIndex((i) => i.inventoryId === inventoryItem.id);
    if (existingIndex >= 0) {
      alert(
        `"${inventoryItem.productName || inventoryItem.product?.name}" (Batch: ${
          inventoryItem.batchNumber || "Default"
        }) is already in the transfer list.`
      );
      return;
    }

    const costPrice = Number(
      inventoryItem.purchasePrice ?? inventoryItem.basePrice ?? inventoryItem.product?.basePrice ?? 0
    );
    const available = Number(inventoryItem.quantity || 0);
    const stripsPerBox = Number(inventoryItem.stripsPerBox || inventoryItem.product?.stripsPerBox || 10);
    const tabletsPerStrip = Number(
      inventoryItem.tabletsPerStrip || inventoryItem.product?.tabletsPerStrip || 10
    );
    const conversion = stripsPerBox * tabletsPerStrip > 1 ? stripsPerBox * tabletsPerStrip : 1;

    const newRow: TransferItemRow = {
      id: Math.random().toString(),
      productId: inventoryItem.productId,
      inventoryId: inventoryItem.id,
      batchNumber: inventoryItem.batchNumber || "DEFAULT",
      expiryDate: inventoryItem.expiryDate
        ? new Date(inventoryItem.expiryDate).toISOString().split("T")[0]
        : undefined,
      packageType: inventoryItem.packageType || inventoryItem.product?.defaultPackType || "PIECE",
      packageQuantity: 1,
      conversionFactor: conversion,
      sentQuantity: Math.min(conversion, available),
      costPrice,
      availableStock: available,
      productName: inventoryItem.productName || inventoryItem.product?.name || "Product",
      genericName: inventoryItem.genericName || inventoryItem.product?.genericName,
      unit: inventoryItem.unit || inventoryItem.product?.unit || "piece",
    };

    setItems((prev) => [...prev, newRow]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<TransferItemRow>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };

        // Recalculate sentQuantity if packageQuantity or conversionFactor changed
        if (updates.packageQuantity !== undefined || updates.conversionFactor !== undefined) {
          const calculated = Number(updated.packageQuantity) * Number(updated.conversionFactor);
          updated.sentQuantity = Math.min(calculated, updated.availableStock);
        }

        return updated;
      })
    );
  };

  const totalCostValue = items.reduce((acc, item) => acc + item.sentQuantity * item.costPrice, 0);
  const totalSentUnits = items.reduce((acc, item) => acc + item.sentQuantity, 0);

  // Filter available stock by search query
  const filteredStock = availableInventory.filter((inv) => {
    if (!stockSearch) return true;
    const q = stockSearch.toLowerCase();
    const name = (inv.productName || inv.product?.name || "").toLowerCase();
    const generic = (inv.genericName || inv.product?.genericName || "").toLowerCase();
    const batch = (inv.batchNumber || "").toLowerCase();
    const sku = (inv.sku || inv.product?.sku || "").toLowerCase();
    return name.includes(q) || generic.includes(q) || batch.includes(q) || sku.includes(q);
  });

  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fromBranchId) {
      setError("Please select a source branch.");
      return;
    }

    if (!toBranchId) {
      setError("Please select a destination branch.");
      return;
    }

    if (fromBranchId === toBranchId) {
      setError("Source branch and destination branch cannot be the same.");
      return;
    }

    if (items.length === 0) {
      setError("Please select at least one medication batch to transfer.");
      return;
    }

    for (const item of items) {
      if (item.sentQuantity <= 0) {
        setError(`Sent quantity for "${item.productName}" must be greater than 0.`);
        return;
      }
      if (item.sentQuantity > item.availableStock) {
        setError(
          `Sent quantity for "${item.productName}" (${item.sentQuantity}) exceeds available stock (${item.availableStock}).`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        fromBranchId,
        toBranchId,
        notes: notes.trim() || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          inventoryId: i.inventoryId,
          batchNumber: i.batchNumber,
          expiryDate: i.expiryDate ? new Date(i.expiryDate).toISOString() : undefined,
          packageType: i.packageType,
          packageQuantity: i.packageQuantity,
          conversionFactor: i.conversionFactor,
          sentQuantity: i.sentQuantity,
          costPrice: i.costPrice,
        })),
      };

      const res = await fetchApi("/transfers", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to dispatch stock transfer");
      }

      setSuccess(true);
      setTimeout(() => {
        onNavigate("stock_transfer_history");
      }, 1200);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const fromBranchName = branches.find((b) => b.id === fromBranchId)?.name || "Assigned Branch";

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
            Select batches with specific packaging units and purchase/cost prices. Transferred quantities are immediately deducted from the source branch.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("stock_transfer_history")}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Transfer Ledger</span>
        </button>
      </div>

      {/* Success Alert */}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <div className="font-bold text-sm">Stock Transfer Dispatched Successfully!</div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
              Source stock has been deducted and shipment is now in transit. Redirecting to ledger...
            </p>
          </div>
        </div>
      )}

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
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <strong>Single Branch Detected: </strong>
            Your pharmacy currently has only 1 active branch ({branches[0]?.name || "Main Branch"}). Inter-branch stock transfers require at least 2 branches. Create an additional branch under <strong>Branch Management</strong> to transfer stock.
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitTransfer} className="space-y-6">
        {/* Branch Routing Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Store className="h-4 w-4 text-brand-primary" />
              <span>Branch Routing</span>
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              Valuation: Actual Purchase / Cost Price (৳)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* From (Source Branch) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <span>From (Source Branch)</span>
                <span className="text-red-500">*</span>
                {isBranchLocked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    <Lock className="h-2.5 w-2.5" /> Assigned Branch (Locked)
                  </span>
                )}
              </label>
              {isBranchLocked ? (
                <input
                  type="text"
                  disabled
                  value={`${fromBranchName}`}
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-not-allowed"
                />
              ) : (
                <select
                  required
                  value={fromBranchId}
                  onChange={(e) => handleFromBranchChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer"
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
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                To (Destination Branch) <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={toBranchId}
                disabled={availableDestinations.length === 0}
                onChange={(e) => setToBranchId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Transfer Notes / Dispatch Reason (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Urgent stock requisition for outpatient counter"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
            />
          </div>
        </div>

        {/* Available Source Stock Selection Drawer */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="h-4 w-4 text-brand-primary" />
                <span>Available Inventory Batches at Source Branch</span>
              </div>
              <div className="text-xs font-semibold text-slate-400 mt-0.5">
                Loaded from <strong>{fromBranchName}</strong> ({availableInventory.length} batches in-stock)
              </div>
            </div>

            {availableInventory.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by name, generic, batch..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none"
                />
              </div>
            )}
          </div>

          {inventoryLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
              <span>Loading source branch stock batches...</span>
            </div>
          ) : availableInventory.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <Package className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="font-bold text-slate-600 dark:text-slate-400">
                No active in-stock inventory found at {fromBranchName}.
              </p>
              <p className="text-[11px]">
                Make sure stock has been added to this branch via Inward Stock / Purchases before initiating a transfer.
              </p>
            </div>
          ) : filteredStock.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching inventory batches found for "{stockSearch}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
              {filteredStock.map((inv) => {
                const isSelected = items.some((i) => i.inventoryId === inv.id);
                const costPrice = Number(
                  inv.purchasePrice ?? inv.basePrice ?? inv.product?.basePrice ?? 0
                );
                const prodName = inv.productName || inv.product?.name || "Product";
                const genName = inv.genericName || inv.product?.genericName;

                return (
                  <div
                    key={inv.id}
                    className={`p-3.5 rounded-2xl border transition flex flex-col justify-between space-y-2.5 ${
                      isSelected
                        ? "bg-brand-primary/5 border-brand-primary/40 opacity-70"
                        : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-brand-primary/50"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                          {prodName}
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                          {inv.quantity} in-stock
                        </span>
                      </div>
                      {genName && (
                        <div className="text-[10px] text-slate-400 mt-0.5">{genName}</div>
                      )}
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
                        <strong className="text-brand-primary font-bold">
                          ৳{costPrice.toFixed(2)}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSelected}
                      onClick={() => handleAddItem(inv)}
                      className={`w-full py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                          : "bg-brand-primary hover:bg-brand-primary/90 text-white shadow-xs active:scale-98"
                      }`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{isSelected ? "Added to Transfer" : "Add to Transfer"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Transfer Items Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="h-4 w-4 text-brand-primary" />
                <span>Medications to Transfer ({items.length})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Specify packaging units and quantities. Sent values are calculated using purchase/cost prices.
              </p>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No medications selected yet. Click "Add to Transfer" on the batches above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Medication & Batch</th>
                    <th className="py-3.5 px-4">Packaging Unit</th>
                    <th className="py-3.5 px-4">Package Qty</th>
                    <th className="py-3.5 px-4">Units / Pack</th>
                    <th className="py-3.5 px-4">Total Sent (Units)</th>
                    <th className="py-3.5 px-4">Cost Price (৳)</th>
                    <th className="py-3.5 px-4">Transfer Value (৳)</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {items.map((item) => {
                    const lineValue = item.sentQuantity * item.costPrice;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.productName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Batch: {item.batchNumber} {item.expiryDate ? `| Exp: ${item.expiryDate}` : ""}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Available in source stock: {item.availableStock} {item.unit}s
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={item.packageType}
                            onChange={(e) => handleUpdateItem(item.id, { packageType: e.target.value })}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs"
                          >
                            <option value="BOX">BOX</option>
                            <option value="STRIP">STRIP</option>
                            <option value="BOTTLE">BOTTLE</option>
                            <option value="PIECE">PIECE</option>
                            <option value="VIAL">VIAL</option>
                            <option value="TABLET">TABLET</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4">
                          <input
                            type="number"
                            min="1"
                            value={item.packageQuantity}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                packageQuantity: Math.max(1, parseInt(e.target.value) || 1),
                              })
                            }
                            className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs font-mono"
                          />
                        </td>

                        <td className="py-3.5 px-4">
                          <input
                            type="number"
                            min="1"
                            value={item.conversionFactor}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                conversionFactor: Math.max(1, parseInt(e.target.value) || 1),
                              })
                            }
                            className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs font-mono"
                          />
                        </td>

                        <td className="py-3.5 px-4 font-black font-mono text-slate-900 dark:text-white">
                          <input
                            type="number"
                            min="1"
                            max={item.availableStock}
                            value={item.sentQuantity}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                sentQuantity: Math.min(
                                  item.availableStock,
                                  Math.max(1, parseInt(e.target.value) || 1)
                                ),
                              })
                            }
                            className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs font-mono"
                          />
                        </td>

                        <td className="py-3.5 px-4 font-bold font-mono text-slate-700 dark:text-slate-300">
                          ৳{item.costPrice.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 font-black font-mono text-brand-primary text-sm">
                          ৳{lineValue.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
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

          {/* Transfer Summary Footer */}
          {items.length > 0 && (
            <div className="p-6 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6 text-xs">
                <div>
                  <span className="text-slate-400">Total Items: </span>
                  <strong className="text-slate-900 dark:text-white font-bold">{items.length}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Total Sent Units: </span>
                  <strong className="text-slate-900 dark:text-white font-bold">{totalSentUnits}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Total Transfer Cost Value: </span>
                  <strong className="text-brand-primary font-black text-sm">
                    ৳{totalCostValue.toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate("stock_transfer_history")}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || items.length === 0 || availableDestinations.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-bold shadow-sm transition flex items-center gap-2 disabled:opacity-50 active:scale-98"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Dispatching Shipment...</span>
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
      </form>
    </div>
  );
}
