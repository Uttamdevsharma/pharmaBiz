"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { OwnerModule } from "./DashboardSidebar";
import { DateRangeFilter, DatePreset, getComputedDateRange } from "./DateRangeFilter";
import {
  AlertTriangle,
  ArrowLeft,
  Search,
  Store,
  Calendar,
  DollarSign,
  Package,
  Layers,
  ArrowRight,
  Loader2,
  RefreshCw,
  FileSpreadsheet,
} from "lucide-react";

import { useBranchContext } from "@/context/BranchContext";

interface DamagedProductsViewProps {
  onNavigate?: (module: OwnerModule) => void;
  selectedBranchId?: string;
}

function formatQuantityWithPackaging(qty: number, item: any): string {
  const p = item.product;
  const stripsPerBox = Number(p?.stripsPerBox || 0);
  const tabletsPerStrip = Number(p?.tabletsPerStrip || 0);
  const baseUnit = (p?.unit || "tablet").toLowerCase();

  if (stripsPerBox > 1 && tabletsPerStrip > 1) {
    const boxSize = stripsPerBox * tabletsPerStrip;
    if (qty >= boxSize && qty % boxSize === 0) {
      const boxes = qty / boxSize;
      return `${boxes} Box${boxes > 1 ? "es" : ""} / ${qty} ${baseUnit}s`;
    } else if (qty >= tabletsPerStrip && qty % tabletsPerStrip === 0) {
      const strips = qty / tabletsPerStrip;
      return `${strips} Strip${strips > 1 ? "s" : ""} / ${qty} ${baseUnit}s`;
    }
    return `${qty} ${baseUnit}s`;
  }

  const pType = (item.packageType || p?.defaultPackType || baseUnit).toLowerCase();
  return `${qty} ${pType}${qty > 1 && !pType.endsWith("s") ? "s" : ""}`;
}

