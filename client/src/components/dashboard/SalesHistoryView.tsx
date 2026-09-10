"use client";

import React, { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { OwnerModule } from "./DashboardSidebar";
import {
  History,
  Search,
  Calendar,
  Filter,
  RefreshCw,
  Loader2,
  Receipt,
  Printer,
  Eye,
  Store,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Clock,
  UserCheck,
} from "lucide-react";
import { useBranchContext } from "@/context/BranchContext";

interface SalesHistoryViewProps {
  onNavigate?: (module: OwnerModule) => void;
  selectedBranchId?: string;
}

interface SaleRecord {
  id: string;
  receiptNo: string;
  createdAt: string;
  customerName?: string | null;
  customerPhone?: string | null;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  discount: number;
  tax: number;
  paymentMethod: string;
  bankName?: string | null;
  transactionRef?: string | null;
  status: string;
  branch?: { id: string; name: string; location?: string | null } | null;
  user?: { id: string; name: string; username: string } | null;
  items?: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    subTotal: number;
    unitType?: string;
    batchNumber?: string;
    product?: { id: string; name: string; sku: string; size?: string; unit?: string } | null;
  }>;
}

export function SalesHistoryView({ onNavigate, selectedBranchId: propBranchId }: SalesHistoryViewProps = {}) {
  const { user: authUser } = useAuth();
  const { selectedBranchId: contextBranchId, currentBranch, isAllBranches } = useBranchContext();
  const effectiveBranchId = propBranchId !== undefined ? propBranchId : contextBranchId;

  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [periodPreset, setPeriodPreset] = useState<"today" | "yesterday" | "last7Days" | "thisMonth" | "all" | "custom">("today");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Sale for View/Print Modal
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadSales = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      if (search.trim()) params.append("search", search.trim());
      if (paymentMethod) params.append("paymentMethod", paymentMethod);
      if (effectiveBranchId && effectiveBranchId !== "all") {
        params.append("branchId", effectiveBranchId);
      }

      if (periodPreset !== "all") {
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
      }

      const res = await fetchApi<any>(`/sales?${params.toString()}`);

      if (res.success) {
        setSales(res.data || []);
        const pagination = (res as any).pagination || res.meta;
        if (pagination) {
          setTotalPages(pagination.totalPages || 1);
          setTotalCount(pagination.total || 0);
        }
      }
    } catch (err) {
      console.error("Failed to load sales history", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [page, periodPreset, startDate, endDate, paymentMethod, effectiveBranchId]);

  const handlePeriodPreset = (preset: "today" | "yesterday" | "last7Days" | "thisMonth" | "all" | "custom") => {
    setPeriodPreset(preset);
    setPage(1);
    const now = new Date();

    if (preset === "today") {
      const todayStr = now.toISOString().split("T")[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === "last7Days") {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      setStartDate(past.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "thisMonth") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      setStartDate(first);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadSales();
  };

  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6 2xl:space-y-8 w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs xl:text-sm text-slate-400 mb-1">
            <span>Sales & POS</span>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300 font-bold">Sales History</span>
          </div>
          <h1 className="text-2xl xl:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <History className="h-7 w-7 xl:h-8 xl:w-8 text-emerald-600 dark:text-emerald-400" />
            Sales History & Receipts
          </h1>
          <p className="text-xs sm:text-sm xl:text-base text-slate-500 dark:text-slate-400 mt-1">
            Complete transaction ledger of counter sales, payments, customer invoices, and thermal receipt reprints.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate("pos")}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs xl:text-sm font-black shadow-md shadow-emerald-600/20 transition flex items-center gap-2"
            >
              <span>+ New POS Sale</span>
            </button>
          )}

          <button
            onClick={() => loadSales(true)}
            disabled={refreshing}
            className="px-3.5 py-2 xl:px-4 xl:py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs xl:text-sm font-bold transition flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 xl:h-4 xl:w-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 sm:p-5 2xl:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Date Presets Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider mr-1">Timeframe:</span>
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "last7Days", label: "Last 7 Days" },
              { id: "thisMonth", label: "This Month" },
              { id: "all", label: "All Time" },
              { id: "custom", label: "Custom Range" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePeriodPreset(p.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  periodPreset === p.id
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date range pickers */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriodPreset("custom");
              }}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodPreset("custom");
              }}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
            />
          </div>
        </div>

        {/* Search & Channel Filters Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by receipt # (e.g. REC-12345), customer name, or phone..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs xl:text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </form>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Payment Method Filter */}
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="">All Payment Methods</option>
              <option value="CASH">Cash</option>
              <option value="BKASH">bKash</option>
              <option value="NAGAD">Nagad</option>
              <option value="BANK">Bank / Card</option>
            </select>

            {/* Active Branch Scope Badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
              <Store className="h-3.5 w-3.5 text-emerald-500" />
              <span>Scope:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {isAllBranches ? "All Branches" : (currentBranch?.name || "Selected Branch")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <span className="text-xs xl:text-sm font-bold">Querying sales history records...</span>
          </div>
        ) : sales.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Receipt className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No sales transactions found.</p>
            <p className="text-xs text-slate-400">Try adjusting your date range or search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs xl:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 text-[10px] xl:text-xs font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 xl:px-6">Receipt #</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Items</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4 text-right">Total Amount</th>
                  <th className="py-3.5 px-4 text-right">Paid</th>
                  <th className="py-3.5 px-4 text-right">Due</th>
                  <th className="py-3.5 px-4 xl:px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sales.map((sale) => {
                  const isCash = sale.paymentMethod === "CASH";
                  const isBkash = sale.paymentMethod === "BKASH";
                  const isNagad = sale.paymentMethod === "NAGAD";
                  const isBank = sale.paymentMethod === "BANK" || sale.paymentMethod === "CARD";
                  const isDue = Number(sale.dueAmount || 0) > 0;

                  return (
                    <tr
                      key={sale.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition font-medium"
                    >
                      {/* Receipt No */}
                      <td className="py-3.5 px-4 xl:px-6">
                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {sale.receiptNo}
                        </div>
                        {sale.branch?.name && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Store className="h-3 w-3" />
                            <span>{sale.branch.name}</span>
                          </div>
                        )}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-slate-900 dark:text-white font-bold">
                          {new Date(sale.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          <span>
                            {new Date(sale.createdAt).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-900 dark:text-white font-bold truncate max-w-[140px]">
                          {sale.customerName || "Walk-in Customer"}
                        </div>
                        {sale.customerPhone && (
                          <div className="text-[10px] text-slate-400 font-mono">{sale.customerPhone}</div>
                        )}
                      </td>

                      {/* Items Count */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                          {sale.items?.length || 1} {(sale.items?.length || 1) === 1 ? "item" : "items"}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${
                            isCash
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : isBkash
                              ? "bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300"
                              : isNagad
                              ? "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                          }`}
                        >
                          {isCash ? (
                            <Banknote className="h-3 w-3" />
                          ) : isBkash || isNagad ? (
                            <Smartphone className="h-3 w-3" />
                          ) : (
                            <CreditCard className="h-3 w-3" />
                          )}
                          <span>{sale.paymentMethod}</span>
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                        ৳{Number(sale.totalAmount || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ৳{Number(sale.paidAmount || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Due Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        {isDue ? (
                          <span className="text-rose-600 dark:text-rose-400">
                            ৳{Number(sale.dueAmount).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-400">৳0.00</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 xl:px-6 text-center">
                        <button
                          onClick={() => {
                            setSelectedSale(sale);
                            setModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1 mx-auto"
                        >
                          <Eye className="h-3.5 w-3.5 text-emerald-600" />
                          <span>View Invoice</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && sales.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing page <strong className="text-slate-800 dark:text-slate-200">{page}</strong> of{" "}
              <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong> ({totalCount} total sales)
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition disabled:opacity-40 flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Details & Thermal Print Modal */}
      {modalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-emerald-600" />
                  Sale Receipt #{selectedSale.receiptNo}
                </h3>
                <p className="text-xs text-slate-400">
                  {new Date(selectedSale.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setSelectedSale(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content / Thermal Paper View */}
            <div className="p-6 overflow-y-auto space-y-4 font-mono text-xs">
              <div className="text-center pb-3 border-b border-dashed border-slate-300 dark:border-slate-700 space-y-1">
                {authUser?.tenant?.logoUrl && (
                  <div className="flex justify-center mb-1">
                    <img
                      src={authUser.tenant.logoUrl}
                      alt="Pharmacy logo"
                      className="h-10 object-contain"
                    />
                  </div>
                )}
                <div className="font-black text-sm text-slate-900 dark:text-white uppercase">
                  {authUser?.tenant?.name || selectedSale.branch?.name || "Pharmacy Store"}
                </div>
                {selectedSale.branch?.name && (
                  <div className="text-[10px] font-semibold text-slate-500">
                    Branch: {selectedSale.branch.name}
                  </div>
                )}
                {selectedSale.branch?.location && (
                  <div className="text-[10px] text-slate-500">{selectedSale.branch.location}</div>
                )}
                <div className="text-[10px] text-slate-400">Cashier: {selectedSale.user?.name || "Staff"}</div>
              </div>

              {/* Customer info */}
              <div className="flex justify-between text-slate-600 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span>Customer:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedSale.customerName || "Walk-in"} {selectedSale.customerPhone ? `(${selectedSale.customerPhone})` : ""}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex justify-between font-bold text-slate-400 text-[10px] uppercase">
                  <span>Item</span>
                  <span>Qty x Price = Total</span>
                </div>
                {selectedSale.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{item.product?.name || "Product"}</div>
                      {item.batchNumber && <div className="text-[10px] text-slate-400">Batch: {item.batchNumber}</div>}
                    </div>
                    <div className="text-right">
                      <div>{item.quantity} x ৳{Number(item.unitPrice).toFixed(2)}</div>
                      <div className="font-bold">৳{Number(item.subTotal).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Calculation Breakdown */}
              <div className="pt-3 border-t border-dashed border-slate-300 dark:border-slate-700 space-y-1">
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-৳{Number(selectedSale.discount).toFixed(2)}</span>
                  </div>
                )}
                {selectedSale.tax > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>VAT / Tax:</span>
                    <span>+৳{Number(selectedSale.tax).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Grand Total:</span>
                  <span>৳{Number(selectedSale.totalAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Paid ({selectedSale.paymentMethod}):</span>
                  <span>৳{Number(selectedSale.paidAmount).toFixed(2)}</span>
                </div>
                {selectedSale.dueAmount > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Due Balance:</span>
                    <span>৳{Number(selectedSale.dueAmount).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Close
              </button>
              <button
                onClick={printReceipt}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
