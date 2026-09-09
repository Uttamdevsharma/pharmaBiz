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
} from "lucide-react";

type DateFilterPreset = "today" | "yesterday" | "this_month" | "this_year" | "custom";

interface PurchaseHistoryViewProps {
  onNavigate: (module: any) => void;
}

export function PurchaseHistoryView({ onNavigate }: PurchaseHistoryViewProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>("today");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [dateRange, selectedSupplierId]);

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
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="h-6 w-6 text-brand-primary" />
            Purchase History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            View all supplier invoices and intake records with date and company filters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("sup_payments_due")}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <CreditCard className="h-4 w-4" />
            Payments / Due
          </button>
          <button
            onClick={() => onNavigate("stock_add_stock")}
            className="px-4 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Stock Inward
          </button>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Invoices</span>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {purchases.length}
          </div>
          <span className="text-[11px] text-slate-400">Filtered range count</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Purchase</span>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            ৳{totals.total.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-400">Total bill value</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Paid</span>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            ৳{totals.paid.toFixed(2)}
          </div>
          <span className="text-[11px] text-emerald-600/70">Settled payments</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Due</span>
          <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
            ৳{totals.due.toFixed(2)}
          </div>
          <span className="text-[11px] text-rose-600/70">Outstanding balances</span>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Filter:
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  dateFilter === p.id
                    ? "bg-brand-primary text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Supplier Dropdown */}
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 outline-none font-bold min-w-[200px]"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Picker Inputs */}
        {dateFilter === "custom" && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium dark:text-white"
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
            <p className="text-xs">Loading purchase records...</p>
          </div>
        ) : purchases.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Receipt className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
              No purchases found for selected date filter
            </p>
            <p className="text-xs mt-1">
              Try selecting "This Month" or a broader date range above, or record a new stock intake.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Branch</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4">Contact Person</th>
                  <th className="py-3.5 px-4">Products</th>
                  <th className="py-3.5 px-4">Total</th>
                  <th className="py-3.5 px-4">Paid</th>
                  <th className="py-3.5 px-4">Due</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {purchases.map((p) => {
                  const total = Number(p.totalAmount || 0);
                  const paid = Number(p.paidAmount || 0);
                  const due = Number(p.dueAmount || 0);
                  const itemCount = p.items?.length || 0;
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

                      {/* Products */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono font-bold text-[11px] text-slate-700 dark:text-slate-300">
                          {itemCount} {itemCount === 1 ? "Product" : "Products"}
                        </span>
                        {p.items && p.items.length > 0 && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[150px] mt-0.5">
                            {p.items[0]?.product?.name || "Item"}
                            {p.items.length > 1 && ` +${p.items.length - 1} more`}
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
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedPurchase(p);
                            setDetailModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ml-auto"
                        >
                          <Eye className="h-3 w-3" />
                          View
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

      {/* Purchase Details Breakdown Modal */}
      {detailModalOpen && selectedPurchase && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-primary" />
                  Purchase Invoice Breakdown
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Invoice Ref: {selectedPurchase.invoiceNumber || selectedPurchase.id}
                </p>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
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
                <span className="text-slate-400">SR / Contact: </span>
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
              <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3 text-center">Batch</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Cost</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {selectedPurchase.items.map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                          {item.product?.name || "Medicine Item"}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-[10px] text-slate-400">
                          {item.batchNumber || "—"}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold">
                          {item.quantity}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                          ৳{Number(item.purchasePrice).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold font-mono text-slate-900 dark:text-white">
                          ৳{Number(item.totalPrice).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                No individual item rows recorded for this invoice.
              </div>
            )}

            {/* Financial Summary */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-between text-xs font-bold">
              <div className="space-x-2">
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
