"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Branch, InventoryItem } from "@/types";
import { useAuth } from "@/context/AuthContext";
import {
  Boxes,
  Plus,
  Search,
  Store,
  Barcode,
  MapPin,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface StockListViewProps {
  onNavigate: (module: any) => void;
}

export function StockListView({ onNavigate }: StockListViewProps) {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || "");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [nearExpiryAlerts, setNearExpiryAlerts] = useState<any[]>([]);

  // Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustType, setAdjustType] = useState<"ADD" | "DAMAGE" | "CORRECTION" | "EXPIRED">("CORRECTION");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

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

  const loadAlerts = async () => {
    if (!selectedBranchId) return;
    try {
      const res = await fetchApi(`/inventory/alerts/${selectedBranchId}`);
      if (res.success && res.data) {
        setLowStockAlerts(res.data.lowStock || []);
        setNearExpiryAlerts(res.data.nearExpiry || []);
      }
    } catch (err) {
      console.error("Failed to load alerts", err);
    }
  };

  const loadBranchStock = async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("limit", "150");
      if (search) params.append("search", search);

      const res = await fetchApi(`/inventory/branch/${selectedBranchId}?${params.toString()}`);
      if (res.success && res.data) {
        setInventory(res.data);
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
      loadAlerts();
    }
  }, [selectedBranchId]);

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
          reason: adjustReason || "Stock level calibration",
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to adjust stock");

      setAdjustModalOpen(false);
      setAdjustItem(null);
      loadBranchStock();
      loadAlerts();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAdjusting(false);
    }
  };

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
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="h-6 w-6 text-brand-primary" />
            Branch Batch Inventory & Stock Levels
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time batch-level inventory tracking, FEFO expiration breakdown, shelf locations, and calibration adjustments.
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
            Add Stock Batch
          </button>
        </div>
      </div>

      {/* KPI Cards (Low Stock + Near Expiry) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 flex items-center justify-center font-black">
              {lowStockAlerts.length}
            </div>
            <div>
              <div className="font-bold text-xs text-rose-900 dark:text-rose-200">
                Low Stock Threshold Alerts
              </div>
              <div className="text-[10px] text-rose-600 dark:text-rose-400">
                {lowStockAlerts.length > 0
                  ? `${lowStockAlerts.length} medicines need restocking`
                  : "All stock levels healthy"}
              </div>
            </div>
          </div>
        </div>

        <div
          onClick={() => onNavigate("inv_expired_products")}
          className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-center justify-between cursor-pointer hover:border-amber-400 transition"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 flex items-center justify-center font-black">
              {nearExpiryAlerts.length}
            </div>
            <div>
              <div className="font-bold text-xs text-amber-900 dark:text-amber-200">
                Near-Expiry Batches (≤ 90d)
              </div>
              <div className="text-[10px] text-amber-600 dark:text-amber-400">
                {nearExpiryAlerts.length > 0
                  ? `${nearExpiryAlerts.length} batches require priority selling`
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadBranchStock()}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
          />
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
            <p className="text-xs">Loading branch batch inventory...</p>
          </div>
        ) : inventory.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Boxes className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
              No stock batches recorded in this branch
            </p>
            <p className="text-xs mt-1">Click "Add Stock Batch" above to record intake.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3.5 px-4">Medicine & Formulation</th>
                  <th className="py-3.5 px-4">Batch # / Barcode</th>
                  <th className="py-3.5 px-4">Expiry Date (FEFO)</th>
                  <th className="py-3.5 px-4">Packaging Breakdown</th>
                  <th className="py-3.5 px-4">Selling Price</th>
                  <th className="py-3.5 px-4">Rack Location</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {inventory.map((inv) => {
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
                            <div className="font-mono">{new Date(inv.expiryDate).toLocaleDateString()}</div>
                            {inv.isExpired ? (
                              <span className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Expired
                              </span>
                            ) : (inv.daysUntilExpiry ?? 999) <= 90 ? (
                              <span className="text-[10px] text-amber-500 font-bold">
                                {inv.daysUntilExpiry}d left
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900 dark:text-white">
                          {inv.quantity} {inv.unit}s
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">{readableStock}</div>
                      </td>

                      <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">
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
                        <button
                          onClick={() => {
                            setAdjustItem(inv);
                            setAdjustQty(0);
                            setAdjustReason("");
                            setAdjustModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust Modal */}
      {adjustModalOpen && adjustItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Boxes className="h-5 w-5 text-brand-primary" />
              Adjust Stock Level
            </h3>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">
                {adjustItem.productName} ({adjustItem.size || "Unit"})
              </div>
              <div className="text-slate-400">
                Batch: {adjustItem.batchNumber} • Current: {adjustItem.quantity} {adjustItem.unit}s
              </div>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Adjustment Type
                </label>
                <select
                  value={adjustType}
                  onChange={(e: any) => setAdjustType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                >
                  <option value="CORRECTION">Quantity Correction / Count Fix</option>
                  <option value="ADD">Restock Addition (+)</option>
                  <option value="DAMAGE">Damaged / Broken Product (-)</option>
                  <option value="EXPIRED">Expired Medicine Disposal (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Quantity (Units) *
                </label>
                <input
                  type="number"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason / Notes *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physical inventory count calibration"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {adjusting ? "Updating..." : "Save Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
