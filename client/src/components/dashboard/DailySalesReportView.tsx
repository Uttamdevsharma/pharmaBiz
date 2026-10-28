"use client";

import React, { useState, useEffect, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useBranchContext } from "@/context/BranchContext";
import { useAuth } from "@/context/AuthContext";
import { OwnerModule } from "./DashboardSidebar";
import { printReportDocument } from "@/lib/reportPrintEngine";
import { InvoiceDetailModal, InvoiceData } from "@/components/common/InvoiceDetailModal";
import {
  TrendingUp,
  Calendar,
  Search,
  Printer,
  Download,
  RefreshCw,
  Eye,
  FileText,
  Store,
  Loader2,
} from "lucide-react";

interface DailySalesReportViewProps {
  onNavigate?: (module: OwnerModule) => void;
  selectedBranchId?: string;
}

interface SaleItemDetail {
  name: string;
  quantity: number;
  unitType?: string;
  unitPrice: number;
  subTotal: number;
  batchNumber?: string;
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  brandName?: string;
}

interface SaleTransaction {
  id: string;
  receiptNo: string;
  customerName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  paymentMethod: string;
  paymentDetail: string;
  subTotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  notes?: string | null;
  createdAt: string;
  cashier?: { name?: string; username?: string } | null;
  branch?: { id: string; name: string } | null;
  itemsCount: number;
  items: SaleItemDetail[];
}

interface DailySalesData {
  branch?: { id: string; name: string } | null;
  tenant?: { name: string; phone?: string; logoUrl?: string | null } | null;
  summary: {
    totalSales: number;
    totalSubTotal: number;
    totalDiscounts: number;
    totalTaxes: number;
    totalPaid: number;
    transactionCount: number;
  };
  transactions: SaleTransaction[];
}

