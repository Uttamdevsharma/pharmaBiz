"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { Branch } from "@/types";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeftRight,
  ArrowLeft,
  Search,
  Store,
  Boxes,
  Truck,
  History,
  CheckCircle2,
  AlertCircle,
  Package,
  Send,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Layers,
} from "lucide-react";

interface TransferStockViewProps {
  onNavigate: (module: any) => void;
}

interface GodownBatch {
  inventoryId: string;
  batchNumber: string;
  expiryDate?: string;
  totalQuantity: number;
  allocatedToShop: number;
  godownUnits: number;
  hasBoxPacking: boolean;
  boxSize: number; // stripsPerBox * tabletsPerStrip (or 1)
  godownBoxes: number;
  godownLooseUnits: number;
  costPrice: number;
  packageType: string;
  rawInv: any;
}

interface GodownProductGroup {
  productId: string;
  name: string;
  genericName?: string;
  category?: string;
  unit: string;
  hasBoxPacking: boolean;
  boxSize: number;
  totalGodownUnits: number;
  totalGodownBoxes: number;
  batches: GodownBatch[];
}

type ViewStep = "PRODUCT_LIST" | "BATCH_LIST" | "TRANSFER_FORM";

export function TransferStockView({ onNavigate }: TransferStockViewProps) {
  const { user } = useAuth();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successTransfer, setSuccessTransfer] = useState<any | null>(null);

  const isBranchLocked = Boolean(
    user?.branchId && user?.role !== "COMPANY_OWNER" && user?.role !== "SUPER_ADMIN"
  );

  const [fromBranchId, setFromBranchId] = useState<string>(user?.branchId || "");

  // Navigation Steps: 1. Products -> 2. Batches -> 3. Dedicated Transfer Form Page
  const [currentStep, setCurrentStep] = useState<ViewStep>("PRODUCT_LIST");
  const [selectedProduct, setSelectedProduct] = useState<GodownProductGroup | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<GodownBatch | null>(null);

  // Search & Pagination: Products Table
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [productLimit, setProductLimit] = useState(10);

  // Search & Pagination: Batches Table
  const [batchSearch, setBatchSearch] = useState("");
  const [batchPage, setBatchPage] = useState(1);
  const [batchLimit, setBatchLimit] = useState(10);

  // Transfer Form State
  const [toBranchId, setToBranchId] = useState<string>("");
  const [transferMode, setTransferMode] = useState<"BOX" | "PIECE">("BOX");
  const [quantityInput, setQuantityInput] = useState<number>(1);
  const [courierName, setCourierName] = useState<string>("");
  const [customCourierName, setCustomCourierName] = useState<string>("");
  const [trackingId, setTrackingId] = useState<string>("");
  const [deliveryPersonName, setDeliveryPersonName] = useState<string>("");
  const [deliveryPersonContact, setDeliveryPersonContact] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Raw inventory from server
  const [rawInventory, setRawInventory] = useState<any[]>([]);

  // 1. Load branches
  useEffect(() => {
    async function loadBranches() {
      try {
        setLoadingBranches(true);
        const res = await fetchApi<Branch[]>("/branches");
        if (res.success && res.data && res.data.length > 0) {
          const active = res.data.filter((b) => b.isActive !== false);
          setBranches(active);
          const initialFrom = isBranchLocked && user?.branchId ? user.branchId : fromBranchId || active[0].id;
          setFromBranchId(initialFrom);
        }
      } catch (err) {
        console.error("Failed to load branches", err);
      } finally {
        setLoadingBranches(false);
      }
    }
    loadBranches();
  }, [user?.branchId, isBranchLocked]);

  // 2. Load inventory for fromBranchId
  const loadSourceInventory = async () => {
    if (!fromBranchId) return;
    try {
      setInventoryLoading(true);
      setError(null);
      const res = await fetchApi<any>(`/inventory/branch/${fromBranchId}?limit=500`);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setRawInventory(list);
    } catch (err: any) {
      console.error("Failed to load inventory", err);
      setError(err.message || "Failed to load branch inventory");
    } finally {
      setInventoryLoading(false);
    }
  };

  useEffect(() => {
    loadSourceInventory();
  }, [fromBranchId]);

  // Available destination branches
  const destinationBranches = useMemo(() => {
    return branches.filter((b) => b.id !== fromBranchId && b.isActive !== false);
  }, [branches, fromBranchId]);

  // Keep toBranchId valid
  useEffect(() => {
    if (destinationBranches.length > 0) {
      if (!toBranchId || toBranchId === fromBranchId || !destinationBranches.some((b) => b.id === toBranchId)) {
        setToBranchId(destinationBranches[0].id);
      }
    } else {
      setToBranchId("");
    }
  }, [fromBranchId, destinationBranches]);

  // 3. Process inventory into Godown Product Groups (Godown Stock Only)
  const productGroups = useMemo<GodownProductGroup[]>(() => {
    const groupMap = new Map<string, GodownProductGroup>();

    for (const inv of rawInventory) {
      const product = inv.product || {};
      const productId = inv.productId || product.id;
      if (!productId) continue;

      const totalQty = Number(inv.quantity) || 0;
      const locations = inv.locations || [];
      const allocatedToShop = locations.reduce(
        (sum: number, loc: any) => sum + (Number(loc.quantity) || 0),
        0
      );
      const godownUnits = Math.max(0, totalQty - allocatedToShop);

      // Only include if godown stock is strictly positive
      if (godownUnits <= 0) continue;

      const stripsPerBox = Number(inv.stripsPerBox || product.stripsPerBox || 0);
      const tabletsPerStrip = Number(inv.tabletsPerStrip || product.tabletsPerStrip || 0);
      let boxSize = 1;
      let hasBoxPacking = false;

      if (stripsPerBox > 1 && tabletsPerStrip > 1) {
        boxSize = stripsPerBox * tabletsPerStrip;
        hasBoxPacking = true;
      } else if (stripsPerBox > 1) {
        boxSize = stripsPerBox;
        hasBoxPacking = true;
      }

      const godownBoxes = hasBoxPacking ? Math.floor(godownUnits / boxSize) : 0;
      const godownLooseUnits = hasBoxPacking ? godownUnits % boxSize : godownUnits;
      const costPrice = Number(inv.purchasePrice ?? inv.basePrice ?? product.basePrice ?? 0);

      const batchObj: GodownBatch = {
        inventoryId: inv.id,
        batchNumber: inv.batchNumber || "DEFAULT",
        expiryDate: inv.expiryDate ? new Date(inv.expiryDate).toISOString().split("T")[0] : undefined,
        totalQuantity: totalQty,
        allocatedToShop,
        godownUnits,
        hasBoxPacking,
        boxSize,
        godownBoxes,
        godownLooseUnits,
        costPrice,
        packageType: inv.packageType || product.defaultPackType || "PIECE",
        rawInv: inv,
      };

      if (!groupMap.has(productId)) {
        groupMap.set(productId, {
          productId,
          name: product.name || inv.productName || "Product",
          genericName: product.genericName || inv.genericName,
          category: product.category || inv.category,
          unit: product.unit || inv.unit || "unit",
          hasBoxPacking,
          boxSize,
          totalGodownUnits: godownUnits,
          totalGodownBoxes: godownBoxes,
          batches: [batchObj],
        });
      } else {
        const existing = groupMap.get(productId)!;
        existing.totalGodownUnits += godownUnits;
        existing.totalGodownBoxes += godownBoxes;
        existing.batches.push(batchObj);
      }
    }

    return Array.from(groupMap.values());
  }, [rawInventory]);

  // Sync selectedProduct with updated inventory
  useEffect(() => {
    if (selectedProduct) {
      const refreshed = productGroups.find((p) => p.productId === selectedProduct.productId);
      if (refreshed) {
        setSelectedProduct(refreshed);
      }
    }
  }, [productGroups]);

  // Product List Filtering & Pagination
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return productGroups;
    const q = productSearch.toLowerCase().trim();
    return productGroups.filter((pg) => {
      const name = pg.name.toLowerCase();
      const generic = (pg.genericName || "").toLowerCase();
      const category = (pg.category || "").toLowerCase();
      const hasBatch = pg.batches.some((b) => b.batchNumber.toLowerCase().includes(q));
      return name.includes(q) || generic.includes(q) || category.includes(q) || hasBatch;
    });
  }, [productGroups, productSearch]);

  useEffect(() => {
    setProductPage(1);
  }, [productSearch, fromBranchId]);

  const totalProductPages = Math.ceil(filteredProducts.length / productLimit) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (productPage - 1) * productLimit;
    return filteredProducts.slice(start, start + productLimit);
  }, [filteredProducts, productPage, productLimit]);

  // Batch List Filtering & Pagination for selectedProduct
  const filteredBatches = useMemo(() => {
    if (!selectedProduct) return [];
    if (!batchSearch.trim()) return selectedProduct.batches;
    const q = batchSearch.toLowerCase().trim();
    return selectedProduct.batches.filter((b) =>
      b.batchNumber.toLowerCase().includes(q)
    );
  }, [selectedProduct, batchSearch]);

  useEffect(() => {
    setBatchPage(1);
  }, [batchSearch, selectedProduct]);

  const totalBatchPages = Math.ceil(filteredBatches.length / batchLimit) || 1;
  const paginatedBatches = useMemo(() => {
    const start = (batchPage - 1) * batchLimit;
    return filteredBatches.slice(start, start + batchLimit);
  }, [filteredBatches, batchPage, batchLimit]);

  // Navigation Handlers
  const handleSelectProduct = (prod: GodownProductGroup) => {
    setSelectedProduct(prod);
    setBatchSearch("");
    setBatchPage(1);
    setCurrentStep("BATCH_LIST");
  };

  const handleSelectBatch = (batch: GodownBatch) => {
    setSelectedBatch(batch);
    setTransferMode(batch.hasBoxPacking && batch.godownBoxes >= 1 ? "BOX" : "PIECE");
    setQuantityInput(1);
    setError(null);
    setCurrentStep("TRANSFER_FORM");
  };

  const handleBackToProducts = () => {
    setCurrentStep("PRODUCT_LIST");
  };

  const handleBackToBatches = () => {
    setCurrentStep("BATCH_LIST");
  };

  // Form Calculations
  const calculatedSentUnits = useMemo(() => {
    if (!selectedBatch) return 0;
    if (transferMode === "BOX" && selectedBatch.boxSize > 1) {
      return quantityInput * selectedBatch.boxSize;
    }
    return quantityInput;
  }, [selectedBatch, transferMode, quantityInput]);

  const maxAllowedQty = useMemo(() => {
    if (!selectedBatch) return 0;
    if (transferMode === "BOX" && selectedBatch.boxSize > 1) {
      return selectedBatch.godownBoxes;
    }
    return selectedBatch.godownUnits;
  }, [selectedBatch, transferMode]);

  // Dispatch API Call
  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !selectedBatch) return;
    setError(null);

    if (!toBranchId) {
      setError("Please select a destination branch.");
      return;
    }
    if (fromBranchId === toBranchId) {
      setError("Source and destination branch cannot be the same.");
      return;
    }
    if (quantityInput <= 0) {
      setError("Transfer quantity must be greater than zero.");
      return;
    }
    if (calculatedSentUnits > selectedBatch.godownUnits) {
      setError(`Cannot transfer ${calculatedSentUnits} units. Only ${selectedBatch.godownUnits} units available in Godown.`);
      return;
    }

    try {
      setSubmitting(true);
      const finalCourier = courierName === "Other" ? customCourierName : courierName;
      const sentValuation = calculatedSentUnits * selectedBatch.costPrice;

      const payload = {
        fromBranchId,
        toBranchId,
        notes: notes.trim() || undefined,
        courierName: finalCourier.trim() || undefined,
        trackingId: trackingId.trim() || undefined,
        deliveryPersonName: deliveryPersonName.trim() || undefined,
        deliveryPersonContact: deliveryPersonContact.trim() || undefined,
        dispatchDate: new Date().toISOString(),
        items: [
          {
            productId: selectedProduct.productId,
            inventoryId: selectedBatch.inventoryId,
            batchNumber: selectedBatch.batchNumber,
            expiryDate: selectedBatch.expiryDate,
            packageType: transferMode === "BOX" ? "BOX" : selectedBatch.packageType,
            packageQuantity: transferMode === "BOX" ? quantityInput : null,
            conversionFactor: transferMode === "BOX" ? selectedBatch.boxSize : 1,
            sentQuantity: calculatedSentUnits,
            costPrice: selectedBatch.costPrice,
            sentValue: sentValuation,
          },
        ],
      };

      const res = await fetchApi<any>("/transfers", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setSuccessTransfer(res.data);
        setCurrentStep("PRODUCT_LIST");
        setSelectedProduct(null);
        setSelectedBatch(null);
        loadSourceInventory();
      } else {
        setError(res.message || "Failed to dispatch transfer.");
      }
    } catch (err: any) {
      console.error("Transfer dispatch failed", err);
      setError(err.message || "Transfer dispatch failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          PAGE 1: GODOWN PRODUCT LIST (TABLE + PAGINATION)
      ────────────────────────────────────────────────────────────── */}
      {currentStep === "PRODUCT_LIST" && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-none">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Stock Transfer
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-none text-xs sm:text-sm">
                <Store className="h-4 w-4 text-slate-400" />
                <span className="font-semibold text-slate-500">Source:</span>
                <select
                  disabled={isBranchLocked || loadingBranches}
                  value={fromBranchId}
                  onChange={(e) => setFromBranchId(e.target.value)}
                  className="bg-transparent font-bold text-slate-900 dark:text-white outline-none cursor-pointer disabled:opacity-60"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => onNavigate("stock_transfer_history")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none"
              >
                <History className="h-4 w-4 text-brand-primary" />
                <span>Transfer History</span>
              </button>
            </div>
          </div>

          {/* Success Banner */}
          {successTransfer && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-none flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  Transfer #{successTransfer.id?.slice(0, 8)} successfully dispatched to destination branch.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessTransfer(null)}
                className="p-1 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-none"
              >
                ✕
              </button>
            </div>
          )}

          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 rounded-none space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Godown products by name, generic, or batch..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm outline-none focus:border-brand-primary dark:text-white"
                />
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Available Godown Products: <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredProducts.length}</span>
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/75 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">SL</th>
                    <th className="py-3 px-4">Product Name & Category</th>
                    <th className="py-3 px-4">Godown Available Stock</th>
                    <th className="py-3 px-4">Godown Batches</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {inventoryLoading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={`skel-row-${idx}`} className="animate-pulse">
                        <td className="py-3 px-4 text-center">
                          <div className="h-4 w-6 bg-slate-200 dark:bg-slate-700 rounded-none mx-auto" />
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1.5">
                            <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded-none" />
                            <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800 rounded-none" />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded-none" />
                        </td>
                        <td className="py-3 px-4">
                          <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded-none" />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="h-8 w-28 bg-slate-200 dark:bg-slate-700 rounded-none ml-auto" />
                        </td>
                      </tr>
                    ))
                  ) : paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                        <Boxes className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="font-semibold text-slate-600 dark:text-slate-400">No transferable Godown stock found.</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Stock allocated to shop counters cannot be transferred. Only unallocated Godown stock appears here.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((group, index) => {
                      const sl = (productPage - 1) * productLimit + index + 1;
                      return (
                        <tr key={group.productId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-center text-xs text-slate-400">
                            {sl}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {group.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {group.genericName && <span>{group.genericName} • </span>}
                              <span>{group.category || "General"}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                            {group.hasBoxPacking && group.totalGodownBoxes > 0 ? (
                              <span>
                                {group.totalGodownBoxes} Box{group.totalGodownBoxes > 1 ? "es" : ""}{" "}
                                <span className="text-xs text-slate-500 font-normal">
                                  ({group.totalGodownUnits.toLocaleString()} {group.unit}s)
                                </span>
                              </span>
                            ) : (
                              <span>
                                {group.totalGodownUnits.toLocaleString()} {group.unit}s
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-none">
                              {group.batches.length} Batch{group.batches.length > 1 ? "es" : ""}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleSelectProduct(group)}
                              className="px-3 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-none text-xs sm:text-sm font-semibold transition inline-flex items-center gap-1.5 shadow-xs"
                            >
                              <span>View Batches</span>
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {!inventoryLoading && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/75 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-xs sm:text-sm">
                <div className="text-slate-500">
                  Page <span className="font-semibold text-slate-800 dark:text-slate-200">{productPage}</span> of{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{totalProductPages}</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Rows per page:</span>
                    <select
                      value={productLimit}
                      onChange={(e) => {
                        setProductLimit(Number(e.target.value));
                        setProductPage(1);
                      }}
                      className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs rounded-none outline-none text-slate-700 dark:text-slate-200"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setProductPage(1)}
                      disabled={productPage <= 1}
                      className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer disabled:cursor-not-allowed"
                      title="First Page"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                      disabled={productPage <= 1}
                      className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer disabled:cursor-not-allowed"
                      title="Previous Page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductPage((p) => Math.min(totalProductPages, p + 1))}
                      disabled={productPage >= totalProductPages}
                      className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer disabled:cursor-not-allowed"
                      title="Next Page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductPage(totalProductPages)}
                      disabled={productPage >= totalProductPages}
                      className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer disabled:cursor-not-allowed"
                      title="Last Page"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PAGE 2: DEDICATED BATCH LIST VIEW (TABLE + PAGINATION)
      ────────────────────────────────────────────────────────────── */}
      {currentStep === "BATCH_LIST" && selectedProduct && (
        <>
          {/* Header with Back Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackToProducts}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Products</span>
              </button>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Select Batch for Transfer
              </h1>
            </div>

            <div className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
              Total Batches in Godown: <span className="text-slate-900 dark:text-white font-bold">{selectedProduct.batches.length}</span>
            </div>
          </div>

          {/* Product Summary Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-none space-y-1">
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {selectedProduct.name}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {selectedProduct.genericName && <span>{selectedProduct.genericName} • </span>}
              <span>Category: <b>{selectedProduct.category || "General"}</b></span> •{" "}
              <span>Total Godown Available: <b className="text-brand-primary">{selectedProduct.totalGodownUnits.toLocaleString()} {selectedProduct.unit}s</b></span>
              {selectedProduct.hasBoxPacking && selectedProduct.totalGodownBoxes > 0 && (
                <span> ({selectedProduct.totalGodownBoxes} Boxes)</span>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 rounded-none">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search batch number..."
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-xs sm:text-sm outline-none focus:border-brand-primary dark:text-white"
                />
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Matching Batches: <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredBatches.length}</span>
              </div>
            </div>
          </div>

          {/* Batches Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/75 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">SL</th>
                    <th className="py-3 px-4">Batch Number</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4">Available in Godown</th>
                    <th className="py-3 px-4">Cost Price</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {paginatedBatches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                        No matching batches found for this product in Godown.
                      </td>
                    </tr>
                  ) : (
                    paginatedBatches.map((batch, index) => {
                      const sl = (batchPage - 1) * batchLimit + index + 1;
                      return (
                        <tr key={batch.inventoryId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-center text-xs text-slate-400">
                            {sl}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                            {batch.batchNumber}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">
                            {batch.expiryDate || "N/A"}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {batch.hasBoxPacking && batch.godownBoxes > 0 ? (
                              <span className="font-bold text-slate-900 dark:text-white">
                                {batch.godownBoxes} Boxes{" "}
                                {batch.godownLooseUnits > 0 && `+ ${batch.godownLooseUnits} loose `}
                                <span className="text-xs text-slate-500 font-normal">
                                  ({batch.godownUnits} {selectedProduct.unit}s)
                                </span>
                              </span>
                            ) : (
                              <span className="font-bold text-slate-900 dark:text-white">
                                {batch.godownUnits} {selectedProduct.unit}s
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                            ৳{batch.costPrice.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleSelectBatch(batch)}
                              className="px-3.5 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-none text-xs sm:text-sm font-semibold transition inline-flex items-center gap-1.5 shadow-xs"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>Transfer Stock</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/75 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-xs sm:text-sm">
              <div className="text-slate-500">
                Page <span className="font-semibold text-slate-800 dark:text-slate-200">{batchPage}</span> of{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">{totalBatchPages}</span>
              </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Rows per page:</span>
                    <select
                      value={batchLimit}
                      onChange={(e) => {
                        setBatchLimit(Number(e.target.value));
                        setBatchPage(1);
                      }}
                      className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs rounded-none outline-none text-slate-700 dark:text-slate-200"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setBatchPage(1)}
                      disabled={batchPage <= 1}
                      className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer disabled:cursor-not-allowed"
                      title="First Page"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchPage((p) => Math.max(1, p - 1))}
                      disabled={batchPage <= 1}
                      className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer disabled:cursor-not-allowed"
                      title="Previous Page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchPage((p) => Math.min(totalBatchPages, p + 1))}
                      disabled={batchPage >= totalBatchPages}
                      className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer disabled:cursor-not-allowed"
                      title="Next Page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchPage(totalBatchPages)}
                      disabled={batchPage >= totalBatchPages}
                      className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-none cursor-pointer disabled:cursor-not-allowed"
                      title="Last Page"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PAGE 3: DEDICATED FULL-PAGE DISPATCH FORM (NOT A POPUP)
      ────────────────────────────────────────────────────────────── */}
      {currentStep === "TRANSFER_FORM" && selectedProduct && selectedBatch && (
        <form onSubmit={handleDispatch} className="space-y-4">
          {/* Header with Back Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackToBatches}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition rounded-none"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Batches</span>
              </button>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Dispatch Stock Transfer
              </h1>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 rounded-none flex items-center gap-2 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Card - Exact FundTransfer Style */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 rounded-none space-y-6 max-w-4xl mx-auto">
            {/* 1. Selected Medication Details Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-none space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {selectedProduct.name}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    Batch: <b>{selectedBatch.batchNumber}</b> • Expiry: <b>{selectedBatch.expiryDate || "N/A"}</b>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-xs uppercase font-bold text-slate-400">Available Godown Stock</div>
                  <div className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {selectedBatch.godownUnits} {selectedProduct.unit}s
                    {selectedBatch.hasBoxPacking && selectedBatch.godownBoxes > 0 && (
                      <span className="text-xs font-normal"> ({selectedBatch.godownBoxes} Boxes)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Destination Branch */}
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Destination Branch *
              </label>
              <select
                value={toBranchId}
                onChange={(e) => setToBranchId(e.target.value)}
                className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-sm font-semibold outline-none focus:border-brand-primary dark:text-white cursor-pointer"
              >
                <option value="">Select Destination Branch</option>
                {destinationBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Transfer Mode Toggle (Box vs Piece) */}
            {selectedBatch.hasBoxPacking && (
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Select Unit Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={selectedBatch.godownBoxes < 1}
                    onClick={() => {
                      setTransferMode("BOX");
                      setQuantityInput(1);
                    }}
                    className={`py-2.5 px-4 text-xs sm:text-sm font-bold border rounded-none transition flex items-center justify-center gap-2 ${
                      transferMode === "BOX"
                        ? "bg-brand-primary text-white border-brand-primary"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40"
                    }`}
                  >
                    <Boxes className="h-4 w-4" />
                    <span>Transfer by Box ({selectedBatch.boxSize} Pcs)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTransferMode("PIECE");
                      setQuantityInput(Math.min(10, selectedBatch.godownUnits));
                    }}
                    className={`py-2.5 px-4 text-xs sm:text-sm font-bold border rounded-none transition flex items-center justify-center gap-2 ${
                      transferMode === "PIECE"
                        ? "bg-brand-primary text-white border-brand-primary"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <Package className="h-4 w-4" />
                    <span>Transfer by Piece ({selectedProduct.unit})</span>
                  </button>
                </div>
              </div>
            )}

            {/* 4. Quantity Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Transfer Quantity ({transferMode === "BOX" ? "Boxes" : selectedProduct.unit}) *
                </label>
                <span className="text-xs text-slate-500 font-mono">
                  Max: {maxAllowedQty} {transferMode === "BOX" ? "Boxes" : selectedProduct.unit}
                </span>
              </div>
              <input
                type="number"
                min="1"
                max={maxAllowedQty}
                value={quantityInput || ""}
                onChange={(e) => setQuantityInput(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-base font-mono font-bold outline-none focus:border-brand-primary dark:text-white"
              />
              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-mono pt-1">
                Total Units Dispatched: <b className="text-slate-900 dark:text-white">{calculatedSentUnits} {selectedProduct.unit}s</b> • Sent Valuation:{" "}
                <b className="text-brand-primary">৳{(calculatedSentUnits * selectedBatch.costPrice).toFixed(2)}</b>
              </div>
            </div>

            {/* 5. Logistics & Delivery Information */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-brand-primary" />
                <span>Logistics & Transport Details (Optional)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Courier / Method (Optional)</label>
                  <select
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-sm outline-none dark:text-white"
                  >
                    <option value="">Direct Handover / None</option>
                    <option value="Steadfast">Steadfast Courier</option>
                    <option value="Pathao">Pathao Courier</option>
                    <option value="RedX">RedX</option>
                    <option value="Paperfly">Paperfly</option>
                    <option value="Self Delivery">Self / Own Delivery</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Waybill / Tracking No (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. ST-90212 (Optional)"
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-sm outline-none focus:border-brand-primary dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Delivery Person / Driver Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Monir Hossain (Optional)"
                    value={deliveryPersonName}
                    onChange={(e) => setDeliveryPersonName(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-sm outline-none focus:border-brand-primary dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Contact Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="017XXXXXXXX (Optional)"
                    value={deliveryPersonContact}
                    onChange={(e) => setDeliveryPersonContact(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-sm outline-none focus:border-brand-primary dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Dispatch Instructions / Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Optional notes or instructions for receiving branch..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none text-sm outline-none focus:border-brand-primary dark:text-white"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleBackToBatches}
                disabled={submitting}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-none text-xs sm:text-sm font-semibold transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || destinationBranches.length === 0}
                className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-none text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                {submitting ? (
                  <span>Dispatching...</span>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Confirm & Dispatch Transfer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
