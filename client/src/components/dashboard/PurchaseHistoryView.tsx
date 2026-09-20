"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { Supplier } from "@/types";
import {
  Receipt,
  Truck,
  Plus,
  Loader2,
  CreditCard,
  FileText,
  X,
  Calendar,
  User,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Store,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useBranchContext } from "@/context/BranchContext";

type DateFilterPreset = "today" | "yesterday" | "this_month" | "this_year" | "custom";

interface PurchaseHistoryViewProps {
  onNavigate: (module: any) => void;
  selectedBranchId?: string;
}

export function PurchaseHistoryView({ onNavigate, selectedBranchId: propBranchId }: PurchaseHistoryViewProps) {
  const {
    selectedBranchId: contextBranchId,
    currentBranch,
    isAllBranches,
  } = useBranchContext();

  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>("this_month");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal for Invoice Breakdown
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);

  // Load suppliers for dropdown filter
  useEffect(() => {
    async function loadSuppliers() {
      try {
        const res = await fetchApi("/suppliers");
        if (res.success && res.data) {
          setSuppliers(res.data);
        }
      } catch (err) {
        console.error("Failed to load suppliers", err);
      }
    }
    loadSuppliers();
  }, []);

  // Compute date range ISO strings based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (dateFilter === "today") {
      const todayStr = formatDate(now);
      return { start: todayStr, end: todayStr };
    }
    if (dateFilter === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = formatDate(y);
      return { start: yStr, end: yStr };
    }
    if (dateFilter === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: formatDate(start), end: formatDate(end) };
    }
    if (dateFilter === "this_year") {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return { start: formatDate(start), end: formatDate(end) };
    }
    if (dateFilter === "custom") {
      return { start: customStartDate, end: customEndDate };
    }
    return { start: "", end: "" };
  }, [dateFilter, customStartDate, customEndDate]);

  // Load purchases with filters
  const loadPurchases = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange.start) params.append("startDate", dateRange.start);
      if (dateRange.end) params.append("endDate", dateRange.end);
      if (selectedSupplierId) params.append("supplierId", selectedSupplierId);
      if (effectiveBranchId && effectiveBranchId !== "all") {
        params.append("branchId", effectiveBranchId);
      }

      const res = await fetchApi(`/suppliers/purchases/list?${params.toString()}`);
      if (res.success && res.data) {
        setPurchases(res.data);
      } else {
        setPurchases([]);
      }
    } catch (err) {
      console.error("Failed to load purchase history", err);
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dateFilter === "custom" && (!customStartDate || !customEndDate)) return;
    loadPurchases();
  }, [dateRange, selectedSupplierId, effectiveBranchId]);

  // Reset pagination to page 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [dateFilter, customStartDate, customEndDate, selectedSupplierId, effectiveBranchId]);

  // Totals for filtered list
  const totals = useMemo(() => {
    return purchases.reduce(
      (acc, p) => {
        acc.total += Number(p.totalAmount || 0);
        acc.paid += Number(p.paidAmount || 0);
        acc.due += Number(p.dueAmount || 0);
        return acc;
      },
      { total: 0, paid: 0, due: 0 }
    );
  }, [purchases]);

  // Pagination calculations
  const totalCount = purchases.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);
  const paginatedPurchases = useMemo(() => {
    return purchases.slice((page - 1) * pageSize, page * pageSize);
  }, [purchases, page, pageSize]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Supplier Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Purchase History</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="h-7 w-7 text-brand-primary" />
            Purchase History
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("sup_payments_due")}
            className="h-11 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition flex items-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Payments / Due
          </button>
          <button
            onClick={() => onNavigate("stock_add_stock")}
            className="h-11 px-5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Stock Inward
          </button>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Invoices</span>
          <div className="text-3xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {purchases.length}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Total Purchase</span>
          <div className="text-3xl font-black font-mono text-slate-900 dark:text-white mt-1">
            ৳{totals.total.toFixed(2)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Total Paid</span>
          <div className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            ৳{totals.paid.toFixed(2)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Total Due</span>
          <div className="text-3xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
            ৳{totals.due.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-400 mr-1 flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> Filter:
            </span>
            {(
              [
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "this_month", label: "This Month" },
                { id: "this_year", label: "This Year" },
                { id: "custom", label: "Custom Date" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setDateFilter(p.id)}
                className={`h-10 px-4 rounded-xl text-sm font-bold transition ${
                  dateFilter === p.id
                    ? "bg-brand-primary text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Supplier Dropdown & Scope Badge */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 outline-none font-bold min-w-[200px]"
              >
                <option value="">All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-10 flex items-center gap-2 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300">
              <Store className="h-4 w-4 text-brand-primary" />
              <span>Scope:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {isAllBranches ? "All Branches" : (currentBranch?.name || "Selected Branch")}
              </span>
            </div>
          </div>
        </div>

        {/* Custom Date Picker Inputs */}
        {dateFilter === "custom" && (
          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Purchases Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
            <p className="text-sm font-bold">Loading purchase records...</p>
          </div>
        ) : purchases.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Receipt className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-base font-bold text-slate-700 dark:text-slate-300">
              No purchases found
            </p>
          </div>
        ) : (
          <div>
            <div className="table-responsive-container">
              <table className="w-full min-w-[750px] text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-black text-xs">
                    <th className="py-4 px-4">Date</th>
                    <th className="py-4 px-4">Branch</th>
                    <th className="py-4 px-4">Supplier</th>
                    <th className="py-4 px-4">Contact</th>
                    <th className="py-4 px-4">Total</th>
                    <th className="py-4 px-4">Paid</th>
                    <th className="py-4 px-4">Due</th>
                    <th className="py-4 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                  {paginatedPurchases.map((p) => {
                    const total = Number(p.totalAmount || 0);
                    const paid = Number(p.paidAmount || 0);
                    const due = Number(p.dueAmount || 0);
                    const contactName =
                      p.contactPerson?.name ||
                      p.contactPersonName ||
                      p.supplier?.contactPerson ||
                      "Direct / General";

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition cursor-pointer"
                        onClick={() => {
                          setSelectedPurchase(p);
                          setDetailModalOpen(true);
                        }}
                      >
                        {/* Date */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-900 dark:text-white">
                            {new Date(p.purchaseDate || p.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {p.invoiceNumber || `PUR-${p.id.slice(-6)}`}
                          </div>
                        </td>

                        {/* Branch */}
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {p.branch?.name || "Main Branch"}
                          </span>
                        </td>

                        {/* Supplier */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5 text-brand-primary shrink-0" />
                            {p.supplier?.name || "Supplier"}
                          </div>
                        </td>

                        {/* Contact Person */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                            <User className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{contactName}</span>
                          </div>
                          {p.contactPerson?.phone && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {p.contactPerson.phone}
                            </div>
                          )}
                        </td>

                        {/* Total */}
                        <td className="py-3.5 px-4 font-black font-mono text-slate-900 dark:text-white">
                          ৳{total.toFixed(2)}
                        </td>

                        {/* Paid */}
                        <td className="py-3.5 px-4 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          ৳{paid.toFixed(2)}
                        </td>

                        {/* Due */}
                        <td className="py-3.5 px-4 font-mono font-bold">
                          {due > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-900/50">
                              ৳{due.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Cleared</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSelectedPurchase(p);
                              setDetailModalOpen(true);
                            }}
                            className="h-9 px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ml-auto active:scale-95"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Clean Pagination Footer */}
            {totalCount > 0 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
                {/* Record Status */}
                <div className="text-slate-600 dark:text-slate-400 font-medium">
                  Showing <strong className="text-slate-900 dark:text-white font-bold">{startItem}</strong> to{" "}
                  <strong className="text-slate-900 dark:text-white font-bold">{endItem}</strong> of{" "}
                  <strong className="text-slate-900 dark:text-white font-bold">{totalCount}</strong> purchase records
                </div>

                {/* Controls: Rows per page & Page navigation */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                    <span>Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-brand-primary cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  {/* Page Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPage(1)}
                      disabled={page <= 1}
                      className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
                      title="First Page"
                    >
                      <ChevronsLeft className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                      title="Previous Page"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Prev</span>
                    </button>

                    <div className="px-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span className="text-slate-900 dark:text-white font-black">{page}</span> / {totalPages}
                    </div>

                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                      title="Next Page"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPage(totalPages)}
                      disabled={page >= totalPages}
                      className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
                      title="Last Page"
                    >
                      <ChevronsRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Purchase Details Breakdown Modal */}
      {detailModalOpen && selectedPurchase && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-6 w-6 text-brand-primary" />
                  Purchase Invoice Breakdown
                </h3>
                <div className="text-xs text-slate-500 font-mono font-bold mt-1">
                  Invoice: {selectedPurchase.invoiceNumber || selectedPurchase.id}
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
              <div>
                <span className="text-slate-400">Date: </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {new Date(selectedPurchase.purchaseDate || selectedPurchase.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400">Branch: </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedPurchase.branch?.name || "Main Branch"}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Supplier: </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedPurchase.supplier?.name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400">Contact: </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedPurchase.contactPerson?.name ||
                    selectedPurchase.contactPersonName ||
                    selectedPurchase.supplier?.contactPerson ||
                    "—"}
                </span>
              </div>
            </div>

            {/* Itemized Table */}
            {selectedPurchase.items && selectedPurchase.items.length > 0 ? (
              <div className="table-responsive-container border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full min-w-[450px] text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-black text-slate-500">
                    <tr>
                      <th className="py-3 px-3.5">Product</th>
                      <th className="py-3 px-3.5 text-center">Batch</th>
                      <th className="py-3 px-3.5 text-center">Qty</th>
                      <th className="py-3 px-3.5 text-right">Cost</th>
                      <th className="py-3 px-3.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                    {selectedPurchase.items.map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-white">
                          {item.product?.name || "Medicine Item"}
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono text-xs text-slate-500">
                          {item.batchNumber || "—"}
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono font-bold">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-slate-600 dark:text-slate-400">
                          ৳{Number(item.purchasePrice).toFixed(2)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold font-mono text-slate-900 dark:text-white">
                          ৳{Number(item.totalPrice).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-slate-400 border border-dashed rounded-xl">
                No individual item rows recorded for this invoice.
              </div>
            )}

            {/* Financial Summary */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-between text-sm font-bold">
              <div className="space-x-3">
                <span>Total: <span className="font-mono text-slate-900 dark:text-white">৳{Number(selectedPurchase.totalAmount).toFixed(2)}</span></span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-emerald-600 font-mono">Paid: ৳{Number(selectedPurchase.paidAmount).toFixed(2)}</span>
              </div>
              <div className="font-mono font-bold">
                {Number(selectedPurchase.dueAmount) > 0 ? (
                  <span className="text-rose-600">Due: ৳{Number(selectedPurchase.dueAmount).toFixed(2)}</span>
                ) : (
                  <span className="text-emerald-600">Fully Paid</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
