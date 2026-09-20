"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { Supplier } from "@/types";
import { showAlert } from "@/lib/swal";
import {
  CreditCard,
  Search,
  CheckCircle2,
  Loader2,
  Building,
  X,
  RefreshCw,
  TrendingDown,
  Calendar,
  Phone,
  History,
  AlertCircle,
  Store,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Receipt,
  ArrowLeft,
  ArrowRight,
  FileText,
} from "lucide-react";
import { useBranchContext } from "@/context/BranchContext";

type DateFilterPreset = "ALL" | "today" | "yesterday" | "this_month" | "this_year" | "custom";

interface PaymentsDueViewProps {
  onNavigate?: (module: any) => void;
  selectedBranchId?: string;
}

function getDateRange(preset: DateFilterPreset, customStart?: string, customEnd?: string) {
  if (preset === "ALL") return { start: "", end: "" };
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (preset === "today") {
    const todayStr = formatDate(now);
    return { start: todayStr, end: todayStr };
  }
  if (preset === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yStr = formatDate(y);
    return { start: yStr, end: yStr };
  }
  if (preset === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: formatDate(start), end: formatDate(end) };
  }
  if (preset === "this_year") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return { start: formatDate(start), end: formatDate(end) };
  }
  if (preset === "custom") {
    return { start: customStart || "", end: customEnd || "" };
  }
  return { start: "", end: "" };
}

