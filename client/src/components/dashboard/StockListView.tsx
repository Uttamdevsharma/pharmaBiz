"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { Branch, InventoryItem } from "@/types";
import { useAuth } from "@/context/AuthContext";
import {
  calculatePackaging,
  PackagingConfig,
} from "@/lib/packaging";
import { ProductInventoryDetailsView } from "./ProductInventoryDetailsView";
import { BatchStockDetailsView } from "./BatchStockDetailsView";
import {
  Boxes,
  Plus,
  Search,
  Store,
  MapPin,
  Loader2,
  AlertTriangle,
  Package,
  Layers,
  ChevronRight,
  Filter,
  CheckCircle2,
  Calendar,
  Sparkles,
} from "lucide-react";

interface StockListViewProps {
  onNavigate: (module: any, extra?: any) => void;
}

interface ProductStockGroup {
  productId: string;
  name: string;
  genericName?: string | null;
  brandName?: string | null;
  manufacturer?: string | null;
  category?: string | null;
  size?: string | null;
  unit: string;
  sku: string;
  barcode?: string | null;
  productType?: string;
  qtyPerLevel2?: number;
  stripsPerBox?: number;
  tabletsPerStrip?: number;
  batches: InventoryItem[];
  totalStock: number;
  batchesCount: number;
  locationsCount: number;
  expiredBatchesCount: number;
  nearExpiryBatchesCount: number;
  earliestExpiry?: string | null;
}

