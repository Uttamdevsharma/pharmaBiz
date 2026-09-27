"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { InventoryItem } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useBranchContext } from "@/context/BranchContext";
import { showAlert } from "@/lib/swal";
import {
  AlertTriangle,
  CalendarX2,
  Search,
  Store,
  Loader2,
  Barcode,
  MapPin,
  Clock,
  Trash2,
  CheckCircle2,
  Building2,
  Calendar,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ExpiredProductsViewProps {
  selectedBranchId?: string;
}

type ExpiryFilterTab = "ALL" | "EXPIRED" | "CRITICAL" | "NEAR";

export function ExpiredProductsView({ selectedBranchId: propBranchId }: ExpiredProductsViewProps = {}) {
  const { user } = useAuth();
  const {
    selectedBranchId: contextBranchId,
    currentBranch,
    isAllBranches,
  } = useBranchContext();

  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<ExpiryFilterTab>("ALL");
  const [selectedCompany, setSelectedCompany] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Adjust / Write-off modal
  const [writeOffModalOpen, setWriteOffModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [writeOffQty, setWriteOffQty] = useState(0);
  const [writeOffReason, setWriteOffReason] = useState("Expired medication disposal");
  const [submittingWriteOff, setSubmittingWriteOff] = useState(false);

  const loadStock = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("limit", "500");

      const targetPath =
        effectiveBranchId && effectiveBranchId !== "all"
          ? `/inventory/branch/${effectiveBranchId}?${params.toString()}`
          : `/inventory/branch/all?${params.toString()}`;

      const res = await fetchApi(targetPath);
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
  }, [effectiveBranchId]);

  // Compute expiry metrics
  const expiredItems = useMemo(
    () =>
      inventory.filter(
        (inv) =>
          inv.isExpired ||
          (inv.daysUntilExpiry !== null && inv.daysUntilExpiry !== undefined && inv.daysUntilExpiry <= 0)
      ),
    [inventory]
  );

  const criticalItems = useMemo(
    () =>
      inventory.filter(
        (inv) =>
          !inv.isExpired &&
          inv.daysUntilExpiry !== null &&
          inv.daysUntilExpiry !== undefined &&
          inv.daysUntilExpiry > 0 &&
          inv.daysUntilExpiry <= 30
      ),
    [inventory]
  );

  const nearItems = useMemo(
    () =>
      inventory.filter(
        (inv) =>
          !inv.isExpired &&
          inv.daysUntilExpiry !== null &&
          inv.daysUntilExpiry !== undefined &&
          inv.daysUntilExpiry > 30 &&
          inv.daysUntilExpiry <= 90
      ),
    [inventory]
  );

  // Extract unique companies / manufacturers
  const availableCompanies = useMemo(() => {
    const set = new Set<string>();
    for (const inv of inventory) {
      const brand = inv.brandName || (inv as any).brandRef?.name || (inv as any).manufacturer;
      const supplier = (inv as any).supplier?.name;
      if (brand && brand.trim()) set.add(brand.trim());
      else if (supplier && supplier.trim()) set.add(supplier.trim());
    }
    return Array.from(set).sort();
  }, [inventory]);

  // Main Filtered List
  const filteredItems = useMemo(() => {
    return inventory.filter((inv) => {
      const isExp =
        inv.isExpired ||
        (inv.daysUntilExpiry !== null && inv.daysUntilExpiry !== undefined && inv.daysUntilExpiry <= 0);
      const days = inv.daysUntilExpiry ?? 999;

      // 1. Status Tab filter
      if (filterType === "EXPIRED" && !isExp) return false;
      if (filterType === "CRITICAL" && (isExp || days <= 0 || days > 30)) return false;
      if (filterType === "NEAR" && (isExp || days <= 30 || days > 90)) return false;
      if (filterType === "ALL" && !isExp && days > 90) return false;

      // 2. Company / Brand filter
      if (selectedCompany !== "ALL") {
        const brand = (inv.brandName || (inv as any).brandRef?.name || (inv as any).manufacturer || "").toLowerCase();
        const supplier = ((inv as any).supplier?.name || "").toLowerCase();
        const target = selectedCompany.toLowerCase();
        if (!brand.includes(target) && !supplier.includes(target)) {
          return false;
        }
      }

      // 3. Date Range Filter
      if (inv.expiryDate) {
        const expDate = new Date(inv.expiryDate);
        if (fromDate) {
          const from = new Date(fromDate);
          from.setHours(0, 0, 0, 0);
          if (expDate < from) return false;
        }
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
          if (expDate > to) return false;
        }
      }

      // 4. Search text
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = (inv.productName || "").toLowerCase().includes(q);
        const matchGen = (inv.genericName || "").toLowerCase().includes(q);
        const matchBatch = (inv.batchNumber || "").toLowerCase().includes(q);
        const matchBarcode = (inv.barcode || "").toLowerCase().includes(q);
        const matchBrand = (inv.brandName || "").toLowerCase().includes(q);
        if (!matchName && !matchGen && !matchBatch && !matchBarcode && !matchBrand) {
          return false;
        }
      }

      return true;
    });
  }, [inventory, filterType, selectedCompany, fromDate, toDate, search]);

  // Reset page when any filter changes
  useEffect(() => {
    setPage(1);
  }, [filterType, selectedCompany, fromDate, toDate, search, pageSize]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  // Write-off Submission
  const handleWriteOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || writeOffQty <= 0) return;
    try {
      setSubmittingWriteOff(true);
      const res = await fetchApi("/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({
          branchId: selectedItem.branchId || (effectiveBranchId !== "all" ? effectiveBranchId : undefined),
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
      showAlert.success("Stock Disposed", `${writeOffQty} ${selectedItem.unit} removed from inventory.`);
      loadStock();
    } catch (err: any) {
      showAlert.error("Disposal Failed", err.message);
    } finally {
      setSubmittingWriteOff(false);
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setFilterType("ALL");
    setSelectedCompany("ALL");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Stock Management</span>
            <span>/</span>
            <span className="text-rose-600 dark:text-rose-400 font-bold">Expiry & Near Expiry</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <CalendarX2 className="h-5 w-5" />
            </div>
            <span>Expiry & Near Expiry Batches</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track expired and upcoming near-expiry medicine batches, filter by company and date, or write off unsold stock.
          </p>
        </div>

        {/* Scope and Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
            <Store className="h-4 w-4 text-brand-primary" />
            <span>Scope:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {isAllBranches ? "All Branches" : currentBranch?.name || "Selected Branch"}
            </span>
          </div>

          <button
            type="button"
            onClick={loadStock}
            disabled={loading}
            className="h-9 px-3 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-50"
            title="Refresh Stock"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-brand-primary" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar (Integrated with right-side status tabs & counts) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by medicine, generic name, batch number, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-11 bg-slate-50 hover:bg-white dark:bg-slate-800/60 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:border-brand-primary transition"
            />
          </div>

          {/* Right-Side Status Badges / Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl overflow-x-auto shrink-0">
            <button
              type="button"
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                filterType === "ALL"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>All at Risk</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                {expiredItems.length + criticalItems.length + nearItems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType("EXPIRED")}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                filterType === "EXPIRED"
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Expired</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                filterType === "EXPIRED" ? "bg-white/20 text-white" : "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300"
              }`}>
                {expiredItems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType("CRITICAL")}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                filterType === "CRITICAL"
                  ? "bg-amber-500 text-white shadow-2xs"
                  : "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>≤ 30 Days</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                filterType === "CRITICAL" ? "bg-white/20 text-white" : "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300"
              }`}>
                {criticalItems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType("NEAR")}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                filterType === "NEAR"
                  ? "bg-sky-600 text-white shadow-2xs"
                  : "text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>31-90 Days</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                filterType === "NEAR" ? "bg-white/20 text-white" : "bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300"
              }`}>
                {nearItems.length}
              </span>
            </button>
          </div>
        </div>

        {/* Second Row: Company Dropdown & Date Range Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Company / Brand Filter */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-3 h-10 rounded-xl">
            <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="bg-transparent w-full text-slate-800 dark:text-slate-200 font-bold outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                All Companies / Brands ({availableCompanies.length})
              </option>
              {availableCompanies.map((c) => (
                <option key={c} value={c} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Expiry From Date */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-3 h-10 rounded-xl">
            <span className="text-slate-400 text-[11px] shrink-0 font-medium">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent w-full text-slate-800 dark:text-slate-200 font-semibold outline-none cursor-pointer text-xs"
            />
          </div>

          {/* Expiry To Date */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-3 h-10 rounded-xl">
            <span className="text-slate-400 text-[11px] shrink-0 font-medium">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent w-full text-slate-800 dark:text-slate-200 font-semibold outline-none cursor-pointer text-xs"
            />
          </div>

          {/* Reset Filters Button */}
          <div className="flex items-center justify-end">
            {(search || filterType !== "ALL" || selectedCompany !== "ALL" || fromDate || toDate) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-full sm:w-auto h-10 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expired & At-Risk Stock Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 text-brand-primary animate-spin" />
            <p className="text-xs font-bold text-slate-500">Checking branch expiry records...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-3" />
            <p className="text-base font-bold text-slate-800 dark:text-slate-200">
              No expired or near-expiry batches match your filter!
            </p>
            <p className="text-xs mt-1 text-slate-400">
              All other medicine batches are safely within their shelf-life limits.
            </p>
            {(search || filterType !== "ALL" || selectedCompany !== "ALL" || fromDate || toDate) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer hover:bg-brand-primary-hover"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3.5 px-3 text-center w-12">#</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Medicine Name & Generic</th>
                  <th className="py-3.5 px-3 min-w-[130px]">Batch Number</th>
                  <th className="py-3.5 px-3 min-w-[120px]">Company / Brand</th>
                  <th className="py-3.5 px-3 text-right min-w-[100px]">Stock Qty</th>
                  <th className="py-3.5 px-3 min-w-[110px]">Location</th>
                  <th className="py-3.5 px-3 min-w-[120px]">Expiry Date</th>
                  <th className="py-3.5 px-3 min-w-[120px]">Status</th>
                  <th className="py-3.5 px-4 text-center min-w-[100px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {paginatedItems.map((inv, idx) => {
                  const serialNo = (page - 1) * pageSize + idx + 1;
                  const isExp =
                    inv.isExpired ||
                    (inv.daysUntilExpiry !== null && inv.daysUntilExpiry !== undefined && inv.daysUntilExpiry <= 0);
                  const days = inv.daysUntilExpiry ?? 0;
                  const companyName =
                    inv.brandName ||
                    (inv as any).brandRef?.name ||
                    (inv as any).manufacturer ||
                    (inv as any).supplier?.name ||
                    "—";

                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition ${
                        isExp ? "bg-rose-50/20 dark:bg-rose-950/10" : ""
                      }`}
                    >
                      {/* # Serial */}
                      <td className="py-3.5 px-3 text-center text-xs font-bold text-slate-400 font-mono">
                        {serialNo}
                      </td>

                      {/* Medicine Name & Generic */}
                      <td className="py-3.5 px-4">
                        <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                          <span>{inv.productName}</span>
                          {inv.size && (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded font-bold">
                              {inv.size}
                            </span>
                          )}
                          {inv.requiresPrescription && (
                            <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[10px] px-1.5 py-0.2 rounded font-black">
                              Rx
                            </span>
                          )}
                        </div>
                        {inv.genericName && (
                          <div className="text-[11px] text-brand-primary dark:text-brand-primary-hover font-semibold mt-0.5">
                            {inv.genericName}
                          </div>
                        )}
                      </td>

                      {/* Batch Number */}
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        <div>{inv.batchNumber || "Unassigned"}</div>
                        {inv.barcode && (
                          <div className="text-[10px] text-slate-400 font-normal flex items-center gap-1 mt-0.5">
                            <Barcode className="h-3 w-3 shrink-0" />
                            <span>{inv.barcode}</span>
                          </div>
                        )}
                      </td>

                      {/* Company / Brand */}
                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {companyName}
                        </span>
                      </td>

                      {/* Stock Quantity */}
                      <td className="py-3.5 px-3 text-right font-mono font-black text-slate-900 dark:text-white text-sm">
                        {inv.quantity.toLocaleString()}{" "}
                        <span className="text-[10px] text-slate-500 font-normal">
                          {inv.unit || "unit"}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px]" title={inv.shelfLocation || "General Shop"}>
                            {inv.shelfLocation || "General Shop"}
                          </span>
                        </div>
                      </td>

                      {/* Expiry Date */}
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {inv.expiryDate
                          ? new Date(inv.expiryDate).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {isExp ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 flex items-center gap-1 w-fit">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            Expired ({Math.abs(days)}d ago)
                          </span>
                        ) : days <= 30 ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 flex items-center gap-1 w-fit">
                            <Clock className="h-3 w-3 shrink-0" />
                            {days}d left
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-400 border border-sky-200 dark:border-sky-900/50 flex items-center gap-1 w-fit">
                            <Clock className="h-3 w-3 shrink-0" />
                            {days}d left
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItem(inv);
                            setWriteOffQty(inv.quantity);
                            setWriteOffModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white dark:bg-rose-950/40 dark:hover:bg-rose-600 dark:text-rose-300 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer mx-auto shadow-2xs border border-rose-200 dark:border-rose-900/40"
                          title="Dispose / Write-off this batch"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Dispose</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Pagination */}
        {!loading && filteredItems.length > 0 && (
          <div className="p-4 bg-slate-50/90 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            {/* Left: Showing info & per page */}
            <div className="flex items-center gap-3 flex-wrap">
              <span>
                Showing <strong className="text-slate-900 dark:text-white font-mono">{(page - 1) * pageSize + 1}</strong> to{" "}
                <strong className="text-slate-900 dark:text-white font-mono">
                  {Math.min(page * pageSize, filteredItems.length)}
                </strong> of <strong className="text-slate-900 dark:text-white font-mono">{filteredItems.length}</strong> batches
              </span>

              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg">
                <span className="font-bold text-slate-600 dark:text-slate-300">Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value) || 15);
                    setPage(1);
                  }}
                  className="bg-transparent font-black text-brand-primary outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Right: Prev / Next buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 font-bold text-slate-700 dark:text-slate-300 font-mono">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Write-off / Dispose Modal */}
      {writeOffModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-500" />
              <span>Write-off / Dispose Stock</span>
            </h3>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1 border border-slate-100 dark:border-slate-700">
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                {selectedItem.productName} ({selectedItem.size || "Unit"})
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                Batch: <strong className="font-mono text-slate-700 dark:text-slate-200">{selectedItem.batchNumber}</strong> • Stock:{" "}
                <strong className="font-mono text-slate-700 dark:text-slate-200">{selectedItem.quantity} {selectedItem.unit}</strong>
              </div>
            </div>

            <form onSubmit={handleWriteOffSubmit} className="space-y-3.5">
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
                  className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Disposal Reason
                </label>
                <input
                  type="text"
                  required
                  value={writeOffReason}
                  onChange={(e) => setWriteOffReason(e.target.value)}
                  placeholder="e.g. Expired medication disposal"
                  className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWriteOffModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWriteOff}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5"
                >
                  {submittingWriteOff ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Disposing...</span>
                    </>
                  ) : (
                    <span>Confirm Disposal</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