export function PaymentsDueView({ onNavigate: _onNavigate, selectedBranchId: propBranchId }: PaymentsDueViewProps = {}) {
  const {
    branches,
    selectedBranchId: contextBranchId,
    currentBranch,
    isAllBranches,
  } = useBranchContext();

  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;

  // Supplier List State
  const [dueSuppliers, setDueSuppliers] = useState<Supplier[]>([]);
  const [dueSearch, setDueSearch] = useState("");
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [duePage, setDuePage] = useState(1);
  const [duePageSize, setDuePageSize] = useState(10);

  // Supplier Details Drilldown State
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierPurchases, setSupplierPurchases] = useState<any[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [purchaseDateFilter, setPurchaseDateFilter] = useState<DateFilterPreset>("ALL");
  const [purchaseCustomStart, setPurchaseCustomStart] = useState("");
  const [purchaseCustomEnd, setPurchaseCustomEnd] = useState("");
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchasePageSize, setPurchasePageSize] = useState(10);
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);

  // Payment Modal State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payTargetSupplier, setPayTargetSupplier] = useState<Supplier | null>(null);
  const [payTargetPurchase, setPayTargetPurchase] = useState<any | null>(null); // null = Settle All Dues
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNotes, setPayNotes] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Financial Accounts
  const [financialAccounts, setFinancialAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  // Load Financial Accounts
  useEffect(() => {
    async function loadAccounts() {
      try {
        const url =
          effectiveBranchId && effectiveBranchId !== "all"
            ? `/accounting/accounts?branchId=${effectiveBranchId}`
            : "/accounting/accounts";
        const res = await fetchApi<any[]>(url);
        if (res.success && res.data) {
          setFinancialAccounts(res.data);
          if (res.data.length > 0) {
            setSelectedAccountId(res.data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load financial accounts", err);
      }
    }
    loadAccounts();
  }, [effectiveBranchId]);

  // 1. Fetch Due Suppliers
  const loadDueSuppliers = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoadingSuppliers(true);

      const params = new URLSearchParams();
      if (effectiveBranchId && effectiveBranchId !== "all") {
        params.append("branchId", effectiveBranchId);
      }

      const res = await fetchApi(`/suppliers?${params.toString()}`);
      if (res.success && res.data) {
        const list = (res.data as Supplier[]).filter((s) => Number(s.totalDue || 0) > 0);
        setDueSuppliers(list);
      } else {
        setDueSuppliers([]);
      }
    } catch (err) {
      console.error("Failed to load due suppliers", err);
      setDueSuppliers([]);
    } finally {
      setLoadingSuppliers(false);
      setRefreshing(false);
    }
  };

  // 2. Fetch Invoices for Selected Supplier
  const loadSupplierInvoices = async (
    supplierId: string,
    preset = purchaseDateFilter,
    start = purchaseCustomStart,
    end = purchaseCustomEnd
  ) => {
    try {
      setLoadingPurchases(true);
      const range = getDateRange(preset, start, end);
      const params = new URLSearchParams();
      if (range.start) params.append("startDate", range.start);
      if (range.end) params.append("endDate", range.end);
      if (effectiveBranchId && effectiveBranchId !== "all") {
        params.append("branchId", effectiveBranchId);
      }

      const res = await fetchApi<Supplier>(`/suppliers/${supplierId}?${params.toString()}`);
      if (res.success && res.data) {
        const purchases = res.data.purchases || [];
        // Show pending due purchases (dueAmount > 0)
        const pendingPurchases = purchases.filter((p: any) => Number(p.dueAmount || 0) > 0);
        setSupplierPurchases(pendingPurchases);
        setSelectedSupplier((prev) => (prev ? { ...prev, ...res.data } : (res.data ?? null)));
      } else {
        setSupplierPurchases([]);
      }
    } catch (err) {
      console.error("Failed to load supplier invoices", err);
      setSupplierPurchases([]);
    } finally {
      setLoadingPurchases(false);
    }
  };

  // Initial Load
  useEffect(() => {
    loadDueSuppliers();
  }, [effectiveBranchId]);

  // When supplier drilldown is selected
  const handleSelectSupplierForDetails = (s: Supplier) => {
    setSelectedSupplier(s);
    setPurchaseDateFilter("ALL");
    setPurchasePage(1);
    loadSupplierInvoices(s.id, "ALL");
  };

  // Filter Due Suppliers by Search
  const filteredDueSuppliers = useMemo(() => {
    if (!dueSearch.trim()) return dueSuppliers;
    const q = dueSearch.toLowerCase();
    return dueSuppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q) ||
        s.company?.toLowerCase().includes(q)
    );
  }, [dueSuppliers, dueSearch]);

  // Pagination for Due Suppliers
  const totalDueCount = filteredDueSuppliers.length;
  const totalDuePages = Math.max(1, Math.ceil(totalDueCount / duePageSize));
  const dueStartItem = totalDueCount === 0 ? 0 : (duePage - 1) * duePageSize + 1;
  const dueEndItem = Math.min(duePage * duePageSize, totalDueCount);
  const paginatedDueSuppliers = useMemo(() => {
    return filteredDueSuppliers.slice((duePage - 1) * duePageSize, duePage * duePageSize);
  }, [filteredDueSuppliers, duePage, duePageSize]);

  // Filter Supplier Invoices (for drilldown)
  const totalPurchaseCount = supplierPurchases.length;
  const totalPurchasePages = Math.max(1, Math.ceil(totalPurchaseCount / purchasePageSize));
  const purchaseStartItem = totalPurchaseCount === 0 ? 0 : (purchasePage - 1) * purchasePageSize + 1;
  const purchaseEndItem = Math.min(purchasePage * purchasePageSize, totalPurchaseCount);
  const paginatedPurchases = useMemo(() => {
    return supplierPurchases.slice((purchasePage - 1) * purchasePageSize, purchasePage * purchasePageSize);
  }, [supplierPurchases, purchasePage, purchasePageSize]);

  // Open Payment Modal
  const handleOpenPayModal = (supplier: Supplier, purchase?: any) => {
    setPayTargetSupplier(supplier);
    setPayTargetPurchase(purchase || null);
    setPayError(null);

    if (purchase) {
      setPayAmount(Number(purchase.dueAmount || 0));
      setPayNotes(`Payment for Invoice #${purchase.invoiceNo || purchase.id.slice(-6)}`);
    } else {
      setPayAmount(Number(supplier.totalDue || 0));
      setPayNotes(`All dues settlement for ${supplier.name}`);
    }

    setPayModalOpen(true);
  };

  // Submit Payment
  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTargetSupplier || payAmount <= 0) return;
    if (!selectedAccountId) {
      setPayError("Please select a financial account (Cash / Bank).");
      return;
    }

    try {
      setPaying(true);
      setPayError(null);

      const payload: any = {
        amount: Number(payAmount),
        branchId:
          effectiveBranchId && effectiveBranchId !== "all"
            ? effectiveBranchId
            : financialAccounts.find((a) => a.id === selectedAccountId)?.branchId || branches[0]?.id,
        financialAccountId: selectedAccountId,
        notes: payNotes || null,
      };

      if (payTargetPurchase) {
        payload.purchaseId = payTargetPurchase.id;
      }

      const res = await fetchApi<any>(`/suppliers/${payTargetSupplier.id}/payments`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.success) throw new Error(res.message || "Failed to record payment");

      const successMsg = payTargetPurchase
        ? `Payment of ৳${payAmount.toFixed(2)} completed for Invoice #${payTargetPurchase.invoiceNo || payTargetPurchase.id.slice(-6)}!`
        : `Payment of ৳${payAmount.toFixed(2)} completed for ${payTargetSupplier.name}!`;

      showAlert.success("Payment Recorded Successfully!", successMsg);
      setSuccess(successMsg);
      setPayModalOpen(false);

      // Refresh Data
      loadDueSuppliers();
      if (selectedSupplier) {
        loadSupplierInvoices(selectedSupplier.id);
      }
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      const msg = err.message || "Failed to record payment";
      setPayError(msg);
      showAlert.error("Payment Failed", msg);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header - Only displayed in main suppliers list, hidden in drilldown */}
      {!selectedSupplier && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span>Supplier Management</span>
              <span>/</span>
              <span className="text-brand-primary font-bold">Payments & Due</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <CreditCard className="h-7 w-7 text-brand-primary" />
              Supplier Payments & Due
            </h2>
          </div>

          <button
            onClick={() => {
              loadDueSuppliers(true);
            }}
            disabled={refreshing}
            className="h-11 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-brand-primary" : ""}`} />
            Refresh
          </button>
        </div>
      )}

      {/* Success Notification */}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm flex items-center justify-between font-bold animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: PENDING DUE SUPPLIERS (CLEAN TABLE WITH SEARCH ONLY)           */}
      {/* ========================================================================= */}
      {!selectedSupplier && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-5 sm:p-6 space-y-4">
          {/* Search Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
              Outstanding Supplier Balances
            </span>

            {/* Quick Search */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search supplier by name, phone..."
                value={dueSearch}
                onChange={(e) => {
                  setDueSearch(e.target.value);
                  setDuePage(1);
                }}
                className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-semibold outline-none dark:text-white focus:border-brand-primary"
              />
            </div>
          </div>

          {/* Supplier Table: Supplier | Total Due | Details Button */}
          {loadingSuppliers ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
              <p className="text-xs sm:text-sm font-bold">Loading pending due suppliers...</p>
            </div>
          ) : filteredDueSuppliers.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-3" />
              <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                No Pending Dues Found
              </p>
              <p className="text-xs text-slate-400 mt-1">All supplier debts are settled.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="table-responsive-container">
                <table className="w-full min-w-[600px] text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase font-bold text-xs tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-4 px-4">Supplier</th>
                      <th className="py-4 px-4 text-right">Total Due</th>
                      <th className="py-4 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                    {paginatedDueSuppliers.map((s) => {
                      const due = Number(s.totalDue || 0);

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                          {/* Supplier Column */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-black text-sm shrink-0">
                                {s.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">
                                  {s.name}
                                </div>
                                {s.phone && (
                                  <div className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                    <Phone className="h-3 w-3 text-emerald-500" />
                                    <span>{s.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Total Due Column */}
                          <td className="py-4 px-4 text-right font-mono">
                            <span className="text-rose-600 dark:text-rose-400 font-black text-sm sm:text-base bg-rose-50 dark:bg-rose-950/40 px-3 py-1 rounded-xl border border-rose-200 dark:border-rose-900/50 inline-block">
                              ৳{due.toFixed(2)}
                            </span>
                          </td>

                          {/* Details Action Button */}
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => handleSelectSupplierForDetails(s)}
                              className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <span>Details</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalDueCount > 0 && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
                  <div className="text-slate-600 dark:text-slate-400 font-medium">
                    Showing <strong className="text-slate-900 dark:text-white font-bold">{dueStartItem}</strong> to{" "}
                    <strong className="text-slate-900 dark:text-white font-bold">{dueEndItem}</strong> of{" "}
                    <strong className="text-slate-900 dark:text-white font-bold">{totalDueCount}</strong> suppliers
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <span>Rows per page:</span>
                      <select
                        value={duePageSize}
                        onChange={(e) => {
                          setDuePageSize(Number(e.target.value));
                          setDuePage(1);
                        }}
                        className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-brand-primary cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDuePage(1)}
                        disabled={duePage <= 1}
                        className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
                      >
                        <ChevronsLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDuePage((p) => Math.max(1, p - 1))}
                        disabled={duePage <= 1}
                        className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Prev</span>
                      </button>

                      <div className="px-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span className="text-slate-900 dark:text-white font-black">{duePage}</span> / {totalDuePages}
                      </div>

                      <button
                        type="button"
                        onClick={() => setDuePage((p) => Math.min(totalDuePages, p + 1))}
                        disabled={duePage >= totalDuePages}
                        className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDuePage(totalDuePages)}
                        disabled={duePage >= totalDuePages}
                        className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
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
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: SUPPLIER DETAILS DRILLDOWN (INVOICES, DATE FILTER & PAYMENTS)  */}
      {/* ========================================================================= */}
      {selectedSupplier && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-5 sm:p-6 space-y-5">
          {/* Top Drilldown Header with Back Button and Pay All Dues */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <button
                onClick={() => setSelectedSupplier(null)}
                className="text-xs font-bold text-slate-500 hover:text-brand-primary transition flex items-center gap-1.5 cursor-pointer mb-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Pending Due Suppliers</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-black text-lg shrink-0">
                  {selectedSupplier.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      {selectedSupplier.name}
                    </h3>
                    <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 font-mono font-bold text-xs border border-rose-200 dark:border-rose-900/50">
                      Total Due: ৳{Number(selectedSupplier.totalDue || 0).toFixed(2)}
                    </span>
                  </div>
                  {selectedSupplier.phone && (
                    <div className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3 text-emerald-500" />
                      <span>{selectedSupplier.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pay All Dues Button */}
            {Number(selectedSupplier.totalDue || 0) > 0 && (
              <button
                onClick={() => handleOpenPayModal(selectedSupplier)}
                className="h-11 px-5 bg-brand-primary hover:opacity-90 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-brand-primary/20 transition flex items-center gap-2 cursor-pointer self-start sm:self-auto active:scale-95"
              >
                <CreditCard className="h-4 w-4" />
                <span>Pay All Dues (৳{Number(selectedSupplier.totalDue || 0).toFixed(2)})</span>
              </button>
            )}
          </div>

          {/* Date Range Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-400 mr-1 flex items-center gap-1.5">
                <Calendar className="h-4 w-4" /> Filter by Date:
              </span>
              {(
                [
                  { id: "ALL", label: "All Time" },
                  { id: "today", label: "Today" },
                  { id: "yesterday", label: "Yesterday" },
                  { id: "this_month", label: "This Month" },
                  { id: "this_year", label: "This Year" },
                  { id: "custom", label: "Custom Date" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPurchaseDateFilter(p.id);
                    setPurchasePage(1);
                    if (p.id !== "custom") {
                      loadSupplierInvoices(selectedSupplier.id, p.id);
                    }
                  }}
                  className={`h-9 px-3.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    purchaseDateFilter === p.id
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-500 font-medium">
              {supplierPurchases.length} pending invoice(s)
            </span>
          </div>

          {/* Custom Date Inputs */}
          {purchaseDateFilter === "custom" && (
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-bold">From:</span>
                <input
                  type="date"
                  value={purchaseCustomStart}
                  onChange={(e) => setPurchaseCustomStart(e.target.value)}
                  className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-bold">To:</span>
                <input
                  type="date"
                  value={purchaseCustomEnd}
                  onChange={(e) => setPurchaseCustomEnd(e.target.value)}
                  className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold dark:text-white"
                />
              </div>
              <button
                onClick={() => loadSupplierInvoices(selectedSupplier.id, "custom", purchaseCustomStart, purchaseCustomEnd)}
                disabled={!purchaseCustomStart || !purchaseCustomEnd}
                className="h-10 px-4 bg-brand-primary text-white rounded-xl text-xs font-bold disabled:opacity-50 transition cursor-pointer"
              >
                Apply
              </button>
            </div>
          )}

          {/* Pending Invoices Table */}
          {loadingPurchases ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
              <p className="text-xs sm:text-sm font-bold">Loading purchase records...</p>
            </div>
          ) : supplierPurchases.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Receipt className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                No Pending Invoices for This Period
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try selecting &quot;All Time&quot; or another date range.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="table-responsive-container">
                <table className="w-full min-w-[700px] text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase font-bold text-xs tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-4 px-4">Purchase Date</th>
                      <th className="py-4 px-4 text-right">Total Bill</th>
                      <th className="py-4 px-4 text-right">Paid Amount</th>
                      <th className="py-4 px-4 text-right">Pending Due</th>
                      <th className="py-4 px-4 text-center">Purchased Items</th>
                      <th className="py-4 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                    {paginatedPurchases.map((p: any) => {
                      const pTotal = Number(p.totalAmount || 0);
                      const pPaid = Number(p.paidAmount || 0);
                      const pDue = Number(p.dueAmount || 0);
                      const itemCount = p.items?.length || 0;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                          <td className="py-4 px-4 font-mono font-bold text-slate-900 dark:text-white">
                            {new Date(p.purchaseDate || p.createdAt).toLocaleDateString()}
                          </td>

                          <td className="py-4 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                            ৳{pTotal.toFixed(2)}
                          </td>

                          <td className="py-4 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                            ৳{pPaid.toFixed(2)}
                          </td>

                          <td className="py-4 px-4 text-right font-mono">
                            <span className="text-rose-600 dark:text-rose-400 font-black text-sm bg-rose-50 dark:bg-rose-950/40 px-3 py-1 rounded-xl border border-rose-200 dark:border-rose-900/50 inline-block">
                              ৳{pDue.toFixed(2)}
                            </span>
                          </td>

                          {/* Purchased Items / Products Invoice Column */}
                          <td className="py-4 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setViewingInvoice(p)}
                              className="h-8 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <FileText className="h-3.5 w-3.5 text-brand-primary" />
                              <span>View Products ({itemCount})</span>
                            </button>
                          </td>

                          {/* Individual Pay Button */}
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => handleOpenPayModal(selectedSupplier, p)}
                              className="h-9 px-3.5 bg-brand-primary hover:opacity-90 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm shadow-brand-primary/20 cursor-pointer active:scale-95"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              <span>Pay Invoice</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Invoices Pagination */}
              {totalPurchaseCount > 0 && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
                  <div className="text-slate-600 dark:text-slate-400 font-medium">
                    Showing <strong className="text-slate-900 dark:text-white font-bold">{purchaseStartItem}</strong> to{" "}
                    <strong className="text-slate-900 dark:text-white font-bold">{purchaseEndItem}</strong> of{" "}
                    <strong className="text-slate-900 dark:text-white font-bold">{totalPurchaseCount}</strong> invoices
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <span>Rows per page:</span>
                      <select
                        value={purchasePageSize}
                        onChange={(e) => {
                          setPurchasePageSize(Number(e.target.value));
                          setPurchasePage(1);
                        }}
                        className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-brand-primary cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPurchasePage(1)}
                        disabled={purchasePage <= 1}
                        className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
                      >
                        <ChevronsLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPurchasePage((p) => Math.max(1, p - 1))}
                        disabled={purchasePage <= 1}
                        className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Prev</span>
                      </button>

                      <div className="px-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span className="text-slate-900 dark:text-white font-black">{purchasePage}</span> / {totalPurchasePages}
                      </div>

                      <button
                        type="button"
                        onClick={() => setPurchasePage((p) => Math.min(totalPurchasePages, p + 1))}
                        disabled={purchasePage >= totalPurchasePages}
                        className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPurchasePage(totalPurchasePages)}
                        disabled={purchasePage >= totalPurchasePages}
                        className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
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
      )}

      {/* ========================================================================= */}
      {/* INVOICE DETAILS / PURCHASED PRODUCTS MODAL                                */}
      {/* ========================================================================= */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 my-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-brand-primary/10 text-brand-primary">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Purchased Products &amp; Invoice Slip
                  </h3>
                  <p className="text-xs text-slate-400">
                    Itemized medicine list for this purchase bill
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingInvoice(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Bill Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-xs">
              <div>
                <span className="text-slate-400 font-bold block">Supplier</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {selectedSupplier?.name || "Supplier"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Purchase Date</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                  {new Date(viewingInvoice.purchaseDate || viewingInvoice.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Invoice No</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                  {viewingInvoice.invoiceNo || viewingInvoice.id.slice(-6)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Payment Status</span>
                <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-rose-50 text-rose-700 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50">
                  {Number(viewingInvoice.dueAmount || 0) === 0 ? "Fully Settled" : `Due: ৳${Number(viewingInvoice.dueAmount || 0).toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Products Table */}
            <div>
              <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">
                Purchased Medicines ({viewingInvoice.items?.length || 0} item{viewingInvoice.items?.length === 1 ? "" : "s"})
              </h4>
              {viewingInvoice.items && viewingInvoice.items.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[40vh] overflow-y-auto">
                  <div className="table-responsive-container">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 sticky top-0">
                        <tr>
                          <th className="py-3 px-3">#</th>
                          <th className="py-3 px-3">Product Name</th>
                          <th className="py-3 px-3">Batch</th>
                          <th className="py-3 px-3">Expiry</th>
                          <th className="py-3 px-3 text-right">Quantity</th>
                          <th className="py-3 px-3 text-right">Unit Price</th>
                          <th className="py-3 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                        {viewingInvoice.items.map((item: any, idx: number) => {
                          const unitPrice = Number(item.unitPurchasePrice || 0);
                          const itemTotal = Number(item.totalAmount || 0);
                          return (
                            <tr key={item.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                              <td className="py-3 px-3 font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                                {item.product?.name || "Product"}
                                {item.product?.sku && (
                                  <span className="text-[10px] text-slate-400 block font-mono">
                                    SKU: {item.product.sku}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                                {item.batchNumber || "—"}
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                                {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "—"}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold">
                                {item.quantity} {item.product?.unit || ""}
                              </td>
                              <td className="py-3 px-3 text-right font-mono">
                                ৳{unitPrice.toFixed(2)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                ৳{itemTotal.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Receipt className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                  <p className="text-xs font-semibold">No item details recorded for this purchase.</p>
                </div>
              )}
            </div>

            {/* Financial Totals */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-mono">
              <div>
                <span className="text-slate-400 block font-sans text-xs">Total Bill:</span>
                <span className="font-black text-slate-900 dark:text-white text-base">
                  ৳{Number(viewingInvoice.totalAmount || 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans text-xs">Paid Amount:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                  ৳{Number(viewingInvoice.paidAmount || 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans text-xs">Pending Due:</span>
                <span className="font-black text-rose-600 dark:text-rose-400 text-base bg-rose-50 dark:bg-rose-950/40 px-3 py-1 rounded-xl border border-rose-200 dark:border-rose-900/50 inline-block">
                  ৳{Number(viewingInvoice.dueAmount || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setViewingInvoice(null)}
                className="h-10 px-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
              {Number(viewingInvoice.dueAmount || 0) > 0 && selectedSupplier && (
                <button
                  type="button"
                  onClick={() => {
                    const inv = viewingInvoice;
                    setViewingInvoice(null);
                    handleOpenPayModal(selectedSupplier, inv);
                  }}
                  className="h-10 px-5 bg-brand-primary hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-primary/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Pay This Invoice (৳{Number(viewingInvoice.dueAmount || 0).toFixed(2)})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1-STEP PAYMENT MODAL (SUPPORTS INDIVIDUAL INVOICE OR ALL DUES)            */}
      {/* ========================================================================= */}
      {payModalOpen && payTargetSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {payTargetPurchase
                      ? `Pay Invoice #${payTargetPurchase.invoiceNo || payTargetPurchase.id.slice(-6)}`
                      : "Settle All Dues"}
                  </h3>
                  <div className="text-xs text-slate-500 font-bold">{payTargetSupplier.name}</div>
                </div>
              </div>
              <button
                onClick={() => setPayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {payError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 font-bold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{payError}</span>
              </div>
            )}

            <form onSubmit={handlePaySubmit} className="space-y-4">
              {/* Due Amount Box */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {payTargetPurchase ? "Invoice Due Amount:" : "Total Outstanding Due:"}
                </span>
                <span className="font-black font-mono text-xl text-rose-600">
                  ৳
                  {payTargetPurchase
                    ? Number(payTargetPurchase.dueAmount || 0).toFixed(2)
                    : Number(payTargetSupplier.totalDue || 0).toFixed(2)}
                </span>
              </div>

              {/* Payment Amount */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                    Payment Amount *
                  </label>
                  <span className="text-xs text-slate-400">
                    Full or partial amount
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold font-mono text-slate-400">
                    ৳
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                    className="w-full h-12 pl-8 pr-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-lg font-black font-mono outline-none dark:text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Paid From Account */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Paid From Account *
                </label>
                <select
                  required
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-bold outline-none dark:text-white cursor-pointer"
                >
                  <option value="">Select Financial Account</option>
                  {financialAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName || acc.name} ({acc.accountType || acc.type}) — Balance: ৳
                      {Number(acc.balance || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>


              {/* Remaining Due Preview */}
              <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-2xl text-xs flex items-center justify-between font-bold">
                <span className="text-slate-500">Remaining due after payment:</span>
                <span className="font-mono text-slate-900 dark:text-white font-black text-sm">
                  ৳
                  {Math.max(
                    0,
                    (payTargetPurchase
                      ? Number(payTargetPurchase.dueAmount || 0)
                      : Number(payTargetSupplier.totalDue || 0)) - payAmount
                  ).toFixed(2)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying || payAmount <= 0}
                  className="h-11 px-6 rounded-xl bg-brand-primary hover:opacity-90 text-white text-xs sm:text-sm font-bold shadow-md shadow-brand-primary/20 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  <span>Confirm Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