export function DailySalesReportView({ onNavigate, selectedBranchId: propBranchId }: DailySalesReportViewProps) {
  const { user } = useAuth();
  const { selectedBranchId: contextBranchId, currentBranch, branches } = useBranchContext();
  const activeBranchId = propBranchId || contextBranchId || currentBranch?.id || (branches.length > 0 ? branches[0].id : "");

  // Date selection (Defaults to Today for BOTH From and To)
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const [startDate, setStartDate] = useState<string>(getTodayStr);
  const [endDate, setEndDate] = useState<string>(getTodayStr);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState<number>(25);

  // Filters: Category, Subcategory, Brand (Strictly user-created, NO dummy data)
  const [categories, setCategories] = useState<any[]>([]);
  const [brandsList, setBrandsList] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("ALL");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DailySalesData | null>(null);

  // Modal View Invoice (Image 1 replica)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

  // Fetch tenant-scoped categories and brands
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const catRes = await fetchApi<any[]>("/products/categories", { skipCache: true });
        if (catRes.success && Array.isArray(catRes.data)) {
          setCategories(catRes.data);
        }
      } catch (e) {
        // silent fail
      }

      try {
        const brandRes = await fetchApi<any[]>("/products/brands", { skipCache: true });
        if (brandRes.success && Array.isArray(brandRes.data)) {
          setBrandsList(brandRes.data);
        }
      } catch (e) {
        // silent fail
      }
    };
    fetchMetadata();
  }, []);

  // Subcategories of selected category
  const activeSubcategories = useMemo(() => {
    if (selectedCategory === "ALL") return [];
    const found = categories.find((c) => c.id === selectedCategory || c.name === selectedCategory);
    return found?.subcategories || [];
  }, [categories, selectedCategory]);

  const loadData = async (isManual = false) => {
    if (!activeBranchId) return;
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        branchId: activeBranchId,
        startDate,
        endDate,
      });

      if (selectedCategory !== "ALL") params.append("categoryId", selectedCategory);
      if (selectedSubcategory !== "ALL") params.append("subcategoryId", selectedSubcategory);

      const res = await fetchApi<DailySalesData>(`/reports/sales/daily?${params.toString()}`, { skipCache: true });
      if (res.success && res.data) {
        setData(res.data);
      } else {
        throw new Error(res.message || "Failed to load daily sales report");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load sales data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBranchId, startDate, endDate, selectedCategory, selectedSubcategory]);

  // Client-side filtering (Search, Brand, Method)
  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    return data.transactions.filter((tx) => {
      // Search
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesInvoice = tx.receiptNo.toLowerCase().includes(q);
        const matchesCustomer = (tx.customerName || "").toLowerCase().includes(q);
        const matchesPhone = (tx.customerPhone || "").includes(q);
        const matchesItem = (tx.items || []).some((i) => i.name.toLowerCase().includes(q));
        if (!matchesInvoice && !matchesCustomer && !matchesPhone && !matchesItem) return false;
      }

      // Payment Method
      if (paymentMethodFilter !== "ALL") {
        if (tx.paymentMethod !== paymentMethodFilter) return false;
      }

      // Brand filter
      if (selectedBrand !== "ALL") {
        const hasBrand = (tx.items || []).some(
          (i) => i.brandName?.toLowerCase() === selectedBrand.toLowerCase()
        );
        if (!hasBrand) return false;
      }

      // Category filter fallback
      if (selectedCategory !== "ALL") {
        const hasCat = (tx.items || []).some(
          (i) => i.categoryId === selectedCategory || i.categoryName === selectedCategory
        );
        if (!hasCat) return false;
      }

      // Subcategory filter fallback
      if (selectedSubcategory !== "ALL") {
        const hasSubcat = (tx.items || []).some(
          (i) => i.subcategoryId === selectedSubcategory || i.subcategoryName === selectedSubcategory
        );
        if (!hasSubcat) return false;
      }

      return true;
    });
  }, [data?.transactions, searchTerm, paymentMethodFilter, selectedBrand, selectedCategory, selectedSubcategory]);

  // Compute table totals (NO DUE)
  const totals = useMemo(() => {
    let sales = 0;
    for (const t of filteredTransactions) {
      sales += Number(t.totalAmount || 0);
    }
    return {
      count: filteredTransactions.length,
      sales: Number(sales.toFixed(2)),
    };
  }, [filteredTransactions]);

  const formatCurrency = (val: number) => {
    return Number(val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Open modal with formatted data matching Image 1
  const handleOpenInvoiceModal = (tx: SaleTransaction) => {
    setSelectedInvoice({
      id: tx.id,
      receiptNo: tx.receiptNo,
      createdAt: tx.createdAt,
      customerName: tx.customerName,
      customerPhone: tx.customerPhone,
      customerAddress: tx.customerAddress,
      paymentMethod: tx.paymentMethod,
      paymentDetail: tx.paymentDetail,
      subTotal: tx.subTotal || tx.totalAmount,
      discount: tx.discount || 0,
      tax: tx.tax || 0,
      totalAmount: tx.totalAmount,
      paidAmount: tx.paidAmount || tx.totalAmount,
      cashierName: tx.cashier?.name || tx.cashier?.username || "Staff",
      branchName: currentBranch?.name || data?.branch?.name || "Main Branch",
      pharmacyName: data?.tenant?.name || "PharmaBiz Pharmacy",
      logoUrl: data?.tenant?.logoUrl || null,
      items: tx.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitType: i.unitType || "pcs",
        unitPrice: i.unitPrice,
        subTotal: i.subTotal,
        batchNumber: i.batchNumber,
      })),
    });
  };

  // High-Resolution Print / Save as PDF matching formal template (NO DUE)
  const handlePrint = () => {
    if (!filteredTransactions.length) return;
    printReportDocument({
      title: "Daily Sales Report",
      pharmacyName: data?.tenant?.name || "PharmaBiz Pharmacy",
      meta: [
        { label: "Period", value: `${startDate} to ${endDate}` },
        { label: "Branch", value: currentBranch?.name || data?.branch?.name || "All Branches" },
        { label: "Generated", value: new Date().toLocaleString("en-US") },
      ],
      columns: [
        { header: "SL", align: "center", width: "40px" },
        { header: "Invoice #", align: "left", width: "110px" },
        { header: "Date & Time", align: "left", width: "130px" },
        { header: "Customer Name", align: "left" },
        { header: "Payment Method", align: "left", width: "110px" },
        { header: "Total Amount (৳)", align: "right", width: "120px" },
      ],
      rows: filteredTransactions.slice(0, pageSize).map((t, idx) => {
        const customerDisplay =
          !t.customerName || t.customerName.toLowerCase() === "walk-in customer" ? "Guest" : t.customerName;

        return [
          idx + 1,
          t.receiptNo,
          new Date(t.createdAt).toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
          customerDisplay,
          t.paymentDetail || t.paymentMethod,
          t.totalAmount.toFixed(2),
        ];
      }),
      footerRow: [
        { text: `TOTAL (${totals.count} Orders):`, colSpan: 5, align: "right" },
        { text: totals.sales.toFixed(2), align: "right" },
      ],
    });
  };

  // Export to CSV / Excel (NO DUE)
  const handleExportCSV = () => {
    if (!filteredTransactions.length) return;
    const headers = ["SL", "Invoice #", "Date & Time", "Customer Name", "Customer Phone", "Payment Method", "Total (৳)", "Cashier"];
    const rows = filteredTransactions.map((t, idx) => {
      const customerDisplay =
        !t.customerName || t.customerName.toLowerCase() === "walk-in customer" ? "Guest" : t.customerName;

      return [
        idx + 1,
        `"${t.receiptNo}"`,
        `"${new Date(t.createdAt).toLocaleString("en-US")}"`,
        `"${customerDisplay}"`,
        `"${t.customerPhone || ""}"`,
        `"${t.paymentDetail || t.paymentMethod}"`,
        t.totalAmount,
        `"${t.cashier?.name || t.cashier?.username || ""}"`,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Daily_Sales_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const branchDisplay = currentBranch?.name || data?.branch?.name || branches.find((b) => b.id === activeBranchId)?.name || "Main Branch";

  return (
    <div className="w-full min-h-full flex flex-col space-y-4 p-3 sm:p-6 select-none bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      
      {/* 1. TOP HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-none border border-emerald-200 dark:border-emerald-800">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Daily Sales Report
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time individual pharmacy sales, orders, and payment methods for the active branch.
          </p>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-none shadow-2xs">
            <Store className="h-3.5 w-3.5 text-brand-primary shrink-0" />
            <span>Active Branch: <strong className="text-brand-primary">{branchDisplay}</strong></span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-none shadow-2xs">
            <Calendar className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Date: <strong className="font-mono">{startDate}</strong> {startDate !== endDate && `→ ${endDate}`}</span>
          </div>
        </div>
      </div>

      {/* 2. FILTER TOOLBAR (From Date, To Date, Category, Subcategory, Brand, Method - NO QUICK BUTTONS, NO DUE) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 rounded-none shadow-2xs space-y-3 print:hidden">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          
          {/* From Date */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-none outline-none focus:border-brand-primary"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-none outline-none focus:border-brand-primary"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubcategory("ALL");
              }}
              className="h-8.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-none outline-none focus:border-brand-primary min-w-[130px]"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory Filter */}
          {activeSubcategories.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">Subcategory:</span>
              <select
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                className="h-8.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-none outline-none focus:border-brand-primary min-w-[130px]"
              >
                <option value="ALL">All Subcategories</option>
                {activeSubcategories.map((sc: any) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Brand Filter */}
          {brandsList.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">Brand:</span>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="h-8.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-none outline-none focus:border-brand-primary min-w-[130px]"
              >
                <option value="ALL">All Brands</option>
                {brandsList.map((b) => (
                  <option key={b.id || b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Payment Method Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">Method:</span>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="h-8.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-none outline-none focus:border-brand-primary"
            >
              <option value="ALL">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="MOBILE">bKash / Nagad</option>
              <option value="CARD">Card / POS</option>
            </select>
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-none transition border border-slate-300 dark:border-slate-700 ml-auto"
            title="Refresh Sales"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-brand-primary" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 3. TABLE CONTROLS (Show [25 v] entries | [PDF] [Excel] [Print] --- Search) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 print:hidden text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Show</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-8 px-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-none outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
          </select>
          <span className="text-slate-500 mr-2">entries</span>

          {/* Action Buttons */}
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-none transition shadow-2xs"
              title="Save as PDF / Print Document"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-none transition shadow-2xs"
              title="Export Excel (.csv)"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-none transition shadow-2xs"
              title="Print Table"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Search Right Input */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-semibold">Search:</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Invoice #, customer, item..."
            className="h-8 px-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs rounded-none outline-none focus:border-brand-primary min-w-[200px]"
          />
        </div>
      </div>

      {/* 4. DATA TABLE SECTION (NO SUMMARY CARDS, NO DUE COLUMN, NO SALE TYPE COLUMN) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-2xs overflow-hidden">
        {loading && !data ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
            <span className="text-xs font-bold">Loading daily sales transactions...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 space-y-2">
            <p className="font-bold text-sm">{error}</p>
            <button
              onClick={() => loadData(true)}
              className="px-3 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-300 text-xs font-bold rounded-none"
            >
              Retry
            </button>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FileText className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No Sales Orders Found</p>
            <p className="text-xs text-slate-400">No completed orders match the selected date and filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                {/* Green Header */}
                <tr className="bg-emerald-700 text-white font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3 w-12 text-center">SL</th>
                  <th className="py-3 px-3">Invoice #</th>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Payment Method</th>
                  <th className="py-3 px-3 text-right">Total Amount (৳)</th>
                  <th className="py-3 px-3 text-center print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.slice(0, pageSize).map((tx, idx) => {
                  const customerDisplay =
                    !tx.customerName || tx.customerName.toLowerCase() === "walk-in customer" ? "Guest" : tx.customerName;

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-brand-primary">
                        <button
                          type="button"
                          onClick={() => handleOpenInvoiceModal(tx)}
                          className="hover:underline cursor-pointer"
                        >
                          {tx.receiptNo}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit" })},{" "}
                        {new Date(tx.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {customerDisplay}
                        </div>
                        {tx.customerPhone && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {tx.customerPhone}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {tx.paymentDetail || tx.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ৳{formatCurrency(tx.totalAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-center print:hidden">
                        <button
                          type="button"
                          onClick={() => handleOpenInvoiceModal(tx)}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                          title="View Invoice Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* TABLE SUMMARY FOOTER ROW */}
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                  <td colSpan={5} className="py-3 px-4 uppercase tracking-wider text-right text-xs">
                    TOTAL ({totals.count} Orders):
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm font-black text-slate-900 dark:text-white">
                    ৳{formatCurrency(totals.sales)}
                  </td>
                  <td className="py-3 px-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* 5. INVOICE DETAIL & PRINT MODAL (Exact Image 1 replica) */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}
