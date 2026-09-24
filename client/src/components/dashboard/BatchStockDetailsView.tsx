"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import {
  calculatePackaging,
  calculateLocationPackaging,
  calculateBatchBulkPackaging,
  PackagingConfig,
} from "@/lib/packaging";
import {
  Layers,
  Package,
  Calendar,
  Truck,
  Barcode,
  DollarSign,
  Boxes,
  MapPin,
  History,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  TrendingDown,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Hash,
  Archive,
} from "lucide-react";

interface BatchStockDetailsViewProps {
  batch: any;
  product: any;
  selectedBranchId: string;
  onBackToProduct: () => void;
  onBackToStockList: () => void;
  onNavigateToAllocate: (batchId: string, productId?: string) => void;
  onStockUpdated: () => void;
}

type MainTab = "OVERVIEW" | "NOT_IN_RACK" | "PHYSICAL_LOCATIONS" | "STOCK_HISTORY";

type DateFilter = "ALL" | "TODAY" | "YESTERDAY" | "THIS_MONTH" | "LAST_MONTH" | "THIS_YEAR" | "CUSTOM";

export function BatchStockDetailsView({
  batch,
  product,
  selectedBranchId,
  onBackToProduct,
  onBackToStockList,
  onNavigateToAllocate,
  onStockUpdated,
}: BatchStockDetailsViewProps) {
  const [activeTab, setActiveTab] = useState<MainTab>("OVERVIEW");
  const [currentBatch, setCurrentBatch] = useState<any>(batch);
  const [locations, setLocations] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [movements, setMovements] = useState<any[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Filters for Physical Locations tab
  const [locSearch, setLocSearch] = useState("");
  const [selectedRackFilter, setSelectedRackFilter] = useState("ALL");
  const [selectedShelfFilter, setSelectedShelfFilter] = useState("ALL");
  const [selectedBinFilter, setSelectedBinFilter] = useState("ALL");
  const [boxTypeFilter, setBoxTypeFilter] = useState<"ALL" | "FULL_BOXES" | "OPEN_PARTIAL" | "LOW_STOCK">("ALL");

  // Filters for Stock History tab
  const [historyDateFilter, setHistoryDateFilter] = useState<DateFilter>("ALL");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyActionFilter, setHistoryActionFilter] = useState("ALL");
  const [historyUnitFilter, setHistoryUnitFilter] = useState("ALL");

  // Packaging configuration
  const packConfig: PackagingConfig = useMemo(() => ({
    packageType: currentBatch.packageType || product?.packageType || "MEDICINE",
    boxesPerCarton: currentBatch.boxesPerCarton || product?.qtyPerLevel2 || 10,
    stripsPerBox: currentBatch.stripsPerBox || product?.stripsPerBox || 10,
    tabletsPerStrip: currentBatch.tabletsPerStrip || product?.tabletsPerStrip || 10,
    unit: currentBatch.unit || product?.unit || "tablet",
  }), [currentBatch, product]);

  const tabsPerStrip = packConfig.tabletsPerStrip || 10;
  const stripsPerBox = packConfig.stripsPerBox || 10;
  const boxesPerCarton = packConfig.boxesPerCarton || 10;
  const tabletsPerBox = stripsPerBox * tabsPerStrip;
  const tabletsPerCarton = boxesPerCarton * tabletsPerBox;

  // Derived stock counts
  const totalStock = currentBatch.quantity ?? batch.quantity ?? 0;
  const totalAllocated = useMemo(
    () => locations.reduce((sum: number, loc: any) => sum + (loc.quantity || 0), 0),
    [locations]
  );
  const stockNotInRack = Math.max(0, totalStock - totalAllocated);
  const allocatedPct = totalStock > 0 ? Math.round((totalAllocated / totalStock) * 100) : 0;

  // Packaging breakdown for Stock Not in Rack
  const notInRackPkg = useMemo(() => {
    return calculateBatchBulkPackaging(currentBatch, stockNotInRack, packConfig);
  }, [currentBatch, stockNotInRack, packConfig]);

  // Overall batch packaging breakdown
  const overallPkg = useMemo(() => {
    return calculatePackaging(totalStock, packConfig);
  }, [totalStock, packConfig]);

  // Expiry check
  const now = new Date();
  const expiryDateObj = currentBatch.expiryDate ? new Date(currentBatch.expiryDate) : null;
  const isExpired = expiryDateObj ? expiryDateObj < now : false;
  const daysLeft = expiryDateObj
    ? Math.ceil((expiryDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Data loaders
  const loadBatchDetails = useCallback(async () => {
    if (!batch?.id) return;
    try {
      const res = await fetchApi(`/inventory/batch/${batch.id}`);
      if (res.success && res.data) {
        setCurrentBatch(res.data);
      }
    } catch (err) {
      console.error("Failed to load batch details", err);
    }
  }, [batch?.id]);

  const loadLocations = useCallback(async () => {
    if (!batch?.id) return;
    setLoadingLocations(true);
    try {
      const res = await fetchApi(`/locations/batch/${batch.id}`);
      if (res.success && Array.isArray(res.data)) {
        setLocations(res.data);
      } else {
        setLocations(batch.locations || []);
      }
    } catch {
      setLocations(batch.locations || []);
    } finally {
      setLoadingLocations(false);
    }
  }, [batch?.id, batch.locations]);

  const loadMovements = useCallback(async () => {
    if (!batch?.id) return;
    setLoadingMovements(true);
    try {
      const params = new URLSearchParams();
      params.set("inventoryId", batch.id);
      params.set("limit", "200");
      const res = await fetchApi(`/inventory/movements?${params.toString()}`);
      if (res.success && Array.isArray(res.data)) {
        setMovements(res.data);
      } else {
        setMovements([]);
      }
    } catch {
      setMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  }, [batch?.id]);

  useEffect(() => {
    setCurrentBatch(batch);
    loadBatchDetails();
    loadLocations();
    loadMovements();
  }, [batch, loadBatchDetails, loadLocations, loadMovements]);

  // Helpers
  const formatDate = (d: string | Date | null | undefined) => {
    if (!d) return "—";
    const date = new Date(d);
    return isNaN(date.getTime())
      ? "—"
      : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatDateTime = (d: string | Date | null | undefined) => {
    if (!d) return "—";
    const date = new Date(d);
    return isNaN(date.getTime())
      ? "—"
      : date.toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  };

  // Pricing calculations
  const purchasePrice = Number(currentBatch.purchasePrice || 0);
  const sellingPrice = Number(currentBatch.sellingPrice || 0);
  const batchValue = totalStock * purchasePrice;

  // Filter options for Physical Locations
  const availableRacks = useMemo(() => {
    const racks = new Set<string>();
    locations.forEach((loc) => {
      if (loc.rackName && loc.rackName !== "—") racks.add(loc.rackName);
    });
    return Array.from(racks);
  }, [locations]);

  const availableShelves = useMemo(() => {
    const shelves = new Set<string>();
    locations.forEach((loc) => {
      if (selectedRackFilter === "ALL" || loc.rackName === selectedRackFilter) {
        if (loc.shelfName && loc.shelfName !== "—") shelves.add(loc.shelfName);
      }
    });
    return Array.from(shelves);
  }, [locations, selectedRackFilter]);

  const availableBins = useMemo(() => {
    const bins = new Set<string>();
    locations.forEach((loc) => {
      const matchRack = selectedRackFilter === "ALL" || loc.rackName === selectedRackFilter;
      const matchShelf = selectedShelfFilter === "ALL" || loc.shelfName === selectedShelfFilter;
      if (matchRack && matchShelf && loc.binName && loc.binName !== "—") {
        bins.add(loc.binName);
      }
    });
    return Array.from(bins);
  }, [locations, selectedRackFilter, selectedShelfFilter]);

  // Filtered Physical Locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const q = locSearch.toLowerCase().trim();
      const rName = (loc.rackName || loc.rack?.name || "").toLowerCase();
      const sName = (loc.shelfName || loc.shelf?.name || "").toLowerCase();
      const bName = (loc.binName || loc.bin?.name || "").toLowerCase();

      if (q && !rName.includes(q) && !sName.includes(q) && !bName.includes(q)) {
        return false;
      }

      if (selectedRackFilter !== "ALL" && loc.rackName !== selectedRackFilter) {
        return false;
      }
      if (selectedShelfFilter !== "ALL" && loc.shelfName !== selectedShelfFilter) {
        return false;
      }
      if (selectedBinFilter !== "ALL" && loc.binName !== selectedBinFilter) {
        return false;
      }

      if (boxTypeFilter === "FULL_BOXES" && (loc.fullBoxes || 0) <= 0) {
        return false;
      }
      if (boxTypeFilter === "OPEN_PARTIAL" && (loc.openBoxes || 0) <= 0) {
        return false;
      }
      if (boxTypeFilter === "LOW_STOCK" && (loc.quantity || 0) > 20) {
        return false;
      }

      return true;
    });
  }, [locations, locSearch, selectedRackFilter, selectedShelfFilter, selectedBinFilter, boxTypeFilter]);

  // Filtered Movements for Stock History
  const filteredMovements = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday = new Date(startOfToday);
    endOfYesterday.setMilliseconds(-1);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return movements.filter((m) => {
      const mDate = new Date(m.createdAt);

      // Date preset filter
      if (historyDateFilter === "TODAY" && mDate < startOfToday) return false;
      if (historyDateFilter === "YESTERDAY" && (mDate < startOfYesterday || mDate > endOfYesterday)) return false;
      if (historyDateFilter === "THIS_MONTH" && mDate < startOfMonth) return false;
      if (historyDateFilter === "LAST_MONTH" && (mDate < startOfLastMonth || mDate > endOfLastMonth)) return false;
      if (historyDateFilter === "THIS_YEAR" && mDate < startOfYear) return false;
      if (historyDateFilter === "CUSTOM") {
        if (customStartDate && mDate < new Date(customStartDate)) return false;
        if (customEndDate) {
          const e = new Date(customEndDate);
          e.setHours(23, 59, 59, 999);
          if (mDate > e) return false;
        }
      }

      // Action filter
      if (historyActionFilter !== "ALL") {
        if (historyActionFilter === "STOCK_RECEIVED" && m.type !== "PURCHASE") return false;
        if (historyActionFilter === "STOCK_PLACED" && m.type !== "ALLOCATION") return false;
        if (historyActionFilter === "STOCK_MOVED" && m.type !== "LOCATION_TRANSFER") return false;
        if (historyActionFilter === "POS_SALE" && m.type !== "SALE") return false;
        if (historyActionFilter === "DAMAGED" && m.type !== "DAMAGE") return false;
        if (historyActionFilter === "ADJUSTMENT" && m.type !== "ADJUSTMENT") return false;
      }

      // Packaging unit filter
      if (historyUnitFilter !== "ALL") {
        if (m.packagingUnit !== historyUnitFilter) return false;
      }

      // Search keyword
      if (historySearch) {
        const q = historySearch.toLowerCase().trim();
        const reason = (m.reason || "").toLowerCase();
        const action = (m.actionLabel || "").toLowerCase();
        const from = (m.fromLocationLabel || "").toLowerCase();
        const to = (m.toLocationLabel || "").toLowerCase();
        const user = (m.performedByName || "").toLowerCase();
        const ref = (m.referenceId || "").toLowerCase();

        if (
          !reason.includes(q) &&
          !action.includes(q) &&
          !from.includes(q) &&
          !to.includes(q) &&
          !user.includes(q) &&
          !ref.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    movements,
    historyDateFilter,
    customStartDate,
    customEndDate,
    historyActionFilter,
    historyUnitFilter,
    historySearch,
    now,
  ]);

  return (
    <div className="space-y-5 pb-12">
      {/* ──────────────────────────────────────────
          1. TOP HEADER (ONLY Product Name, Batch Number, Expiry Date, Supplier)
          Do NOT show "Allocate to Location" button here!
      ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-2">
          <button
            onClick={onBackToStockList}
            className="hover:text-slate-700 dark:hover:text-slate-200 font-medium transition"
          >
            Stock List
          </button>
          <ChevronRight className="h-3 w-3" />
          <button
            onClick={onBackToProduct}
            className="hover:text-slate-700 dark:hover:text-slate-200 font-medium transition truncate max-w-[200px]"
          >
            {product?.name || "Product"}
          </button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 dark:text-slate-200 font-bold">Batch Details</span>
        </div>

        {/* Clean Top Header Content */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <Layers className="h-6 w-6 text-brand-primary shrink-0" />
              <span>{product?.name || "Medicine Product"}</span>
            </h1>
            {product?.genericName && (
              <p className="text-xs text-slate-500 italic ml-8.5">{product.genericName}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Batch Number */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 text-xs font-bold">
              <Hash className="h-3.5 w-3.5 text-brand-primary" />
              <span>Batch {currentBatch.batchNumber || "—"}</span>
            </div>

            {/* Expiry Date */}
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                isExpired
                  ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300"
                  : daysLeft !== null && daysLeft <= 90
                  ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300"
                  : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>
                Expiry: {formatDate(currentBatch.expiryDate)}
                {isExpired ? " (Expired)" : daysLeft !== null ? ` (${daysLeft}d left)` : ""}
              </span>
            </div>

            {/* Supplier */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 text-xs font-semibold">
              <Truck className="h-3.5 w-3.5 text-slate-400" />
              <span>Supplier: {currentBatch.supplier?.name || "Direct / Not Specified"}</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => {
                loadBatchDetails();
                loadLocations();
                loadMovements();
                onStockUpdated();
              }}
              title="Refresh batch stock details"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ──────────────────────────────────────────
            SIMPLE STOCK SUMMARY
            - Total Stock
            - Stock Not in Rack
            - Stock in Rack
            - Allocated %
        ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5 pt-5 border-t border-slate-100 dark:border-slate-800/80">
          {/* Total Stock */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 rounded-xl p-3.5">
            <p className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-400 tracking-wider">
              Total Stock
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {totalStock.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{packConfig.unit}s</p>
          </div>

          {/* Stock Not in Rack */}
          <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-xl p-3.5">
            <p className="text-[11px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider">
              Stock Not in Rack
            </p>
            <p className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">
              {stockNotInRack.toLocaleString()}
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400/80 mt-0.5">
              Ready to place in rack
            </p>
          </div>

          {/* Stock in Rack */}
          <div className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-xl p-3.5">
            <p className="text-[11px] font-black uppercase text-blue-700 dark:text-blue-400 tracking-wider">
              Stock in Rack
            </p>
            <p className="text-2xl font-black text-blue-900 dark:text-blue-200 mt-1">
              {totalAllocated.toLocaleString()}
            </p>
            <p className="text-[11px] text-blue-600 dark:text-blue-400/80 mt-0.5">
              Across {locations.length} physical location{locations.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Allocated % */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                Allocated %
              </p>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                {allocatedPct}%
              </span>
            </div>
            <p className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1">
              {allocatedPct}%
            </p>
            <div className="mt-1.5 h-1.5 bg-emerald-200/60 dark:bg-emerald-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, allocatedPct)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────
          MAIN TABS (4 CLEAN DEDICATED TABS)
          1. Overview (Default)
          2. Stock Not in Rack
          3. Physical Locations
          4. Stock History
      ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-0">
        {[
          { id: "OVERVIEW", label: "Overview", icon: Layers },
          { id: "NOT_IN_RACK", label: "Stock Not in Rack", icon: Archive },
          { id: "PHYSICAL_LOCATIONS", label: "Physical Locations", icon: MapPin },
          { id: "STOCK_HISTORY", label: "Stock History", icon: History },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as MainTab)}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-bold transition-all ${
                isActive
                  ? "border-brand-primary text-brand-primary bg-white dark:bg-slate-900 rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
              {t.id === "PHYSICAL_LOCATIONS" && locations.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {locations.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ──────────────────────────────────────────
          TAB 1: OVERVIEW TAB
          - Stock Summary
          - Packaging Summary
          - Batch Information
          - Pricing
          (Simple, clean, NO tables or forms)
      ────────────────────────────────────────── */}
      {activeTab === "OVERVIEW" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Packaging Summary */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Boxes className="h-5 w-5 text-brand-primary" />
                Packaging Summary
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Full Cartons
                  </p>
                  <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
                    {notInRackPkg.fullCartons}
                  </p>
                  <p className="text-[10px] text-slate-400">unopened in reserve</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Boxes Inside Cartons
                  </p>
                  <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
                    {notInRackPkg.boxesInsideCartons}
                  </p>
                  <p className="text-[10px] text-slate-400">{boxesPerCarton} boxes / carton</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Loose Boxes
                  </p>
                  <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
                    {notInRackPkg.remainingLooseBoxes}
                  </p>
                  <p className="text-[10px] text-slate-400">standalone boxes</p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Total Boxes
                  </p>
                  <p className="text-xl font-black text-emerald-800 dark:text-emerald-200 mt-0.5">
                    {overallPkg.totalBoxes}
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400/80">batch equivalent</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Strips
                  </p>
                  <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
                    {overallPkg.totalStrips.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400">{stripsPerBox} strips / box</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Tablets
                  </p>
                  <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
                    {overallPkg.totalTablets.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400">{tabsPerStrip} tabs / strip</p>
                </div>
              </div>
            </div>

            {/* Batch Information */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Barcode className="h-5 w-5 text-brand-primary" />
                Batch Information
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium">Received Date:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatDate(currentBatch.receivedDate || currentBatch.createdAt)}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium">Manufacturing Date:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatDate(currentBatch.mfgDate)}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium">Expiry Date:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatDate(currentBatch.expiryDate)}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium">Supplier:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {currentBatch.supplier?.name || "Direct / Unknown"}
                  </span>
                </div>

                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400 font-medium">Barcode:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {currentBatch.barcode || product?.barcode || "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Pricing & Valuation
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Purchase Price</p>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
                  ৳{Math.round(purchasePrice).toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">per lowest unit ({packConfig.unit})</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Selling Price</p>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
                  ৳{Math.round(sellingPrice).toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">per lowest unit ({packConfig.unit})</p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Total Batch Value
                </p>
                <p className="text-2xl font-black text-emerald-800 dark:text-emerald-200 mt-1">
                  ৳{Math.round(batchValue).toLocaleString("en-BD")}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                  total cost based on current stock
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────
          TAB 2: STOCK NOT IN RACK TAB
          (No "Bulk" word anywhere in the UI!)
          - Full Cartons
          - Boxes Inside Cartons
          - Loose Boxes
          - Loose Strips
          - Loose Tablets
          - Total Available Stock
          - Clear button: "Place Stock in Rack"
      ────────────────────────────────────────── */}
      {activeTab === "NOT_IN_RACK" && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Archive className="h-6 w-6 text-amber-500" />
                  Stock Not in Rack
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  This stock has been received from the supplier, but has not yet been placed into a physical Rack → Shelf → Bin.
                </p>
              </div>

              {/* Clear Action Button: Place Stock in Rack */}
              <button
                onClick={() => onNavigateToAllocate(currentBatch.id, currentBatch.productId || product?.id)}
                className="inline-flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-sm transition shrink-0"
              >
                <MapPin className="h-4 w-4" />
                <span>Place Stock in Rack</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Clear Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-6">
              <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40">
                <p className="text-[11px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider">
                  Full Cartons
                </p>
                <p className="text-3xl font-black text-amber-900 dark:text-amber-200 mt-1">
                  {notInRackPkg.fullCartons}
                </p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">sealed cartons</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <p className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                  Boxes in Cartons
                </p>
                <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                  {notInRackPkg.boxesInsideCartons}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">inside full cartons</p>
              </div>

              <div className="p-4 rounded-xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200/80 dark:border-sky-900/40">
                <p className="text-[11px] font-black uppercase text-sky-700 dark:text-sky-400 tracking-wider">
                  Loose Boxes
                </p>
                <p className="text-3xl font-black text-sky-900 dark:text-sky-200 mt-1">
                  {notInRackPkg.remainingLooseBoxes}
                </p>
                <p className="text-[10px] text-sky-600 dark:text-sky-400 mt-0.5">standalone boxes</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <p className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                  Loose Strips
                </p>
                <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                  {notInRackPkg.unboxedStrips || 0}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">unboxed strips</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <p className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                  Loose Tablets
                </p>
                <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                  {notInRackPkg.unboxedTablets || 0}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">individual tablets</p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40">
                <p className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                  Total Available
                </p>
                <p className="text-3xl font-black text-emerald-900 dark:text-emerald-200 mt-1">
                  {stockNotInRack.toLocaleString()}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">{packConfig.unit}s</p>
              </div>
            </div>

            {/* Explanatory Calculation Banner (Zero Double-Counting) */}
            <div className="mt-6 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 text-xs">
              <div className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2 mb-1">
                <Boxes className="h-4 w-4 text-blue-600" />
                <span>Zero Double-Counting Calculation Breakdown:</span>
              </div>
              <p className="text-blue-800 dark:text-blue-300/80">
                {notInRackPkg.fullCartons} Full Cartons × {boxesPerCarton} Boxes ={" "}
                <span className="font-bold">{notInRackPkg.boxesInsideCartons} Boxes Inside Cartons</span> +{" "}
                <span className="font-bold">{notInRackPkg.remainingLooseBoxes} Loose Boxes</span> ={" "}
                <span className="font-black underline text-brand-primary">
                  {notInRackPkg.totalEquivalentBoxes} Total Available Boxes
                </span>{" "}
                (Total Stock Not in Rack: {stockNotInRack.toLocaleString()} {packConfig.unit}s)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────
          TAB 3: PHYSICAL LOCATIONS TAB
          - Actual database allocation records
          - Rack → Shelf → Bin
          - For each location: Full Boxes, Open Boxes, Strips, Tablets, Total Available Stock
          - Filters: Search Rack, Search Shelf, Search Bin, Rack filter, Shelf filter, Bin filter, Full Boxes, Open/Partial, Low Stock
      ────────────────────────────────────────── */}
      {activeTab === "PHYSICAL_LOCATIONS" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search Rack / Shelf / Bin */}
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Rack / Shelf / Bin..."
                  value={locSearch}
                  onChange={(e) => setLocSearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Rack Filter */}
              <div>
                <select
                  value={selectedRackFilter}
                  onChange={(e) => {
                    setSelectedRackFilter(e.target.value);
                    setSelectedShelfFilter("ALL");
                    setSelectedBinFilter("ALL");
                  }}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-100 font-medium"
                >
                  <option value="ALL">All Racks</option>
                  {availableRacks.map((r) => (
                    <option key={r} value={r}>
                      Rack: {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shelf Filter */}
              <div>
                <select
                  value={selectedShelfFilter}
                  onChange={(e) => {
                    setSelectedShelfFilter(e.target.value);
                    setSelectedBinFilter("ALL");
                  }}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-100 font-medium"
                >
                  <option value="ALL">All Shelves</option>
                  {availableShelves.map((s) => (
                    <option key={s} value={s}>
                      Shelf: {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bin Filter */}
              <div>
                <select
                  value={selectedBinFilter}
                  onChange={(e) => setSelectedBinFilter(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-100 font-medium"
                >
                  <option value="ALL">All Bins</option>
                  {availableBins.map((b) => (
                    <option key={b} value={b}>
                      Bin: {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Box Type / Status Filter */}
              <div>
                <select
                  value={boxTypeFilter}
                  onChange={(e) => setBoxTypeFilter(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-100 font-medium"
                >
                  <option value="ALL">All Stock Types</option>
                  <option value="FULL_BOXES">Full Boxes Only</option>
                  <option value="OPEN_PARTIAL">Open / Partial Only</option>
                  <option value="LOW_STOCK">Low Stock (≤ 20)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Locations Table / Cards */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            {loadingLocations ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Loading physical locations...
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="p-12 text-center">
                <MapPin className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No physical locations found for this batch
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  All available stock for this batch is currently in &quot;Stock Not in Rack&quot;.
                </p>
                <button
                  onClick={() => onNavigateToAllocate(currentBatch.id, currentBatch.productId || product?.id)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary/90 transition"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Place Stock in Rack
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Physical Location (Rack → Shelf → Bin)</th>
                      <th className="py-3 px-4 text-center">Full Boxes</th>
                      <th className="py-3 px-4 text-center">Open Boxes</th>
                      <th className="py-3 px-4 text-center">Strips</th>
                      <th className="py-3 px-4 text-center">Tablets</th>
                      <th className="py-3 px-4 text-right">Total Available Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLocations.map((loc) => {
                      const rackName = loc.rackName || loc.rack?.name || "R01";
                      const shelfName = loc.shelfName || loc.shelf?.name || "S01";
                      const binName = loc.binName || loc.bin?.name || "B01";
                      const locationCode = `${rackName} → ${shelfName} → ${binName}`;

                      const qty = loc.quantity || 0;
                      const fullBoxes = Math.floor(qty / tabletsPerBox);
                      const remainder = qty % tabletsPerBox;
                      const openBoxes = remainder > 0 ? 1 : 0;
                      const strips = Math.floor(remainder / tabsPerStrip);
                      const tablets = remainder % tabsPerStrip;

                      return (
                        <tr
                          key={loc.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-brand-primary shrink-0" />
                            <span>{locationCode}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {fullBoxes}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">boxes</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                openBoxes > 0
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                  : "text-slate-400"
                              }`}
                            >
                              {openBoxes > 0 ? "1 Open" : "0"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {strips}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">strips</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {tablets}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">tabs</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-brand-primary">
                            {qty.toLocaleString()} {packConfig.unit}s
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
      )}

      {/* ──────────────────────────────────────────
          TAB 4: STOCK HISTORY TAB
          - Only history of this selected product/batch
          - Columns: Date & Time, Action, Batch, Packaging Unit, Quantity, From, To, Stock Before, Stock After, Recorded By, Reference
          - Filters: Today, Yesterday, This Month, Last Month, This Year, Custom Date; Search; Action filter; Packaging Unit filter
      ────────────────────────────────────────── */}
      {activeTab === "STOCK_HISTORY" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
            {/* Date Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              {[
                { id: "ALL", label: "All Time" },
                { id: "TODAY", label: "Today" },
                { id: "YESTERDAY", label: "Yesterday" },
                { id: "THIS_MONTH", label: "This Month" },
                { id: "LAST_MONTH", label: "Last Month" },
                { id: "THIS_YEAR", label: "This Year" },
                { id: "CUSTOM", label: "Custom Date" },
              ].map((df) => (
                <button
                  key={df.id}
                  onClick={() => setHistoryDateFilter(df.id as DateFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    historyDateFilter === df.id
                      ? "bg-brand-primary text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {df.label}
                </button>
              ))}
            </div>

            {/* Custom Date Inputs if selected */}
            {historyDateFilter === "CUSTOM" && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">From:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">To:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            )}

            {/* Secondary filters: Search, Action, Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search reason, recorded by, reference..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <select
                  value={historyActionFilter}
                  onChange={(e) => setHistoryActionFilter(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-100 font-medium"
                >
                  <option value="ALL">All Actions</option>
                  <option value="STOCK_RECEIVED">Stock Received</option>
                  <option value="STOCK_PLACED">Stock Placed in Rack</option>
                  <option value="STOCK_MOVED">Stock Moved</option>
                  <option value="POS_SALE">POS Sale</option>
                  <option value="DAMAGED">Damaged / Expired</option>
                  <option value="ADJUSTMENT">Stock Adjustment</option>
                </select>
              </div>

              <div>
                <select
                  value={historyUnitFilter}
                  onChange={(e) => setHistoryUnitFilter(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-100 font-medium"
                >
                  <option value="ALL">All Packaging Units</option>
                  <option value="Carton">Cartons</option>
                  <option value="Box">Boxes</option>
                  <option value="Strip">Strips</option>
                  <option value="Tablet">Tablets</option>
                </select>
              </div>
            </div>
          </div>

          {/* Movements Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            {loadingMovements ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Loading batch stock history...
              </div>
            ) : filteredMovements.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No stock movement records found for this batch.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3.5">Date & Time</th>
                      <th className="py-3 px-3.5">Action</th>
                      <th className="py-3 px-3.5">Batch</th>
                      <th className="py-3 px-3.5">Packaging Unit</th>
                      <th className="py-3 px-3.5 text-center">Quantity</th>
                      <th className="py-3 px-3.5">From</th>
                      <th className="py-3 px-3.5">To</th>
                      <th className="py-3 px-3.5">Recorded By</th>
                      <th className="py-3 px-3.5">Reference / Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredMovements.map((m) => {
                      const qty = m.quantity || 0;
                      const isPositive = qty > 0;

                      return (
                        <tr
                          key={m.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                        >
                          <td className="py-3 px-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {formatDateTime(m.createdAt)}
                          </td>
                          <td className="py-3 px-3.5 font-bold">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] ${
                                m.type === "PURCHASE"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : m.type === "ALLOCATION"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                  : m.type === "SALE"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                  : m.type === "DAMAGE"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {m.actionLabel || m.type}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 font-mono text-slate-700 dark:text-slate-300">
                            {currentBatch.batchNumber || "—"}
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400">
                            {m.packagingDisplay || m.packagingUnit || "Tablets"}
                          </td>
                          <td className="py-3 px-3.5 text-center font-bold">
                            <span
                              className={
                                isPositive
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }
                            >
                              {isPositive ? `+${qty}` : qty}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400">
                            {m.fromLocationLabel || "Stock Not in Rack"}
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400">
                            {m.toLocationLabel || "—"}
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 font-medium">
                            {m.performedByName || "Staff"}
                          </td>
                          <td className="py-3 px-3.5 text-slate-500 text-[11px] truncate max-w-[200px]" title={m.reason || ""}>
                            {m.reason || m.referenceId || "—"}
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
      )}
    </div>
  );
}