export function DamagedProductsView({ onNavigate, selectedBranchId: propBranchId }: DamagedProductsViewProps) {
  const {
    selectedBranchId: contextBranchId,
    currentBranch,
    isAllBranches,
  } = useBranchContext();

  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;

  const [loading, setLoading] = useState(true);
  const [damagedData, setDamagedData] = useState<{
    summary: {
      totalDamagedUnits: number;
      totalMissingUnits: number;
      totalDamagedValue: number;
      totalMissingValue: number;
      totalLossValue: number;
      incidentCount: number;
    };
    data: any[];
  }>({
    summary: {
      totalDamagedUnits: 0,
      totalMissingUnits: 0,
      totalDamagedValue: 0,
      totalMissingValue: 0,
      totalLossValue: 0,
      incidentCount: 0,
    },
    data: [],
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const loadData = async () => {
    try {
      setLoading(true);
      const { start, end } = getComputedDateRange(datePreset, startDate, endDate);
      const queryParams = new URLSearchParams();
      if (effectiveBranchId && effectiveBranchId !== "all") {
        queryParams.append("branchId", effectiveBranchId);
      }
      if (searchQuery) {
        queryParams.append("search", searchQuery);
      }
      if (start) queryParams.append("startDate", start);
      if (end) queryParams.append("endDate", end);

      const damRes: any = await fetchApi(
        `/transfers/damaged-products?${queryParams.toString()}`
      );

      if (damRes.success) {
        setDamagedData({
          summary: damRes.summary || {
            totalDamagedUnits: 0,
            totalMissingUnits: 0,
            totalDamagedValue: 0,
            totalMissingValue: 0,
            totalLossValue: 0,
            incidentCount: 0,
          },
          data: Array.isArray(damRes.data) ? damRes.data : [],
        });
      }
    } catch (err) {
      console.error("Failed to load damaged products data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [effectiveBranchId, datePreset, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Stock Management</span>
            <span>/</span>
            <span className="text-amber-500 font-bold">Damaged Products & Losses</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <span>Damaged & Missing Products Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Permanent records of transfer losses, transit damages, and missing units with batch-level purchase/cost price valuation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
            title="Refresh Ledger"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("stock_transfer_history")}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Transfer Ledger</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Transit Loss Value
            </div>
            <div className="text-xl font-black text-red-600 dark:text-red-400 mt-0.5">
              ৳{(damagedData.summary?.totalLossValue || 0).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Damaged Units
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {damagedData.summary?.totalDamagedUnits || 0} Units
              <span className="text-xs font-normal text-slate-400 ml-1.5">
                (৳{(damagedData.summary?.totalDamagedValue || 0).toFixed(2)})
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Missing Units
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {damagedData.summary?.totalMissingUnits || 0} Units
              <span className="text-xs font-normal text-slate-400 ml-1.5">
                (৳{(damagedData.summary?.totalMissingValue || 0).toFixed(2)})
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-slate-500/10 text-slate-500 rounded-2xl">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Incident Records
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {damagedData.summary?.incidentCount || 0} Batches
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <DateRangeFilter
          datePreset={datePreset}
          setDatePreset={setDatePreset}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          label="Damage Record Date Filter"
        />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search medication, generic, batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
            />
          </form>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300">
            <Store className="h-4 w-4 text-amber-500" />
            <span>Scope:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {isAllBranches ? "Company-Wide (All Branches)" : (currentBranch?.name || "Selected Branch")}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            <span>Loading damaged products records...</span>
          </div>
        ) : damagedData.data.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400 space-y-2">
            <Package className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="font-bold text-slate-600 dark:text-slate-400">
              No damaged or missing items recorded.
            </p>
            <p className="text-[11px]">
              When destination branch managers mark damaged or missing units during shipment intake, they will appear here with full cost accounting.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Medication & Batch</th>
                  <th className="py-3.5 px-4">Route (From → To)</th>
                  <th className="py-3.5 px-4">Damage / Loss Qty</th>
                  <th className="py-3.5 px-4">Cost Price (৳)</th>
                  <th className="py-3.5 px-4">Total Loss Value (৳)</th>
                  <th className="py-3.5 px-4">Transfer Ref</th>
                  <th className="py-3.5 px-4">Intake Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {damagedData.data.map((item: any) => {
                  const hasDamage = (item.damagedQuantity || 0) > 0;
                  const hasMissing = (item.missingQuantity || 0) > 0;
                  const totalLineLoss = (Number(item.damagedValue) || 0) + (Number(item.missingValue) || 0);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.product?.name || "Product"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.product?.genericName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Batch: {item.batchNumber || "DEFAULT"}
                          {item.expiryDate ? ` | Exp: ${new Date(item.expiryDate).toLocaleDateString()}` : ""}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {item.transfer?.fromBranch?.name || "Source"}
                          </span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {item.transfer?.toBranch?.name || "Destination"}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {hasDamage && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                              {formatQuantityWithPackaging(item.damagedQuantity, item)} Damaged
                            </span>
                          )}
                          {hasMissing && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 ml-1">
                              {formatQuantityWithPackaging(item.missingQuantity, item)} Missing
                            </span>
                          )}
                          {item.notes && (
                            <div className="text-[10px] text-slate-400 italic">
                              "{item.notes}"
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold font-mono text-slate-700 dark:text-slate-300">
                        ৳{Number(item.costPrice || 0).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 font-black font-mono text-red-600 dark:text-red-400 text-sm">
                        ৳{totalLineLoss.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-brand-primary">
                        #{item.transfer?.id ? item.transfer.id.substring(0, 8).toUpperCase() : "TRF"}
                      </td>

                      <td className="py-3.5 px-4 text-[11px] text-slate-500">
                        {item.transfer?.receivedDate
                          ? new Date(item.transfer.receivedDate).toLocaleDateString()
                          : item.updatedAt
                          ? new Date(item.updatedAt).toLocaleDateString()
                          : "-"}
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
