"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Branch } from "@/types";
import { useAuth } from "@/context/AuthContext";
import {
  History,
  Search,
  Store,
  Loader2,
  TrendingDown,
  TrendingUp,
  Boxes,
} from "lucide-react";

export function StockHistoryView() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || "");
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [movementType, setMovementType] = useState("");
  const [search, setSearch] = useState("");

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

  const loadMovements = async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("limit", "100");
      if (movementType) params.append("type", movementType);
      if (search) params.append("search", search);

      const res = await fetchApi(`/inventory/movements/${selectedBranchId}?${params.toString()}`);
      if (res.success && res.data) {
        setMovements(res.data);
      }
    } catch (err) {
      console.error("Failed to load stock movements", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBranchId) {
      loadMovements();
    }
  }, [selectedBranchId, movementType]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadMovements();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Stock Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Stock History</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <History className="h-6 w-6 text-brand-primary" />
            Stock Movement & Audit Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete real-time transaction ledger for stock intakes, POS sales deductions, transfers, and calibration adjustments.
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

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name, batch, reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={movementType}
            onChange={(e) => setMovementType(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="">All Movement Types</option>
            <option value="INWARD">Stock Inward / Purchases</option>
            <option value="POS_SALE">POS Sales (Counter)</option>
            <option value="ADJUSTMENT_ADD">Calibration Addition (+)</option>
            <option value="ADJUSTMENT_DEDUCT">Calibration Deduction (-)</option>
            <option value="TRANSFER_OUT">Transfer Out (Dispatched)</option>
            <option value="TRANSFER_IN">Transfer In (Received)</option>
            <option value="RETURN">Sales Return / Restock</option>
          </select>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
            <p className="text-xs">Loading audit ledger...</p>
          </div>
        ) : movements.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Boxes className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No stock movements found</p>
            <p className="text-xs mt-1">Transactions will record here automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Medicine & Formulation</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4">Quantity Change</th>
                  <th className="py-3 px-4">Before → After Stock</th>
                  <th className="py-3 px-4">User / Staff</th>
                  <th className="py-3 px-4">Reference & Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {movements.map((m) => {
                  const isPositive = m.quantity > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {m.product?.name || "Product"}
                        {m.product?.genericName && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            Generic: {m.product.genericName}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.type.includes("INWARD") || m.type.includes("ADD") || m.type.includes("RETURN")
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : m.type.includes("SALE")
                              ? "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold">
                        <span
                          className={`flex items-center gap-1 font-mono ${
                            isPositive ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {isPositive ? `+${m.quantity}` : m.quantity}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {m.previousStock} → <span className="font-bold text-slate-900 dark:text-white">{m.newStock}</span>
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {m.user?.name || "System"}
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px] truncate max-w-xs">
                        {m.referenceId ? `Ref: ${m.referenceId}` : ""} {m.notes ? `• ${m.notes}` : ""}
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
  );
}
