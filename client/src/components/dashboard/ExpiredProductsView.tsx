"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Branch, InventoryItem } from "@/types";
import { useAuth } from "@/context/AuthContext";
import {
  AlertTriangle,
  CalendarX2,
  Search,
  Store,
  Boxes,
  Loader2,
  Barcode,
  MapPin,
  Clock,
  Trash2,
  CheckCircle2,
} from "lucide-react";

export function ExpiredProductsView() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || "");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "EXPIRED" | "CRITICAL" | "NEAR">("ALL");

  // Adjust / Write-off modal
  const [writeOffModalOpen, setWriteOffModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [writeOffQty, setWriteOffQty] = useState(0);
  const [writeOffReason, setWriteOffReason] = useState("Expired medication disposal");
  const [submittingWriteOff, setSubmittingWriteOff] = useState(false);

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

  const loadStock = async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("limit", "100");
      if (search) params.append("search", search);

      const res = await fetchApi(`/inventory/branch/${selectedBranchId}?${params.toString()}`);
      if (res.success && res.data) {
        setInventory(res.data);
      }
    } catch (err) {
      console.error("Failed to load stock for expiry check", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, [selectedBranchId]);

  // Compute expiry metrics
  const expiredItems = inventory.filter((inv) => inv.isExpired || (inv.daysUntilExpiry !== null && inv.daysUntilExpiry !== undefined && inv.daysUntilExpiry <= 0));
  const criticalItems = inventory.filter((inv) => !inv.isExpired && inv.daysUntilExpiry !== null && inv.daysUntilExpiry !== undefined && inv.daysUntilExpiry > 0 && inv.daysUntilExpiry <= 30);
  const nearItems = inventory.filter((inv) => !inv.isExpired && inv.daysUntilExpiry !== null && inv.daysUntilExpiry !== undefined && inv.daysUntilExpiry > 30 && inv.daysUntilExpiry <= 90);

  const filteredItems = inventory.filter((inv) => {
    const isExp = inv.isExpired || (inv.daysUntilExpiry !== null && inv.daysUntilExpiry !== undefined && inv.daysUntilExpiry <= 0);
    const days = inv.daysUntilExpiry ?? 999;

    if (filterType === "EXPIRED") return isExp;
    if (filterType === "CRITICAL") return !isExp && days > 0 && days <= 30;
    if (filterType === "NEAR") return !isExp && days > 30 && days <= 90;
    // Default ALL shows any batch that is expired or near-expiry (<= 90 days)
    return isExp || days <= 90;
  });

  const handleWriteOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || writeOffQty <= 0) return;
    try {
      setSubmittingWriteOff(true);
      const res = await fetchApi("/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({
          branchId: selectedBranchId,
          productId: selectedItem.productId,
          inventoryId: selectedItem.id,
          quantity: writeOffQty,
          type: "DAMAGE",
          reason: writeOffReason || "Expired batch disposal",
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to record disposal");

      setWriteOffModalOpen(false);
      setSelectedItem(null);
      loadStock();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingWriteOff(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Inventory</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Expired Products</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarX2 className="h-6 w-6 text-rose-500" />
            Expired & Near-Expiry Batch Inventory (FEFO)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor approaching expiry thresholds (≤ 90 days), write off expired stocks, and enforce First-Expiry-First-Out dispensing.
          </p>
        </div>

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
      </div>

      {/* Expiry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setFilterType("EXPIRED")}
          className={`p-5 rounded-2xl border cursor-pointer transition ${
            filterType === "EXPIRED"
              ? "bg-rose-500/10 border-rose-500 shadow-sm"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
              Expired Batches (Immediate Action)
            </span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {expiredItems.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Blocked from POS sales • Dispose now</div>
        </div>

        <div
          onClick={() => setFilterType("CRITICAL")}
          className={`p-5 rounded-2xl border cursor-pointer transition ${
            filterType === "CRITICAL"
              ? "bg-amber-500/10 border-amber-500 shadow-sm"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              Critical (≤ 30 Days)
            </span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {criticalItems.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">High priority FEFO selling required</div>
        </div>

        <div
          onClick={() => setFilterType("NEAR")}
          className={`p-5 rounded-2xl border cursor-pointer transition ${
            filterType === "NEAR"
              ? "bg-sky-500/10 border-sky-500 shadow-sm"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-sky-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
              Near Expiry (31 - 90 Days)
            </span>
            <Clock className="h-4 w-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-2">
            {nearItems.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Approaching shelf life cutoff</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex-1 relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name, generic, batch number, barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadStock()}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setFilterType("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterType === "ALL"
                ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            All Affected ({expiredItems.length + criticalItems.length + nearItems.length})
          </button>
          <button
            onClick={() => setFilterType("EXPIRED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterType === "EXPIRED"
                ? "bg-rose-500 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Expired ({expiredItems.length})
          </button>
        </div>
      </div>

      {/* Expired & Near-Expiry Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
            <p className="text-xs">Analyzing branch expiry ledger...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No expired or near-expiry batches in this branch!
            </p>
            <p className="text-xs mt-1 text-slate-400">All medicine batches are within safe shelf-life limits.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3 px-4">Medicine & Generic</th>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Remaining Days</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {filteredItems.map((inv) => {
                  const isExp = inv.isExpired || (inv.daysUntilExpiry !== null && inv.daysUntilExpiry !== undefined && inv.daysUntilExpiry <= 0);
                  const days = inv.daysUntilExpiry ?? 0;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {inv.productName}
                          {inv.size && (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] px-1.5 py-0.2 rounded font-semibold">
                              {inv.size}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {inv.genericName ? (
                            <span className="font-semibold text-brand-primary">
                              {inv.genericName} •{" "}
                            </span>
                          ) : null}
                          {inv.brandName || "Generic"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {inv.batchNumber || "Unassigned"}
                        {inv.barcode && (
                          <div className="text-[10px] text-slate-400 font-normal flex items-center gap-1 mt-0.5">
                            <Barcode className="h-3 w-3" />
                            {inv.barcode}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        {inv.expiryDate ? new Date(inv.expiryDate).toLocaleDateString() : "—"}
                      </td>

                      <td className="py-3.5 px-4">
                        {isExp ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center gap-1 w-fit">
                            <AlertTriangle className="h-3 w-3" />
                            EXPIRED ({Math.abs(days)}d ago)
                          </span>
                        ) : days <= 30 ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center gap-1 w-fit">
                            <Clock className="h-3 w-3" />
                            {days} Days Left
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 flex items-center gap-1 w-fit">
                            <Clock className="h-3 w-3" />
                            {days} Days Left
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">
                        {inv.quantity} {inv.unit}s
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                          <MapPin className="h-3 w-3" />
                          {inv.shelfLocation || "Unassigned"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedItem(inv);
                            setWriteOffQty(inv.quantity);
                            setWriteOffModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ml-auto"
                        >
                          <Trash2 className="h-3 w-3" />
                          Write-off Batch
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

      {/* Write-off Modal */}
      {writeOffModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-500" />
              Write-off / Dispose Expired Stock
            </h3>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">
                {selectedItem.productName} ({selectedItem.size || "Unit"})
              </div>
              <div className="text-slate-400">
                Batch: {selectedItem.batchNumber} • Available: {selectedItem.quantity} {selectedItem.unit}s
              </div>
            </div>

            <form onSubmit={handleWriteOffSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Quantity to Dispose *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedItem.quantity}
                  value={writeOffQty}
                  onChange={(e) => setWriteOffQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Disposal / Write-off Reason
                </label>
                <input
                  type="text"
                  required
                  value={writeOffReason}
                  onChange={(e) => setWriteOffReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWriteOffModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWriteOff}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {submittingWriteOff ? "Processing..." : "Confirm Disposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