export function StockListView({ onNavigate }: StockListViewProps) {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || "");
  const [rawInventory, setRawInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [stockStatusFilter, setStockStatusFilter] = useState<string>("ALL");

  // Navigation Hierarchy: PRODUCT_BROWSER -> PRODUCT_DETAILS -> BATCH_DETAILS
  const [viewMode, setViewMode] = useState<"PRODUCT_BROWSER" | "PRODUCT_DETAILS" | "BATCH_DETAILS">("PRODUCT_BROWSER");
  const [selectedProductGroup, setSelectedProductGroup] = useState<ProductStockGroup | null>(null);
  const [selectedBatchItem, setSelectedBatchItem] = useState<InventoryItem | null>(null);

  const isBranchLocked = Boolean(
    user?.branchId && user?.role !== "COMPANY_OWNER" && user?.role !== "SUPER_ADMIN"
  );

  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetchApi("/branches");
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

  const loadBranchStock = async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("limit", "250");
      if (search) params.append("search", search);

      const res = await fetchApi(`/inventory/branch/${selectedBranchId}?${params.toString()}`);
      if (res.success && res.data) {
        setRawInventory(res.data);
      }
    } catch (err) {
      console.error("Failed to load branch stock", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBranchId) {
      loadBranchStock();
    }
  }, [selectedBranchId]);

  // Keep active batch & product in sync when inventory reloads
  useEffect(() => {
    if (selectedProductGroup) {
      const updatedBatches = rawInventory.filter((i) => i.productId === selectedProductGroup.productId);
      if (updatedBatches.length > 0) {
        setSelectedProductGroup((prev) => (prev ? { ...prev, batches: updatedBatches } : null));
        if (selectedBatchItem) {
          const updatedB = updatedBatches.find((b) => b.id === selectedBatchItem.id);
          if (updatedB) setSelectedBatchItem(updatedB);
        }
      }
    }
  }, [rawInventory]);

  // Group batch inventory into distinct products
  const productGroups: ProductStockGroup[] = useMemo(() => {
    const map = new Map<string, ProductStockGroup>();
    const now = new Date();

    for (const item of rawInventory) {
      const pid = item.productId;
      if (!map.has(pid)) {
        map.set(pid, {
          productId: pid,
          name: item.productName,
          genericName: item.genericName,
          brandName: item.brandName,
          manufacturer: item.brandName,
          category: item.category,
          size: item.size,
          unit: item.unit || "tablet",
          sku: item.sku,
          barcode: item.barcode,
          productType: (item as any).productType,
          qtyPerLevel2: (item as any).qtyPerLevel2 || item.boxesPerCarton || 10,
          stripsPerBox: item.stripsPerBox || 10,
          tabletsPerStrip: item.tabletsPerStrip || 10,
          batches: [],
          totalStock: 0,
          batchesCount: 0,
          locationsCount: 0,
          expiredBatchesCount: 0,
          nearExpiryBatchesCount: 0,
          earliestExpiry: null,
        });
      }

      const grp = map.get(pid)!;
      grp.batches.push(item);
      grp.totalStock += item.quantity || 0;
      grp.batchesCount += 1;

      if (item.isExpired) {
        grp.expiredBatchesCount += 1;
      } else if (item.daysUntilExpiry != null && item.daysUntilExpiry <= 90) {
        grp.nearExpiryBatchesCount += 1;
      }

      if (item.expiryDate && !item.isExpired) {
        if (!grp.earliestExpiry || new Date(item.expiryDate) < new Date(grp.earliestExpiry)) {
          grp.earliestExpiry = item.expiryDate;
        }
      }
    }

    // Compute unique physical locations count for each product
    for (const grp of Array.from(map.values())) {
      const uniqueLocs = new Set<string>();
      for (const b of grp.batches) {
        if (b.locations && Array.isArray(b.locations)) {
          for (const l of b.locations) {
            if (l.quantity > 0) {
              uniqueLocs.add(l.id || `${l.rack}-${l.shelf}-${l.bin}`);
            }
          }
        }
      }
      grp.locationsCount = uniqueLocs.size;
    }

    return Array.from(map.values());
  }, [rawInventory]);

  // Filter products by search, category, and status
  const filteredProducts = useMemo(() => {
    return productGroups.filter((p) => {
      // 1. Text Search across: Name, Generic Name, Brand/Manufacturer, Batch #, Barcode
      if (search) {
        const q = search.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchGeneric = p.genericName?.toLowerCase().includes(q);
        const matchBrand = p.brandName?.toLowerCase().includes(q);
        const matchSku = p.sku?.toLowerCase().includes(q);
        const matchBarcode = p.barcode?.toLowerCase().includes(q);
        const matchBatch = p.batches.some(
          (b) => b.batchNumber?.toLowerCase().includes(q) || b.barcode?.toLowerCase().includes(q)
        );

        if (!matchName && !matchGeneric && !matchBrand && !matchSku && !matchBarcode && !matchBatch) {
          return false;
        }
      }

      // 2. Category Filter
      if (categoryFilter !== "ALL") {
        if (p.category?.toLowerCase() !== categoryFilter.toLowerCase()) {
          return false;
        }
      }

      // 3. Stock Status Filter
      if (stockStatusFilter === "IN_STOCK") {
        if (p.totalStock <= 0) return false;
      } else if (stockStatusFilter === "LOW_STOCK") {
        if (p.totalStock <= 0 || p.totalStock > 50) return false;
      } else if (stockStatusFilter === "OUT_OF_STOCK") {
        if (p.totalStock > 0) return false;
      } else if (stockStatusFilter === "NEAR_EXPIRY") {
        if (p.nearExpiryBatchesCount === 0) return false;
      } else if (stockStatusFilter === "EXPIRED") {
        if (p.expiredBatchesCount === 0) return false;
      }

      return true;
    });
  }, [productGroups, search, categoryFilter, stockStatusFilter]);

  // Handler: Click Product Card -> Navigate to Product Details
  const handleSelectProduct = (product: ProductStockGroup) => {
    setSelectedProductGroup(product);
    setSelectedBatchItem(null);
    setViewMode("PRODUCT_DETAILS");
  };

  // Handler: Click Batch Row -> Navigate to Batch Stock Details
  const handleSelectBatch = (batch: InventoryItem) => {
    setSelectedBatchItem(batch);
    setViewMode("BATCH_DETAILS");
  };

  // Handler: Navigate to Stock Allocation with preselected batch & product
  const handleNavigateToAllocate = (batchId: string, productId?: string) => {
    onNavigate("stock_stock_allocation", {
      batchId,
      productId: productId || selectedProductGroup?.productId,
    });
  };

  // ================= RENDER SUBPAGE 3: BATCH STOCK DETAILS =================
  if (viewMode === "BATCH_DETAILS" && selectedBatchItem && selectedProductGroup) {
    return (
      <BatchStockDetailsView
        batch={selectedBatchItem}
        product={selectedProductGroup}
        selectedBranchId={selectedBranchId}
        onBackToProduct={() => setViewMode("PRODUCT_DETAILS")}
        onBackToStockList={() => setViewMode("PRODUCT_BROWSER")}
        onNavigateToAllocate={handleNavigateToAllocate}
        onStockUpdated={loadBranchStock}
      />
    );
  }

  // ================= RENDER SUBPAGE 2: PRODUCT INVENTORY DETAILS =================
  if (viewMode === "PRODUCT_DETAILS" && selectedProductGroup) {
    return (
      <ProductInventoryDetailsView
        product={selectedProductGroup}
        batches={selectedProductGroup.batches}
        selectedBranchId={selectedBranchId}
        onSelectBatch={handleSelectBatch}
        onBackToStockList={() => setViewMode("PRODUCT_BROWSER")}
        onNavigateToAllocate={handleNavigateToAllocate}
      />
    );
  }

  // ================= RENDER MAIN PAGE: PRODUCT INVENTORY BROWSER =================
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <span>Stock Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Stock List</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="h-6 w-6 text-brand-primary" />
            Pharmacy Inventory Hub & Stock List
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Product-level stock browser. Drill down into Product → Batches → Bulk Cartons → Physical Rack/Shelf/Bin locations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Branch Selector */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-xl">
            <Store className="h-4 w-4 text-slate-400" />
            <select
              disabled={isBranchLocked}
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none disabled:opacity-60"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onNavigate("stock_add_stock")}
            className="px-4 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Receive Stock
          </button>
        </div>
      </div>

      {/* Global Stock Status Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-black">
            {productGroups.length}
          </div>
          <div>
            <div className="font-bold text-xs text-slate-900 dark:text-white">Active Products</div>
            <div className="text-[11px] text-slate-500">With stock in this branch</div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center font-black">
            {rawInventory.length}
          </div>
          <div>
            <div className="font-bold text-xs text-slate-900 dark:text-white">Total Batches</div>
            <div className="text-[11px] text-slate-500">Tracked via FEFO</div>
          </div>
        </div>

        <div
          onClick={() => setStockStatusFilter("NEAR_EXPIRY")}
          className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-center gap-3 cursor-pointer hover:border-amber-400 transition"
        >
          <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 flex items-center justify-center font-black">
            {productGroups.filter((p) => p.nearExpiryBatchesCount > 0).length}
          </div>
          <div>
            <div className="font-bold text-xs text-amber-900 dark:text-amber-200">Near Expiry Alerts</div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400">Batches expiring in ≤90d</div>
          </div>
        </div>

        <div
          onClick={() => setStockStatusFilter("EXPIRED")}
          className="p-4 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center gap-3 cursor-pointer hover:border-rose-400 transition"
        >
          <div className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-700 flex items-center justify-center font-black">
            {productGroups.filter((p) => p.expiredBatchesCount > 0).length}
          </div>
          <div>
            <div className="font-bold text-xs text-rose-900 dark:text-rose-200">Expired Batches</div>
            <div className="text-[11px] text-rose-600 dark:text-rose-400">Restricted from POS sales</div>
          </div>
        </div>
      </div>

      {/* Product Search & Multi-Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Products */}
        <div className="flex-1 w-full sm:max-w-lg relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products by name, generic name, brand, batch #, barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadBranchStock()}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                loadBranchStock();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-700 dark:text-slate-300 outline-none text-xs"
            >
              <option value="ALL">All Categories</option>
              <option value="Medicine">Medicine</option>
              <option value="Syrup">Syrup</option>
              <option value="Saline">Saline</option>
              <option value="Equipment">Equipment</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Stock Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs">
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-700 dark:text-slate-300 outline-none text-xs"
            >
              <option value="ALL">All Stock Status</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="NEAR_EXPIRY">Near Expiry (≤90d)</option>
              <option value="EXPIRED">Expired</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product-Level Cards Grid / List */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-16 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
          <p className="text-xs">Loading product inventory catalog...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-16 text-center text-slate-400">
          <Boxes className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
            No products match your search or filter criteria.
          </p>
          <p className="text-xs mt-1">
            Try resetting filters or click "Receive Stock" to record product intake.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((prod) => {
            const packConfig: PackagingConfig = {
              packageType: prod.productType || prod.category || "MEDICINE",
              boxesPerCarton: prod.qtyPerLevel2 || 10,
              stripsPerBox: prod.stripsPerBox || 10,
              tabletsPerStrip: prod.tabletsPerStrip || 10,
              unit: prod.unit,
            };

            const pkg = calculatePackaging(prod.totalStock, packConfig);

            return (
              <div
                key={prod.productId}
                onClick={() => handleSelectProduct(prod)}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:border-brand-primary/60 transition cursor-pointer group flex flex-col justify-between relative overflow-hidden"
              >
                {/* Status Badges */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-brand-primary transition truncate">
                        {prod.name}
                      </h3>
                      {prod.size && (
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] px-1.5 py-0.2 rounded font-bold">
                          {prod.size}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-brand-primary font-bold mt-0.5 truncate">
                      {prod.genericName || "—"}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {prod.manufacturer || prod.brandName || "Brand Manufacturer"}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {prod.expiredBatchesCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {prod.expiredBatchesCount} Expired
                      </span>
                    )}

                    {prod.nearExpiryBatchesCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                        {prod.nearExpiryBatchesCount} Near Expiry
                      </span>
                    )}

                    {prod.totalStock <= 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        Out of Stock
                      </span>
                    )}
                  </div>
                </div>

                {/* Stock Details & Packaging Breakdown */}
                <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800 my-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Available Stock:
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {prod.totalStock.toLocaleString()} {prod.unit}s
                    </span>
                  </div>

                  {pkg.isMedicine && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
                      <Package className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{pkg.displayText}</span>
                    </div>
                  )}
                </div>

                {/* Footer Metrics (Batches, Locations, Arrow) */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                      <Boxes className="h-3.5 w-3.5 text-brand-primary" />
                      {prod.batchesCount} Batche{prod.batchesCount !== 1 ? "s" : ""}
                    </span>

                    <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {prod.locationsCount} Location{prod.locationsCount !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="text-brand-primary font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition">
                    <span>View Batches</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
