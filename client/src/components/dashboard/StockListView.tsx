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
  ChevronDown,
  Package,
  Sparkles,
  Layers,
  MoreVertical,
  ArrowRightLeft,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  ExternalLink,
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
  const [activeMenuLocId, setActiveMenuLocId] = useState<string | null>(null);
  const [isOtherBatchesOpen, setIsOtherBatchesOpen] = useState(true);

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

  // Click outside to close 3-dot location menu
  useEffect(() => {
    function handleOutsideMenu(e: MouseEvent) {
      if (activeMenuLocId) {
        const target = e.target as HTMLElement;
        if (!target.closest("[data-menu-container]")) {
          setActiveMenuLocId(null);
        }
      }
    }
    document.addEventListener("mousedown", handleOutsideMenu);
    return () => document.removeEventListener("mousedown", handleOutsideMenu);
  }, [activeMenuLocId]);

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

    // Readable breakdown for overall batch (e.g. "≈ 4 cartons, 6 boxes, 2 strips, 8 tabs")
    const overallParts: string[] = [];
    if (overallPackaging.fullCartons > 0) overallParts.push(`${overallPackaging.fullCartons} carton${overallPackaging.fullCartons > 1 ? "s" : ""}`);
    if (overallPackaging.looseBoxes > 0) overallParts.push(`${overallPackaging.looseBoxes} box${overallPackaging.looseBoxes > 1 ? "es" : ""}`);
    if (overallPackaging.remainingStrips > 0) overallParts.push(`${overallPackaging.remainingStrips} strip${overallPackaging.remainingStrips > 1 ? "s" : ""}`);
    if (overallPackaging.remainingTablets > 0) overallParts.push(`${overallPackaging.remainingTablets} tab${overallPackaging.remainingTablets > 1 ? "s" : ""}`);
    const overallFormula = overallParts.length > 0 ? `≈ ${overallParts.join(", ")}` : `${(selectedBatch.quantity || 0).toLocaleString()} ${packConfig.unit || "units"}`;

    const locationsList: Array<{
      id: string;
      rackName: string;
      shelfName: string;
      binName: string;
      locationLabel: string;
      breadcrumb: string;
      quantity: number;
      fullBoxes: number;
      openBoxes: number;
      displayText: string;
      packagingSummary: string;
      percentOfBatch: number;
    }> = [];

    let inRack = 0;
    if (selectedBatch.locations && Array.isArray(selectedBatch.locations)) {
      for (const loc of selectedBatch.locations) {
        if (loc.quantity > 0) {
          inRack += loc.quantity;
          const locPkg = calculateLocationPackaging(loc.quantity, packConfig);
          const rName = loc.rack?.name || loc.rackName || "Rack R01";
          const sName = loc.shelf?.name || loc.shelfName || "";
          const bName = loc.bin?.name || loc.binName || "";
          const locationLabel =
            loc.locationLabel ||
            (sName && bName ? `${rName} › ${sName} › ${bName}` : sName ? `${rName} › ${sName}` : rName);

          const breadcrumb = sName && bName ? `${sName} › ${bName}` : sName ? sName : bName || "Direct Shelf";

          // Concise packaging breakdown: e.g. "4 boxes, 6 strips"
          const subParts: string[] = [];
          if (locPkg.fullBoxes > 0) {
            subParts.push(`${locPkg.fullBoxes} box${locPkg.fullBoxes > 1 ? "es" : ""}`);
          }
          if (locPkg.openBoxRemainingStrips > 0) {
            subParts.push(`${locPkg.openBoxRemainingStrips} strip${locPkg.openBoxRemainingStrips > 1 ? "s" : ""}`);
          }
          if (locPkg.openBoxRemainingTablets > 0) {
            subParts.push(`${locPkg.openBoxRemainingTablets} tab${locPkg.openBoxRemainingTablets > 1 ? "s" : ""}`);
          }
          const packagingSummary = subParts.length > 0 ? subParts.join(", ") : `${loc.quantity.toLocaleString()} ${packConfig.unit || "units"}`;

          const percentOfBatch = selectedBatch.quantity > 0 ? Math.round((loc.quantity / selectedBatch.quantity) * 100) : 0;

          locationsList.push({
            id: loc.id || `${selectedBatch.id}-${rName}-${sName}-${bName}`,
            rackName: rName,
            shelfName: sName,
            binName: bName,
            locationLabel,
            breadcrumb,
            quantity: loc.quantity,
            fullBoxes: loc.fullBoxes ?? locPkg.fullBoxes,
            openBoxes: loc.openBoxes ?? locPkg.openBoxes,
            displayText: loc.displayText || locPkg.displayText,
            packagingSummary,
            percentOfBatch,
          });
        }
      }
    }

    const notInRack = Math.max(0, (selectedBatch.quantity || 0) - inRack);
    const bulkUnallocatedPkg = calculateBatchBulkPackaging(selectedBatch, notInRack, packConfig);

    // Group locations by Rack Name
    const rackGroupsMap = new Map<string, typeof locationsList>();
    for (const loc of locationsList) {
      const rName = loc.rackName || "General Area";
      if (!rackGroupsMap.has(rName)) {
        rackGroupsMap.set(rName, []);
      }
      rackGroupsMap.get(rName)!.push(loc);
    }

    const groupedRacks = Array.from(rackGroupsMap.entries()).map(([rackName, items]) => ({
      rackName,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      items,
    }));

    // Other batches for the same product
    const otherBatches = sortedBatches.filter(
      (b) => b.productId === selectedBatch.productId && b.id !== selectedBatch.id
    );

    const percentInRack = selectedBatch.quantity > 0 ? Math.round((inRack / selectedBatch.quantity) * 100) : 0;
    const percentNotInRack = 100 - percentInRack;

    return {
      packConfig,
      overallPackaging,
      overallFormula,
      locationsList,
      groupedRacks,
      inRack,
      notInRack,
      percentInRack,
      percentNotInRack,
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
            {/* Top Row: Back button & Expiry Status */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setSelectedBatch(null);
                  setSearch("");
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
                className="text-xs sm:text-sm font-bold text-brand-primary hover:text-brand-primary/80 transition flex items-center gap-1.5 cursor-pointer py-1.5 px-3 rounded-xl bg-brand-primary/10 hover:bg-brand-primary/20 active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Search another medicine</span>
              </button>

              {/* Expiry Badge */}
              <div>
                {selectedBatch.isExpired ? (
                  <div className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>Expired ({selectedBatch.expiryDate ? new Date(selectedBatch.expiryDate).toLocaleDateString() : "—"})</span>
                  </div>
                ) : selectedBatch.daysLeft !== null ? (
                  <div
                    className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold border flex items-center gap-2 ${
                      selectedBatch.daysLeft <= 90
                        ? "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-900/60"
                        : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60"
                    }`}
                  >
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>
                      Expires in <strong className="font-mono font-black">{selectedBatch.daysLeft} days</strong>
                      {selectedBatch.expiryDate && (
                        <span className="opacity-80 font-normal ml-1">
                          ({new Date(selectedBatch.expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })})
                        </span>
                      )}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">No expiry date</span>
                )}
              </div>
            </div>

            {/* Product Details & Batch Info */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  {selectedBatch.productName}
                </h2>
                <p className="text-sm sm:text-base font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  {selectedBatch.genericName || "Standard Medicine"}
                  {selectedBatch.size ? ` · ${selectedBatch.size}` : ""}
                </p>
              </div>

              <div className="text-xs sm:text-sm font-mono text-slate-600 dark:text-slate-400 font-medium sm:text-right bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-900 dark:text-white font-bold">Batch {selectedBatch.batchNumber || "Default"}</span>
                {(selectedBatch.barcode || selectedBatch.sku) && (
                  <span className="ml-2 text-slate-400 dark:text-slate-500">· {selectedBatch.barcode || selectedBatch.sku}</span>
                )}
              </div>
            </div>
          </div>

          {/* Top 2 Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Total Stock */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Total stock
                </p>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono text-slate-900 dark:text-white">
                    {selectedBatch.quantity.toLocaleString()}
                  </span>
                  <span className="text-sm sm:text-base font-bold text-slate-500">
                    {selectedBatch.unit || "tablets"}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {selectedBatchDetails.overallFormula}
                </p>
              </div>

              {/* Progress Bar & Distribution */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${selectedBatchDetails.percentInRack}%` }}
                  />
                  <div
                    className="bg-amber-500 h-full transition-all duration-500"
                    style={{ width: `${selectedBatchDetails.percentNotInRack}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                  <span className="text-emerald-600 dark:text-emerald-400">{selectedBatchDetails.percentInRack}% on shelves</span>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="text-amber-600 dark:text-amber-400">{selectedBatchDetails.percentNotInRack}% not placed</span>
                </div>
              </div>
            </div>

            {/* Card 2: Needs Placement */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Needs placement
                </p>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono text-amber-600 dark:text-amber-400">
                    {selectedBatchDetails.notInRack.toLocaleString()}
                  </span>
                  <span className="text-sm sm:text-base font-bold text-amber-600/80 dark:text-amber-300/80">
                    {selectedBatch.unit || "tablets"}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                  {selectedBatchDetails.notInRack > 0
                    ? "Sitting in bulk storage, not on a rack"
                    : "All available stock is placed on shelves"}
                </p>
              </div>

              <div>
                {selectedBatchDetails.notInRack > 0 ? (
                  <button
                    type="button"
                    onClick={() => handleNavigateToAllocate(selectedBatch.id, selectedBatch.productId)}
                    className="h-10 sm:h-11 px-5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
                  >
                    <MapPin className="h-4 w-4" />
                    <span>Put on shelf</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>100% Placed on Shelves</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Where It Is Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            {/* Clean Header: Title & Count Only */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-baseline gap-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  Where it is
                </h3>
                <span className="text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500">
                  · {selectedBatchDetails.locationsList.length} location{selectedBatchDetails.locationsList.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Scrollable Location List Container with Custom Scrollbar */}
            <div className="max-h-[460px] 2xl:max-h-[580px] overflow-y-auto pr-1.5 custom-scrollbar space-y-3">
              {/* Amber Banner: Not on a rack (bulk storage) */}
              {selectedBatchDetails.notInRack > 0 && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>⚠️ Not on a rack (bulk storage)</span>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <span className="font-mono font-black text-amber-800 dark:text-amber-300 text-sm sm:text-base">
                      {selectedBatchDetails.notInRack.toLocaleString()} {selectedBatch.unit || "tablets"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleNavigateToAllocate(selectedBatch.id, selectedBatch.productId)}
                      className="px-3.5 py-1.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs transition cursor-pointer active:scale-95 shadow-xs"
                    >
                      Put on shelf
                    </button>
                  </div>
                </div>
              )}

              {/* Empty state if no locations at all */}
              {selectedBatchDetails.locationsList.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                  <MapPin className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No shelf locations assigned yet</p>
                  <p className="text-xs text-slate-400">
                    All stock for this batch is currently in bulk storage.
                  </p>
                </div>
              ) : (
                /* Grouped by Rack / Storage Area View */
                <div className="space-y-3">
                  {selectedBatchDetails.groupedRacks.map((rackGroup) => (
                    <div
                      key={rackGroup.rackName}
                      className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden shadow-2xs"
                    >
                      {/* Rack Header */}
                      <div className="px-4 py-3 bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs sm:text-sm font-bold">
                        <span className="text-slate-800 dark:text-slate-200 tracking-wide font-black flex items-center gap-2">
                          <Layers className="h-4 w-4 text-brand-primary" />
                          <span>{rackGroup.rackName}</span>
                        </span>
                        <span className="font-mono text-slate-600 dark:text-slate-300 font-bold">
                          {rackGroup.totalQuantity.toLocaleString()} {selectedBatch.unit || "tabs"}
                        </span>
                      </div>

                      {/* Sub-rows for each shelf/bin */}
                      <div className="divide-y divide-slate-200/70 dark:divide-slate-700/60 bg-white dark:bg-slate-900/60">
                        {rackGroup.items.map((item) => (
                          <div
                            key={item.id}
                            className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group"
                          >
                            {/* Left: Shelf › Bin & packaging breakdown */}
                            <div className="space-y-0.5 min-w-0">
                              <div className="text-xs sm:text-sm font-extrabold text-brand-primary font-mono flex items-center gap-1.5">
                                <span>{item.breadcrumb}</span>
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {item.packagingSummary}
                              </div>
                            </div>

                            {/* Right: Quantity pill & 3-dot dropdown menu */}
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-mono font-black text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                                {item.quantity.toLocaleString()} {selectedBatch.unit || "tabs"}
                              </span>

                              {/* 3-Dot Actions Menu */}
                              <div className="relative" data-menu-container>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuLocId(activeMenuLocId === item.id ? null : item.id);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                                  title="Location options"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>

                                {activeMenuLocId === item.id && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1.5 text-xs font-bold divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100"
                                  >
                                    <div className="py-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuLocId(null);
                                          handleNavigateToAllocate(selectedBatch.id, selectedBatch.productId);
                                        }}
                                        className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:text-brand-primary hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition"
                                      >
                                        <ArrowRightLeft className="h-3.5 w-3.5 text-brand-primary" />
                                        <span>Move to another shelf</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuLocId(null);
                                          handleNavigateToAllocate(selectedBatch.id, selectedBatch.productId);
                                        }}
                                        className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:text-emerald-600 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition"
                                      >
                                        <Plus className="h-3.5 w-3.5 text-emerald-600" />
                                        <span>Add more here</span>
                                      </button>
                                    </div>
                                    <div className="py-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuLocId(null);
                                          handleNavigateToAllocate(selectedBatch.id, selectedBatch.productId);
                                        }}
                                        className="w-full text-left px-3.5 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer transition"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                        <span>Remove from shelf</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Other Batches for Same Product */}
          {selectedBatchDetails.otherBatches.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
              <button
                type="button"
                onClick={() => setIsOtherBatchesOpen(!isOtherBatchesOpen)}
                className="w-full flex items-center justify-between text-left text-sm sm:text-base font-black text-slate-900 dark:text-white transition py-1 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ChevronDown className={`h-4 w-4 text-brand-primary transition-transform duration-200 ${isOtherBatchesOpen ? "" : "-rotate-90"}`} />
                  <span>Other batches of {selectedBatch.productName} ({selectedBatchDetails.otherBatches.length})</span>
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  {isOtherBatchesOpen ? "Collapse" : "Expand"}
                </span>
              </button>

              {isOtherBatchesOpen && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 pt-1">
                  {selectedBatchDetails.otherBatches.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBatch(b)}
                      className="py-3.5 px-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm font-bold group"
                    >
                      <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400 flex-wrap">
                        <span className="font-mono text-slate-900 dark:text-white text-sm sm:text-base group-hover:text-brand-primary transition font-black">
                          {b.batchNumber || "Default Batch"}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className={b.isExpired ? "text-rose-600 dark:text-rose-400 font-bold" : b.daysLeft !== null && b.daysLeft <= 90 ? "text-amber-600 dark:text-amber-400 font-bold" : "text-emerald-600 dark:text-emerald-400 font-bold"}>
                          {b.isExpired ? "Expired" : b.daysLeft !== null ? `${b.daysLeft} days left` : "No expiry"}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-auto">
                        <span className="font-mono font-black text-slate-900 dark:text-white text-sm sm:text-base">
                          {b.quantity.toLocaleString()} {b.unit || "tablets"}
                        </span>
                        <span className="text-brand-primary group-hover:underline text-xs sm:text-sm font-black flex items-center gap-1">
                          <span>View</span>
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
