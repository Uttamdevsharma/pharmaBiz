"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { fetchApi } from "@/lib/api";
import { InventoryItem } from "@/types";
import { useBranchContext } from "@/context/BranchContext";
import {
  calculatePackaging,
  calculateLocationPackaging,
  calculateBatchBulkPackaging,
  PackagingConfig,
} from "@/lib/packaging";
import { OwnerModule } from "./DashboardSidebar";
import {
  Boxes,
  Plus,
  Search,
  Store,
  MapPin,
  Loader2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
  Barcode,
  Calendar,
  ChevronRight,
  Package,
  Sparkles,
  Layers,
} from "lucide-react";

export interface BatchStockItem extends InventoryItem {
  isExpired: boolean;
  daysLeft: number | null;
  inRackQty: number;
  notInRackQty: number;
  primaryLocation: string;
}

interface StockListViewProps {
  onNavigate: (module: OwnerModule, extraParams?: any) => void;
  selectedBranchId?: string;
}

let cachedStockList: InventoryItem[] = [];

export function StockListView({ onNavigate, selectedBranchId: propBranchId }: StockListViewProps) {
  const {
    selectedBranchId: contextBranchId,
    currentBranch,
  } = useBranchContext();

  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;
  const [rawInventory, setRawInventory] = useState<InventoryItem[]>(() => cachedStockList);
  const [loading, setLoading] = useState(() => cachedStockList.length === 0);

  // Search state & Auto-suggest dropdown
  const [search, setSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Selected Batch for POS-style instant detail view
  const [selectedBatch, setSelectedBatch] = useState<BatchStockItem | null>(null);

  // Load branch inventory batches
  const loadBranchStock = async () => {
    try {
      if (cachedStockList.length === 0) setLoading(true);
      const params = new URLSearchParams();
      params.append("limit", "1000");

      const targetPath =
        effectiveBranchId && effectiveBranchId !== "all"
          ? `/inventory/branch/${effectiveBranchId}?${params.toString()}`
          : `/inventory/branch/all?${params.toString()}`;

      const res = await fetchApi(targetPath);
      if (res.success && res.data) {
        cachedStockList = res.data;
        setRawInventory(res.data);
      }
    } catch (err) {
      console.error("Failed to load branch stock", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranchStock();
  }, [effectiveBranchId]);

  // Click outside to close auto-suggest dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format and sort all batches by FEFO (Earliest Expiry Date First)
  const sortedBatches: BatchStockItem[] = useMemo(() => {
    const now = new Date();

    const mapped = rawInventory.map((item) => {
      const exp = item.expiryDate ? new Date(item.expiryDate) : null;
      const isExpired = exp ? exp < now : false;
      const daysLeft = exp ? Math.ceil((exp.getTime() - now.getTime()) / 86400000) : null;

      // In-Rack stock
      let inRackQty = 0;
      if (item.locations && Array.isArray(item.locations)) {
        for (const loc of item.locations) {
          inRackQty += loc.quantity || 0;
        }
      }
      const notInRackQty = Math.max(0, (item.quantity || 0) - inRackQty);

      // Primary location summary
      let primaryLocation = "Not in Rack";
      if (item.locations && item.locations.length > 0) {
        const first = item.locations[0];
        const rName = first.rack?.name || first.rackName || "R01";
        const sName = first.shelf?.name || first.shelfName || "S01";
        const bName = first.bin?.name || first.binName || "B01";
        primaryLocation = `${rName}-${sName}-${bName}`;
        if (item.locations.length > 1) {
          primaryLocation += ` (+${item.locations.length - 1} more)`;
        }
      }

      return {
        ...item,
        isExpired,
        daysLeft,
        inRackQty,
        notInRackQty,
        primaryLocation,
      };
    });

    return mapped.sort((a, b) => {
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
    });
  }, [rawInventory]);

  // Keep selectedBatch in sync if inventory reloads
  useEffect(() => {
    if (selectedBatch) {
      const updated = sortedBatches.find((b) => b.id === selectedBatch.id);
      if (updated) setSelectedBatch(updated);
    }
  }, [sortedBatches]);

  // Pagination / Chunk Loading (20 at a time on scroll for smooth performance)
  const [visibleCount, setVisibleCount] = useState(20);

  // Reset pagination when search query changes
  useEffect(() => {
    setVisibleCount(20);
  }, [search]);

  // Filter all matching batches for the current query
  const filteredBatches = useMemo(() => {
    if (!search.trim()) return sortedBatches;
    const q = search.toLowerCase().trim();

    return sortedBatches.filter((item) => {
      const matchName = (item.productName || "").toLowerCase().includes(q);
      const matchGen = (item.genericName || "").toLowerCase().includes(q);
      const matchBarcode = (item.barcode || "").toLowerCase().includes(q);
      const matchSku = (item.sku || "").toLowerCase().includes(q);
      const matchBatch = (item.batchNumber || "").toLowerCase().includes(q);
      return matchName || matchGen || matchBarcode || matchSku || matchBatch;
    });
  }, [sortedBatches, search]);

  // Paginated visible batches (starts with 20, loads 20 more on scroll)
  const visibleSearchResults = useMemo(() => {
    return filteredBatches.slice(0, visibleCount);
  }, [filteredBatches, visibleCount]);

  // Handle scroll in dropdown to load next 20 items
  const handleDropdownScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 60) {
      if (visibleCount < filteredBatches.length) {
        setVisibleCount((prev) => Math.min(prev + 20, filteredBatches.length));
      }
    }
  };

  // Handler: Select a batch
  const handleSelectBatch = (batchItem: BatchStockItem) => {
    setSelectedBatch(batchItem);
    setIsSearchOpen(false);
  };

  // Handler: Navigate to stock allocation
  const handleNavigateToAllocate = (batchId: string, productId?: string) => {
    onNavigate("stock_stock_allocation", {
      batchId,
      productId: productId || selectedBatch?.productId,
    });
  };

  // Calculated details for Selected Batch
  const selectedBatchDetails = useMemo(() => {
    if (!selectedBatch) return null;

    const packConfig: PackagingConfig = {
      packageType: selectedBatch.packageType || "MEDICINE",
      boxesPerCarton: selectedBatch.boxesPerCarton || 10,
      stripsPerBox: selectedBatch.stripsPerBox || 10,
      tabletsPerStrip: selectedBatch.tabletsPerStrip || 10,
      unit: selectedBatch.unit || "tablet",
    };

    const overallPackaging = calculatePackaging(selectedBatch.quantity || 0, packConfig);

    const locationsList: Array<{
      id: string;
      rackName: string;
      shelfName: string;
      binName: string;
      locationLabel: string;
      quantity: number;
      fullBoxes: number;
      openBoxes: number;
      displayText: string;
    }> = [];

    let inRack = 0;
    if (selectedBatch.locations && Array.isArray(selectedBatch.locations)) {
      for (const loc of selectedBatch.locations) {
        if (loc.quantity > 0) {
          inRack += loc.quantity;
          const locPkg = calculateLocationPackaging(loc.quantity, packConfig);
          const rName = loc.rack?.name || loc.rackName || "R01";
          const sName = loc.shelf?.name || loc.shelfName || "S01";
          const bName = loc.bin?.name || loc.binName || "B01";
          const locationLabel =
            loc.locationLabel ||
            `${rName} ➔ ${sName} ➔ ${bName}`;

          locationsList.push({
            id: loc.id || `${selectedBatch.id}-${rName}-${sName}-${bName}`,
            rackName: rName,
            shelfName: sName,
            binName: bName,
            locationLabel,
            quantity: loc.quantity,
            fullBoxes: loc.fullBoxes ?? locPkg.fullBoxes,
            openBoxes: loc.openBoxes ?? locPkg.openBoxes,
            displayText: loc.displayText || locPkg.displayText,
          });
        }
      }
    }

    const notInRack = Math.max(0, (selectedBatch.quantity || 0) - inRack);
    const bulkUnallocatedPkg = calculateBatchBulkPackaging(selectedBatch, notInRack, packConfig);

    // Other batches for the same product
    const otherBatches = sortedBatches.filter(
      (b) => b.productId === selectedBatch.productId && b.id !== selectedBatch.id
    );

    return {
      packConfig,
      overallPackaging,
      locationsList,
      inRack,
      notInRack,
      bulkUnallocatedPkg,
      otherBatches,
    };
  }, [selectedBatch, sortedBatches]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Stock Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Stock List</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Boxes className="h-7 w-7 text-brand-primary" />
            Stock List
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
            <Store className="h-4 w-4 text-brand-primary shrink-0" />
            <span>{currentBranch?.name || (effectiveBranchId ? "Current Branch" : "All Branches")}</span>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("stock_add_stock")}
            className="h-11 px-5 bg-brand-primary hover:opacity-90 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-md shadow-brand-primary/20 cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Receive Stock</span>
          </button>
        </div>
      </div>

      {/* Prominent Search Bar (Constrained Width for Clean Balance) */}
      <div ref={searchContainerRef} className="relative z-30 max-w-3xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search medicine by name, generic, barcode, batch #..."
            value={search}
            onClick={() => {
              setIsSearchOpen(true);
            }}
            onFocus={() => {
              setIsSearchOpen(true);
            }}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsSearchOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filteredBatches.length > 0) {
                const exactBarcode = filteredBatches.find(
                  (item) => item.barcode?.toLowerCase() === search.trim().toLowerCase()
                );
                if (exactBarcode) {
                  handleSelectBatch(exactBarcode);
                } else {
                  handleSelectBatch(filteredBatches[0]);
                }
              }
            }}
            className="w-full pl-12 pr-12 h-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-brand-primary rounded-2xl text-base font-bold text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm outline-none transition"
          />

          {search ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                searchInputRef.current?.focus();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        {/* Auto-Suggest Dropdown - Paginated & Scrollable */}
        {isSearchOpen && (
          <div
            onScroll={handleDropdownScroll}
            className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 overscroll-contain"
          >
            {loading ? (
              <div className="p-8 text-center text-slate-400 font-bold text-sm flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
                <span>Loading available stocks...</span>
              </div>
            ) : visibleSearchResults.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-bold text-sm">
                No matching medicine batch found
              </div>
            ) : (
              <>
                {visibleSearchResults.map((item, idx) => {
                  const barcodeVal = item.barcode || item.sku || "";
                  const variantStr = item.size || (item.unit ? `Unit: ${item.unit}` : "");

                  return (
                    <div
                      key={`${item.id}-${idx}`}
                      onClick={() => handleSelectBatch(item)}
                      className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      {/* Left: Product Name + Batch + Generic + Variant */}
                      <div className="space-y-1 min-w-0">
                        <div className="text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                          <span className="text-slate-900 dark:text-white font-extrabold text-base">
                            {item.productName}
                          </span>
                          <span className="text-xs font-black font-mono bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-2 py-0.5 rounded-md">
                            Batch: {item.batchNumber || "Default"}
                          </span>
                          {barcodeVal && (
                            <span className="text-slate-400 font-mono text-xs">
                              ({barcodeVal})
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2 flex-wrap">
                          {item.genericName && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              {item.genericName}
                            </span>
                          )}
                          {variantStr && (
                            <span className="text-slate-500 dark:text-slate-400">
                              • Variant: <strong className="text-slate-700 dark:text-slate-300">{variantStr}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Stock Pill + Expiry Pill (Location removed as requested) */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
                          Stock: {item.quantity.toLocaleString()}
                        </span>

                        {item.isExpired ? (
                          <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-rose-50 text-rose-700 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50">
                            Expired
                          </span>
                        ) : item.daysLeft !== null ? (
                          <span
                            className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                              item.daysLeft <= 90
                                ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50"
                                : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50"
                            }`}
                          >
                            {item.daysLeft}d left
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl text-xs font-medium text-slate-400">
                            No Expiry
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Infinite Scroll Indicator */}
                {visibleCount < filteredBatches.length && (
                  <div className="p-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-primary" />
                    <span>Scroll down for more ({visibleSearchResults.length} of {filteredBatches.length})</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. SELECTED BATCH SINGLE-SCREEN DETAIL VIEW                               */}
      {/* ========================================================================= */}
      {selectedBatch && selectedBatchDetails ? (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Hero Header */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            {/* Top Row: Back button & Expiry Status */}
            <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setSelectedBatch(null);
                  setSearch("");
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs sm:text-sm transition inline-flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <ArrowLeft className="h-4 w-4 text-slate-500" />
                <span>← Search Another Medicine</span>
              </button>

              {/* Expiry Badge */}
              <div>
                {selectedBatch.isExpired ? (
                  <div className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>Expired ({selectedBatch.expiryDate ? new Date(selectedBatch.expiryDate).toLocaleDateString() : "N/A"})</span>
                  </div>
                ) : selectedBatch.daysLeft !== null ? (
                  <div
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black border flex items-center gap-2 ${
                      selectedBatch.daysLeft <= 90
                        ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/50"
                        : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50"
                    }`}
                  >
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>
                      Expiry: <strong className="font-mono">{selectedBatch.daysLeft} days left</strong>
                      {selectedBatch.expiryDate && (
                        <span className="opacity-75 font-normal ml-1">
                          ({new Date(selectedBatch.expiryDate).toLocaleDateString()})
                        </span>
                      )}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Main Product Details */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {selectedBatch.productName}
                </h3>
                {selectedBatch.genericName && (
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedBatch.genericName}
                  </div>
                )}
              </div>

              {/* Metadata Badges */}
              <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                <div className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-black text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 font-bold mr-1.5">Batch:</span>
                  <span className="font-mono text-sm font-extrabold">{selectedBatch.batchNumber || "Default"}</span>
                </div>

                {(selectedBatch.barcode || selectedBatch.sku) && (
                  <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 font-mono">
                    <Barcode className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{selectedBatch.barcode || selectedBatch.sku}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top 2 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card 1: Batch Total Stock */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Batch Total Stock</span>
                  <span className="font-mono">
                    {selectedBatch.quantity.toLocaleString()} {selectedBatch.unit || "units"}
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-black font-mono text-slate-900 dark:text-white mt-1">
                  {selectedBatch.quantity.toLocaleString()}{" "}
                  <span className="text-base font-bold text-slate-500">{selectedBatch.unit || "units"}</span>
                </div>
                <div className="text-xs font-bold text-brand-primary mt-1">
                  📦 {selectedBatchDetails.overallPackaging.displayText || `${selectedBatch.quantity} units`}
                </div>
              </div>

              {/* Visual Split Bar */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    In Shelves: {selectedBatchDetails.inRack.toLocaleString()} ({selectedBatch.quantity > 0 ? Math.round((selectedBatchDetails.inRack / selectedBatch.quantity) * 100) : 0}%)
                  </span>
                  <span className="text-amber-600 dark:text-amber-400">
                    Unallocated: {selectedBatchDetails.notInRack.toLocaleString()} ({selectedBatch.quantity > 0 ? Math.round((selectedBatchDetails.notInRack / selectedBatch.quantity) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all"
                    style={{ width: `${selectedBatch.quantity > 0 ? (selectedBatchDetails.inRack / selectedBatch.quantity) * 100 : 0}%` }}
                  />
                  <div
                    className="bg-amber-500 h-full transition-all"
                    style={{ width: `${selectedBatch.quantity > 0 ? (selectedBatchDetails.notInRack / selectedBatch.quantity) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Unallocated Status */}
            <div className={`border rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between ${
              selectedBatchDetails.notInRack > 0
                ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40"
                : "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40"
            }`}>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                  <span className={selectedBatchDetails.notInRack > 0 ? "text-amber-800 dark:text-amber-300" : "text-emerald-800 dark:text-emerald-300"}>
                    Unallocated (Not in Rack)
                  </span>
                  {selectedBatchDetails.notInRack === 0 ? (
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-900/50 px-2.5 py-0.5 rounded-lg">
                      100% Allocated ✅
                    </span>
                  ) : (
                    <span className="text-xs text-amber-800 dark:text-amber-300 font-bold bg-amber-100 dark:bg-amber-900/50 px-2.5 py-0.5 rounded-lg">
                      Placement Needed
                    </span>
                  )}
                </div>

                <div className="text-3xl sm:text-4xl font-black font-mono my-1 text-slate-900 dark:text-white">
                  <span className={selectedBatchDetails.notInRack > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}>
                    {selectedBatchDetails.notInRack.toLocaleString()}
                  </span>{" "}
                  <span className="text-base font-bold text-slate-500">{selectedBatch.unit || "units"}</span>
                </div>

                <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {selectedBatchDetails.notInRack > 0 ? (
                    <span>
                      📦 {selectedBatchDetails.bulkUnallocatedPkg.fullCartons > 0 ? `${selectedBatchDetails.bulkUnallocatedPkg.fullCartons} Cartons ` : ""}
                      {selectedBatchDetails.bulkUnallocatedPkg.totalEquivalentBoxes > 0 ? `(${selectedBatchDetails.bulkUnallocatedPkg.totalEquivalentBoxes} Boxes)` : ""} in Bulk Reserve
                    </span>
                  ) : (
                    <span>All stock is physically placed in rack shelves for instant dispensing</span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 mt-3 flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-400">
                  {selectedBatchDetails.notInRack > 0 ? "Store room / Bulk storage" : "Ready at billing counter"}
                </span>
                {selectedBatchDetails.notInRack > 0 && (
                  <button
                    type="button"
                    onClick={() => handleNavigateToAllocate(selectedBatch.id, selectedBatch.productId)}
                    className="px-4 py-2 bg-brand-primary hover:opacity-90 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer active:scale-95"
                  >
                    <span>Allocate to Shelf Now</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Physical Rack & Shelf Locations */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-brand-primary shrink-0" />
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Physical Rack &amp; Shelf Locations
                  </h3>
                </div>
                <div className="text-xs font-bold text-slate-400 mt-0.5 flex items-center gap-2">
                  <span>{selectedBatchDetails.locationsList.length} Shelf Location{selectedBatchDetails.locationsList.length !== 1 ? "s" : ""}</span>
                  <span>•</span>
                  <span>Total Placed: <strong className="text-slate-900 dark:text-white font-mono">{selectedBatchDetails.inRack.toLocaleString()}</strong> {selectedBatch.unit || "units"}</span>
                </div>
              </div>

              {selectedBatchDetails.notInRack > 0 && (
                <button
                  type="button"
                  onClick={() => handleNavigateToAllocate(selectedBatch.id, selectedBatch.productId)}
                  className="px-4 py-2 bg-brand-primary hover:opacity-90 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0 self-start sm:self-auto cursor-pointer active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Allocate More to Shelf</span>
                </button>
              )}
            </div>

            {selectedBatchDetails.locationsList.length === 0 ? (
              <div className="p-8 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                  <MapPin className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                    No Shelf Location Assigned Yet
                  </p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    All {selectedBatch.quantity.toLocaleString()} {selectedBatch.unit || "units"} are in bulk reserve. Assign them to racks and shelves so staff can find them quickly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleNavigateToAllocate(selectedBatch.id, selectedBatch.productId)}
                  className="px-4 py-2 bg-brand-primary hover:opacity-90 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  Allocate to Rack Now
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedBatchDetails.locationsList.map((loc, idx) => {
                  const percent = selectedBatch.quantity > 0 ? Math.round((loc.quantity / selectedBatch.quantity) * 100) : 0;
                  return (
                    <div
                      key={loc.id || idx}
                      className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-3.5"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1">
                            <span className="text-slate-400 font-bold">Rack:</span>
                            <span className="text-brand-primary font-mono text-sm">{loc.rackName}</span>
                          </span>

                          <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />

                          <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1">
                            <span className="text-slate-400 font-bold">Shelf:</span>
                            <span className="text-brand-primary font-mono text-sm">{loc.shelfName}</span>
                          </span>

                          <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />

                          <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1">
                            <span className="text-slate-400 font-bold">Bin:</span>
                            <span className="text-brand-primary font-mono text-sm">{loc.binName}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-bold text-brand-primary flex-wrap">
                          <span>📦 {loc.displayText}</span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="text-slate-400 font-medium">
                            {percent}% of total batch stock
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-200 dark:border-slate-700">
                        <div className="text-left md:text-right">
                          <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                            {loc.quantity.toLocaleString()}{" "}
                            <span className="text-xs font-bold text-slate-500">{selectedBatch.unit || "units"}</span>
                          </div>
                          <div className="text-[11px] font-bold text-slate-400">
                            Stock in this Shelf
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleNavigateToAllocate(selectedBatch.id, selectedBatch.productId)}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                          title="Adjust or relocate stock"
                        >
                          <span>Manage</span>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Other Batches for Same Product */}
          {selectedBatchDetails.otherBatches.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
              <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-brand-primary" />
                Other Batches for {selectedBatch.productName} ({selectedBatchDetails.otherBatches.length})
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {selectedBatchDetails.otherBatches.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBatch(b)}
                    className="py-3 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer transition flex items-center justify-between gap-3 text-xs font-bold"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-900 dark:text-white">
                        Batch: {b.batchNumber || "—"}
                      </span>
                      {b.daysLeft !== null && (
                        <span className="text-slate-400 font-medium">
                          • Exp: {b.daysLeft} days left
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-slate-900 dark:text-white">
                        Stock: {b.quantity.toLocaleString()} {b.unit || "units"}
                      </span>
                      <span className="text-brand-primary">
                        View ➔
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Clean Prompt when no batch selected */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3 shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto">
            <Search className="h-7 w-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Please search in the search bar above
            </h3>
            <p className="text-xs text-slate-400">
              Type medicine name, generic, barcode, or batch number to inspect stock details and shelf locations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
