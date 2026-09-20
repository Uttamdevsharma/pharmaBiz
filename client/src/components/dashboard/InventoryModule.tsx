"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Product, Supplier, Branch, InventoryItem } from "@/types";
import { showAlert } from "@/lib/swal";
import {
  Boxes,
  Plus,
  Search,
  Building,
  Edit2,
  Loader2,
  AlertCircle,
  Barcode,
  MapPin,
  History,
  BoxSelect,
  CheckCircle2,
  TrendingDown,
  X,
} from "lucide-react";

interface InventoryModuleProps {
  subAction?: string;
}

export function InventoryModule({ subAction }: InventoryModuleProps = {}) {
  // Tabs: "stock" | "inward" | "movements"
  const [activeTab, setActiveTab] = useState<"stock" | "inward" | "movements">("stock");

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Stock List state
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [stockSearch, setStockSearch] = useState("");

  // Alerts state
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [nearExpiryAlerts, setNearExpiryAlerts] = useState<any[]>([]);

  // Movement History state
  const [movements, setMovements] = useState<any[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [movementType, setMovementType] = useState("");
  const [movementSearch, setMovementSearch] = useState("");
  const [movementStartDate, setMovementStartDate] = useState("");
  const [movementEndDate, setMovementEndDate] = useState("");

  // Inward Form State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [inwardSubmitting, setInwardSubmitting] = useState(false);
  const [inwardError, setInwardError] = useState<string | null>(null);
  const [inwardSuccess, setInwardSuccess] = useState(false);

  const [inwardForm, setInwardForm] = useState({
    productId: "",
    supplierId: "",
    batchNumber: "",
    barcode: "",
    mfgDate: "",
    expiryDate: "",
    packageType: "MEDICINE",
    cartonQuantity: 0,
    boxQuantity: 1,
    stripsPerBox: 10,
    tabletsPerStrip: 10,
    quantity: 100, // Total calculated lowest units
    unitPurchasePrice: 10,
    unitSellingPrice: 15,
    paidAmount: 1000,
    shelfLocation: "Rack A-1",
    notes: "",
  });

  // Adjust Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<"ADJUSTMENT" | "DAMAGE" | "RETURN">("ADJUSTMENT");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  // Edit Batch Modal
  const [editBatchModalOpen, setEditBatchModalOpen] = useState(false);
  const [editBatchItem, setEditBatchItem] = useState<InventoryItem | null>(null);
  const [editBatchData, setEditBatchData] = useState({
    batchNumber: "",
    barcode: "",
    expiryDate: "",
    shelfLocation: "",
    purchasePrice: 0,
    sellingPrice: 0,
    minStockLevel: 10,
  });
  const [editingBatch, setEditingBatch] = useState(false);

  // Load initial branches, products, suppliers
  useEffect(() => {
    const init = async () => {
      try {
        const [bRes, pRes, sRes] = await Promise.all([
          fetchApi("/branches"),
          fetchApi("/products?limit=100"),
          fetchApi("/suppliers?limit=100"),
        ]);
        if (bRes.success && bRes.data && bRes.data.length > 0) {
          setBranches(bRes.data);
          setSelectedBranchId(bRes.data[0].id);
        }
        if (pRes.success && pRes.data) setProducts(pRes.data);
        if (sRes.success && sRes.data) setSuppliers(sRes.data);
      } catch (err) {
        console.error("Failed to load initial inventory dependencies", err);
      }
    };
    init();
  }, []);

  // Load inventory when branch changes or tab changes to stock
  const loadBranchStock = async () => {
    if (!selectedBranchId) return;
    try {
      setLoadingStock(true);
      const params = new URLSearchParams();
      if (stockSearch) params.append("search", stockSearch);
      const res = await fetchApi(`/inventory/branch/${selectedBranchId}?${params.toString()}`);
      if (res.success && res.data) {
        setInventory(res.data);
      }
    } catch (err) {
      console.error("Failed to load branch stock", err);
    } finally {
      setLoadingStock(false);
    }
  };

  // Load alerts
  const loadAlerts = async () => {
    if (!selectedBranchId) return;
    try {
      const [lowRes, expRes] = await Promise.all([
        fetchApi(`/inventory/low-stock?branchId=${selectedBranchId}`),
        fetchApi(`/inventory/near-expiry?branchId=${selectedBranchId}&daysThreshold=90`),
      ]);
      if (lowRes.success && lowRes.data) setLowStockAlerts(lowRes.data.items || []);
      if (expRes.success && expRes.data) setNearExpiryAlerts(expRes.data.items || []);
    } catch (err) {
      console.error("Failed to load alerts", err);
    }
  };

  // Load movements
  const loadMovements = async () => {
    if (!selectedBranchId) return;
    try {
      setLoadingMovements(true);
      const params = new URLSearchParams();
      params.append("branchId", selectedBranchId);
      if (movementType) params.append("type", movementType);
      if (movementSearch) params.append("search", movementSearch);
      if (movementStartDate) params.append("startDate", movementStartDate);
      if (movementEndDate) params.append("endDate", movementEndDate);

      const res = await fetchApi(`/inventory/movements?${params.toString()}`);
      if (res.success && res.data) {
        setMovements(res.data);
      }
    } catch (err) {
      console.error("Failed to load stock movements", err);
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    if (activeTab === "stock") {
      loadBranchStock();
      loadAlerts();
    } else if (activeTab === "movements") {
      loadMovements();
    }
  }, [selectedBranchId, activeTab]);

  // Handle subAction from sidebar
  useEffect(() => {
    if (subAction === "stock:add_stock") {
      setActiveTab("inward");
    } else if (subAction === "stock:stock_list") {
      setActiveTab("stock");
    } else if (subAction === "stock:stock_history") {
      setActiveTab("movements");
    } else if (subAction === "inventory:expired") {
      setActiveTab("stock");
    }
  }, [subAction]);

  // When a product is selected in Inward form
  const handleSelectProduct = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    setSelectedProduct(prod);

    const isMed =
      prod.category === "Medicine" ||
      prod.categoryRef?.name === "Medicine" ||
      prod.productType === "MEDICINE";
    const strips = prod.stripsPerBox || 10;
    const tablets = prod.tabletsPerStrip || 10;
    const boxQty = 1;
    const totalUnits = isMed ? boxQty * strips * tablets : 10;

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 2);

    setInwardForm({
      productId: prod.id,
      supplierId: suppliers[0]?.id || "",
      batchNumber: `BAT-${Date.now().toString().slice(-5)}`,
      barcode: prod.barcode || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      mfgDate: new Date().toISOString().slice(0, 10),
      expiryDate: futureDate.toISOString().slice(0, 10),
      packageType: prod.category || prod.categoryRef?.name || "Medicine",
      cartonQuantity: 0,
      boxQuantity: boxQty,
      stripsPerBox: strips,
      tabletsPerStrip: tablets,
      quantity: totalUnits,
      unitPurchasePrice: Math.round(Number(prod.basePrice) * 0.7 * 100) / 100,
      unitSellingPrice: Number(prod.basePrice),
      paidAmount: Math.round(totalUnits * Number(prod.basePrice) * 0.7 * 100) / 100,
      shelfLocation: prod.shelfLocation || "Rack A-1",
      notes: "Standard batch intake",
    });
  };

  // Recalculate lowest unit quantity on hierarchy changes
  const handleHierarchyChange = (boxQty: number, strips: number, tabs: number) => {
    const total = boxQty * strips * tabs;
    setInwardForm((prev) => ({
      ...prev,
      boxQuantity: boxQty,
      stripsPerBox: strips,
      tabletsPerStrip: tabs,
      quantity: total,
      paidAmount: Math.round(total * prev.unitPurchasePrice * 100) / 100,
    }));
  };

  // Submit Inward Form
  const handleInwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId || !inwardForm.productId) return;
    try {
      setInwardSubmitting(true);
      setInwardError(null);

      const payload = {
        branchId: selectedBranchId,
        productId: inwardForm.productId,
        supplierId: inwardForm.supplierId || null,
        batchNumber: inwardForm.batchNumber || null,
        barcode: inwardForm.barcode || null,
        mfgDate: inwardForm.mfgDate ? new Date(inwardForm.mfgDate).toISOString() : null,
        expiryDate: inwardForm.expiryDate ? new Date(inwardForm.expiryDate).toISOString() : null,
        packageType: inwardForm.packageType,
        boxQuantity: inwardForm.packageType === "MEDICINE" ? inwardForm.boxQuantity : null,
        stripsPerBox: inwardForm.packageType === "MEDICINE" ? inwardForm.stripsPerBox : null,
        tabletsPerStrip: inwardForm.packageType === "MEDICINE" ? inwardForm.tabletsPerStrip : null,
        quantity: Number(inwardForm.quantity),
        purchasePrice: Number(inwardForm.unitPurchasePrice),
        sellingPrice: Number(inwardForm.unitSellingPrice),
        paidAmount: Number(inwardForm.paidAmount || 0),
        shelfLocation: inwardForm.shelfLocation || null,
        notes: inwardForm.notes || null,
      };

      const res = await fetchApi("/inventory/inward", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.success) throw new Error(res.message || "Failed to record stock inward");

      const prodName = products.find((p) => p.id === inwardForm.productId)?.name || "product";
      setInwardSuccess(true);
      showAlert.success("Stock Added Successfully!", `Inward stock batch recorded for "${prodName}".`);
      setTimeout(() => {
        setInwardSuccess(false);
        setActiveTab("stock");
        loadBranchStock();
      }, 1200);
    } catch (err: any) {
      const msg = err.message || "Failed to record stock inward";
      setInwardError(msg);
      showAlert.error("Stock Inward Failed", msg);
    } finally {
      setInwardSubmitting(false);
    }
  };

  // Handle Stock Adjustment Submit
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem || adjustQty === 0) return;
    try {
      setAdjusting(true);
      const res = await fetchApi("/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({
          branchId: selectedBranchId,
          productId: adjustItem.productId,
          inventoryId: adjustItem.id,
          quantity: adjustQty,
          type: adjustType,
          reason: adjustReason || "Stock adjustment",
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to adjust stock");

      showAlert.success("Stock Adjusted", `Quantity successfully adjusted (${adjustQty > 0 ? `+${adjustQty}` : adjustQty}).`);
      setAdjustModalOpen(false);
      loadBranchStock();
    } catch (err: any) {
      showAlert.error("Adjustment Failed", err.message || "Failed to adjust stock");
    } finally {
      setAdjusting(false);
    }
  };

  // Handle Edit Batch Metadata
  const handleEditBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBatchItem) return;
    try {
      setEditingBatch(true);
      const res = await fetchApi(`/inventory/${editBatchItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          batchNumber: editBatchData.batchNumber || null,
          barcode: editBatchData.barcode || null,
          expiryDate: editBatchData.expiryDate ? new Date(editBatchData.expiryDate).toISOString() : null,
          shelfLocation: editBatchData.shelfLocation || null,
          purchasePrice: Number(editBatchData.purchasePrice),
          sellingPrice: Number(editBatchData.sellingPrice),
          minStockLevel: Number(editBatchData.minStockLevel),
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to update batch");

      showAlert.success("Batch Updated", "Batch metadata has been updated successfully.");
      setEditBatchModalOpen(false);
      loadBranchStock();
    } catch (err: any) {
      showAlert.error("Update Failed", err.message || "Failed to update batch");
    } finally {
      setEditingBatch(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Branch Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Boxes className="h-6 w-6 text-brand-primary" />
              Batch-Aware Stock & Inventory
            </h1>
            <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
              Carton → Box → Strip → Tablet
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track batch expiration dates, FEFO deductions, packaging multipliers, and complete stock movement ledger.
          </p>
        </div>

        {/* Branch Selector & Inward Action */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl">
            <Building className="h-4 w-4 text-slate-400" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setActiveTab("inward")}
            className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:opacity-95 transition"
          >
            <Plus className="h-4 w-4" />
            Inward Stock Batch
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("stock")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === "stock"
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Boxes className="h-4 w-4" />
          Active Stock & Batches ({inventory.length})
        </button>

        <button
          onClick={() => setActiveTab("inward")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === "inward"
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Plus className="h-4 w-4" />
          Inward Stock (Add Batch / Purchases)
        </button>

        <button
          onClick={() => setActiveTab("movements")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === "movements"
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <History className="h-4 w-4" />
          Stock Movement Ledger
        </button>
      </div>

      {/* ================= TAB 1: STOCK LIST ================= */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          {/* Alerts Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 flex items-center justify-center font-black">
                  {lowStockAlerts.length}
                </div>
                <div>
                  <div className="font-bold text-xs text-rose-900 dark:text-rose-200">Low Stock Warnings</div>
                  <div className="text-[10px] text-rose-600 dark:text-rose-400">
                    {lowStockAlerts.length > 0
                      ? `${lowStockAlerts.length} products reached threshold`
                      : "Stock levels healthy"}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 flex items-center justify-center font-black">
                  {nearExpiryAlerts.length}
                </div>
                <div>
                  <div className="font-bold text-xs text-amber-900 dark:text-amber-200">Near-Expiry Batches (≤ 90d)</div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400">
                    {nearExpiryAlerts.length > 0
                      ? `${nearExpiryAlerts.length} batches require priority selling (FEFO)`
                      : "No near-expiry batches"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search Filter */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search stock by medicine name, generic name, batch #, barcode..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadBranchStock()}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
              />
            </div>
          </div>

          {/* Stock Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {loadingStock ? (
              <div className="p-16 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
                <p className="text-xs">Loading branch batch inventory...</p>
              </div>
            ) : inventory.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <Boxes className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No stock batches in this branch</p>
                <p className="text-xs mt-1">Click "Inward Stock Batch" above to record products.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                      <th className="py-3.5 px-4">Product Name & Generic</th>
                      <th className="py-3.5 px-4">Batch # / Barcode</th>
                      <th className="py-3.5 px-4">Expiry Date (FEFO)</th>
                      <th className="py-3.5 px-4">Stock Breakdown</th>
                      <th className="py-3.5 px-4">Selling Price</th>
                      <th className="py-3.5 px-4">Rack Location</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                    {inventory.map((inv) => {
                      // Format readable packaging conversion
                      let readableStock = `${inv.quantity} ${inv.unit}s`;
                      if (inv.packageType === "MEDICINE" && inv.stripsPerBox && inv.tabletsPerStrip) {
                        const tabletsPerBox = inv.stripsPerBox * inv.tabletsPerStrip;
                        const boxes = Math.floor(inv.quantity / tabletsPerBox);
                        const remTablets = inv.quantity % tabletsPerBox;
                        const strips = Math.floor(remTablets / inv.tabletsPerStrip);
                        const tabs = remTablets % inv.tabletsPerStrip;
                        readableStock = `${boxes} Boxes, ${strips} Strips, ${tabs} Tabs`;
                      }

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              {inv.productName}
                              {inv.size && (
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] px-1.5 py-0.2 rounded font-semibold">
                                  {inv.size}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {inv.genericName ? (
                                <span className="font-semibold text-brand-primary">
                                  {inv.genericName} •{" "}
                                </span>
                              ) : null}
                              {inv.brandName || "Generic Brand"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-mono text-slate-900 dark:text-slate-100 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                              {inv.batchNumber || "Unassigned"}
                            </span>
                            {inv.barcode && (
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                <Barcode className="h-3 w-3" />
                                {inv.barcode}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {inv.expiryDate ? (
                              <div>
                                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                  {new Date(inv.expiryDate).toLocaleDateString()}
                                </div>
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                                    inv.isExpired
                                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50"
                                      : (inv.daysUntilExpiry ?? 999) <= 90
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50"
                                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50"
                                  }`}
                                >
                                  {inv.isExpired
                                    ? "EXPIRED"
                                    : `${inv.daysUntilExpiry} days left`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">No expiry set</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-black text-slate-900 dark:text-white text-xs">
                              {inv.quantity} {inv.unit}s
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">{readableStock}</div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            ৳{Number(inv.sellingPrice).toFixed(2)}
                            <span className="text-[10px] text-slate-400 font-normal"> / {inv.unit}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              {inv.shelfLocation || "Rack unassigned"}
                            </div>
                            {inv.supplier && (
                              <div className="text-[10px] text-slate-400">Dist: {inv.supplier.name}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setAdjustItem(inv);
                                  setAdjustQty(0);
                                  setAdjustReason("");
                                  setAdjustModalOpen(true);
                                }}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold"
                              >
                                Adjust
                              </button>
                              <button
                                onClick={() => {
                                  setEditBatchItem(inv);
                                  setEditBatchData({
                                    batchNumber: inv.batchNumber || "",
                                    barcode: inv.barcode || "",
                                    expiryDate: inv.expiryDate ? inv.expiryDate.slice(0, 10) : "",
                                    shelfLocation: inv.shelfLocation || "",
                                    purchasePrice: inv.purchasePrice ? Number(inv.purchasePrice) : 0,
                                    sellingPrice: Number(inv.sellingPrice),
                                    minStockLevel: 10,
                                  });
                                  setEditBatchModalOpen(true);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                title="Edit Batch Details"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
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

      {/* ================= TAB 2: INWARD STOCK / ADD BATCH ================= */}
      {activeTab === "inward" && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-3xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-brand-primary" />
                Inward Stock Batch Intake
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select an existing product from catalog, configure batch number, expiry, supplier, and packaging hierarchy.
              </p>
            </div>
          </div>

          {inwardError && (
            <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{inwardError}</span>
            </div>
          )}

          {inwardSuccess && (
            <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-bold">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Stock inward recorded successfully! Updating inventory...</span>
            </div>
          )}

          <form onSubmit={handleInwardSubmit} className="mt-5 space-y-4">
            {/* Step 1: Select Product */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Catalog Product *
              </label>
              <select
                required
                value={inwardForm.productId}
                onChange={(e) => handleSelectProduct(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-bold"
              >
                <option value="">-- Choose Product from Catalog --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.size ? `(${p.size})` : ""} {p.genericName ? `[${p.genericName}]` : ""} - {p.brandName || "Generic"} [{p.category || p.categoryRef?.name || "Medicine"}]
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <>
                {/* Batch & Barcode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Batch Number *</span>
                      <button
                        type="button"
                        onClick={() =>
                          setInwardForm({
                            ...inwardForm,
                            batchNumber: `BAT-${Date.now().toString().slice(-6)}`,
                          })
                        }
                        className="text-[10px] text-brand-primary hover:underline"
                      >
                        Auto Batch No
                      </button>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BATCH-2026-A1"
                      value={inwardForm.batchNumber}
                      onChange={(e) => setInwardForm({ ...inwardForm, batchNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Barcode / Serial
                    </label>
                    <input
                      type="text"
                      value={inwardForm.barcode}
                      onChange={(e) => setInwardForm({ ...inwardForm, barcode: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                {/* Dates: Mfg & Expiry */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Manufacture Date
                    </label>
                    <input
                      type="date"
                      value={inwardForm.mfgDate}
                      onChange={(e) => setInwardForm({ ...inwardForm, mfgDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Expiry Date * (Crucial for FEFO)
                    </label>
                    <input
                      type="date"
                      required
                      value={inwardForm.expiryDate}
                      onChange={(e) => setInwardForm({ ...inwardForm, expiryDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-bold"
                    />
                  </div>
                </div>

                {/* Dynamic Packaging Hierarchy Calculation */}
                {(selectedProduct.category === "Medicine" || selectedProduct.categoryRef?.name === "Medicine" || selectedProduct.productType === "MEDICINE") ? (
                  <div className="p-4 bg-brand-primary/5 border border-brand-primary/15 rounded-2xl space-y-3">
                    <div className="text-xs font-bold text-brand-primary flex items-center gap-1.5">
                      <BoxSelect className="h-4 w-4" />
                      Packaging Multiplier Calculation (Boxes → Strips → Tablets)
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Box Quantity Inwarded
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={inwardForm.boxQuantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 1;
                            handleHierarchyChange(val, inwardForm.stripsPerBox, inwardForm.tabletsPerStrip);
                          }}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Strips per Box
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={inwardForm.stripsPerBox}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 1;
                            handleHierarchyChange(inwardForm.boxQuantity, val, inwardForm.tabletsPerStrip);
                          }}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Tablets per Strip
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={inwardForm.tabletsPerStrip}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 1;
                            handleHierarchyChange(inwardForm.boxQuantity, inwardForm.stripsPerBox, val);
                          }}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-brand-primary/20 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Total Base Sellable Stock Added:
                      </span>
                      <span className="text-sm font-black text-brand-primary font-mono">
                        {inwardForm.quantity} Tablets
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Quantity Inwarded ({selectedProduct.unit}s) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={inwardForm.quantity}
                      onChange={(e) => {
                        const q = parseInt(e.target.value, 10) || 1;
                        setInwardForm({
                          ...inwardForm,
                          quantity: q,
                          paidAmount: q * inwardForm.unitPurchasePrice,
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>
                )}

                {/* Supplier & Shelf Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Distributor / Supplier
                    </label>
                    <select
                      value={inwardForm.supplierId}
                      onChange={(e) => setInwardForm({ ...inwardForm, supplierId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none font-medium"
                    >
                      <option value="">-- Direct / Unassigned --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.company || s.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Shelf / Rack Storage Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rack B-3, Fridge #2"
                      value={inwardForm.shelfLocation}
                      onChange={(e) => setInwardForm({ ...inwardForm, shelfLocation: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Pricing: Purchase vs Selling & Paid/Due */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Purchase Price (per unit) ৳
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={inwardForm.unitPurchasePrice}
                      onChange={(e) => {
                        const price = parseFloat(e.target.value) || 0;
                        setInwardForm({
                          ...inwardForm,
                          unitPurchasePrice: price,
                          paidAmount: inwardForm.quantity * price,
                        });
                      }}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Selling Price (per unit) ৳
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={inwardForm.unitSellingPrice}
                      onChange={(e) =>
                        setInwardForm({ ...inwardForm, unitSellingPrice: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Amount Paid to Supplier ৳
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={inwardForm.paidAmount}
                      onChange={(e) =>
                        setInwardForm({ ...inwardForm, paidAmount: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-emerald-600"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab("stock")}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inwardSubmitting}
                    className="flex items-center gap-2 bg-brand-primary text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:opacity-90 disabled:opacity-50"
                  >
                    {inwardSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Confirm Batch Inward
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* ================= TAB 3: MOVEMENT HISTORY ================= */}
      {activeTab === "movements" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search movements by invoice, batch, reason..."
                value={movementSearch}
                onChange={(e) => setMovementSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadMovements()}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium outline-none"
              >
                <option value="">All Movement Types</option>
                <option value="PURCHASE">PURCHASE (Inward)</option>
                <option value="SALE">SALE (Deduction)</option>
                <option value="TRANSFER_IN">TRANSFER_IN</option>
                <option value="TRANSFER_OUT">TRANSFER_OUT</option>
                <option value="ADJUSTMENT">ADJUSTMENT</option>
                <option value="DAMAGE">DAMAGE</option>
                <option value="RETURN">RETURN</option>
              </select>

              <button
                onClick={loadMovements}
                className="px-3.5 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold"
              >
                Apply Filters
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {loadingMovements ? (
              <div className="p-16 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
                <p className="text-xs">Loading movement audit ledger...</p>
              </div>
            ) : movements.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <History className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No stock movements recorded</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Batch #</th>
                      <th className="py-3 px-4">Quantity Change</th>
                      <th className="py-3 px-4">Reason / Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {movements.map((m) => {
                      const isPositive = m.quantity > 0;
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {new Date(m.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                m.type === "PURCHASE" || m.type === "TRANSFER_IN" || m.type === "RETURN"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40"
                                  : m.type === "SALE" || m.type === "TRANSFER_OUT"
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40"
                                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/40"
                              }`}
                            >
                              {m.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                            {m.batchNumber || "—"}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`font-black font-mono ${
                                isPositive ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {isPositive ? `+${m.quantity}` : m.quantity} units
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-[11px]">
                            {m.reason || "—"}
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

      {/* ADJUST STOCK MODAL */}
      {adjustModalOpen && adjustItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-amber-500" />
                Manual Stock Adjustment
              </h3>
              <button onClick={() => setAdjustModalOpen(false)} className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="mt-4 space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="text-xs font-bold text-slate-900 dark:text-white">{adjustItem.productName}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Batch: {adjustItem.batchNumber} • Current Available: {adjustItem.quantity} {adjustItem.unit}s
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Adjustment Type
                </label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                >
                  <option value="ADJUSTMENT">Stock Audit Correction (Add/Subtract)</option>
                  <option value="DAMAGE">Damage / Broken / Expired Disposal (-)</option>
                  <option value="RETURN">Customer Return (+)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Quantity Change (use negative to reduce, positive to increase) *
                </label>
                <input
                  type="number"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Adjustment *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Audit discrepancy, Bottle broken, Returned by customer"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjusting || adjustQty === 0}
                  className="flex items-center gap-2 bg-brand-primary text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  {adjusting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BATCH METADATA MODAL */}
      {editBatchModalOpen && editBatchItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-brand-primary" />
                Edit Batch Details
              </h3>
              <button onClick={() => setEditBatchModalOpen(false)} className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditBatchSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    value={editBatchData.batchNumber}
                    onChange={(e) => setEditBatchData({ ...editBatchData, batchNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={editBatchData.expiryDate}
                    onChange={(e) => setEditBatchData({ ...editBatchData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Shelf / Rack Location
                </label>
                <input
                  type="text"
                  value={editBatchData.shelfLocation}
                  onChange={(e) => setEditBatchData({ ...editBatchData, shelfLocation: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Purchase Price ৳
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editBatchData.purchasePrice}
                    onChange={(e) =>
                      setEditBatchData({ ...editBatchData, purchasePrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Selling Price ৳
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editBatchData.sellingPrice}
                    onChange={(e) =>
                      setEditBatchData({ ...editBatchData, sellingPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditBatchModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editingBatch}
                  className="flex items-center gap-2 bg-brand-primary text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  {editingBatch && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
