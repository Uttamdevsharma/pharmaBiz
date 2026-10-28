"use client";

import React, { useState, useEffect, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useBranchContext } from "@/context/BranchContext";
import { useAuth } from "@/context/AuthContext";
import { OwnerModule } from "./DashboardSidebar";
import { printReportDocument } from "@/lib/reportPrintEngine";
import { PurchaseBillDetailModal } from "@/components/common/PurchaseBillDetailModal";
import {
  ShoppingBag,
  Calendar,
  Search,
  Printer,
  Download,
  RefreshCw,
  Eye,
  FileText,
  X,
  Store,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Loader2,
} from "lucide-react";

interface PurchaseReportViewProps {
  onNavigate?: (module: OwnerModule) => void;
  selectedBranchId?: string;
}

interface PurchaseItemDetail {
  id: string;
  name: string;
  genericName?: string | null;
  batchNumber: string;
  expiryDate: string;
  boxQuantity: number;
  stripsPerBox: number;
  quantity: number;
  unitPurchasePrice: number;
  totalAmount: number;
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  brandName?: string;
}

interface PurchaseRecord {
  id: string;
  invoiceNo: string;
  purchaseDate: string;
  supplierName: string;
  supplierPhone?: string | null;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  notes?: string | null;
  branchName?: string;
  itemsCount: number;
  items: PurchaseItemDetail[];
}

interface PurchaseReportData {
  branch: { id: string; name: string };
  tenant: { name: string; phone?: string; logoUrl?: string | null };
  totals: {
    totalBills: number;
    totalAmount: number;
    totalPaid: number;
  };
  purchases: PurchaseRecord[];
}

interface SupplierOption {
  id: string;
  name: string;
}

export function PurchaseReportView({ onNavigate, selectedBranchId: propBranchId }: PurchaseReportViewProps) {
  const { user } = useAuth();
  const { selectedBranchId: contextBranchId, currentBranch, branches } = useBranchContext();
  const activeBranchId = propBranchId || contextBranchId || currentBranch?.id || (branches.length > 0 ? branches[0].id : "");

  // Date range (Defaults to 1st of month to today)
  const getFirstDayOfMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  };

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const [startDate, setStartDate] = useState<string>(getFirstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(getTodayStr);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);

  // Filters: Category, Subcategory, Brand (Strictly user-created, NO dummy data)
  const [categories, setCategories] = useState<any[]>([]);
  const [brandsList, setBrandsList] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("ALL");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");

  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PurchaseReportData | null>(null);

  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRecord | null>(null);

  // Load suppliers, categories, and brands
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetchApi<{ suppliers?: Array<{ id: string; name: string }> }>("/suppliers", { skipCache: true });
        if (res.success && res.data) {
          const list = (res.data.suppliers || (Array.isArray(res.data) ? res.data : [])).map((s: any) => ({
            id: s.id,
            name: s.name,
          }));
          setSuppliers(list);
        }
      } catch (e) {
        // silent fail
      }

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
      if (selectedSupplierId !== "ALL") params.append("supplierId", selectedSupplierId);
      if (selectedCategory !== "ALL") params.append("categoryId", selectedCategory);
      if (selectedSubcategory !== "ALL") params.append("subcategoryId", selectedSubcategory);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());

      const res = await fetchApi<PurchaseReportData>(`/reports/purchases?${params.toString()}`, { skipCache: true });
      if (res.success && res.data) {
        setData(res.data);
      } else {
        throw new Error(res.message || "Failed to load purchase report");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load procurement data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBranchId, startDate, endDate, selectedSupplierId, selectedCategory, selectedSubcategory]);

  // Client-side search and filters (Category, Subcategory, Brand)
  const filteredPurchases = useMemo(() => {
    if (!data?.purchases) return [];
    return data.purchases.filter((p) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesInvoice = p.invoiceNo.toLowerCase().includes(q);
        const matchesSupplier = p.supplierName.toLowerCase().includes(q);
        const matchesNote = (p.notes || "").toLowerCase().includes(q);
        const matchesItem = (p.items || []).some((i) => i.name.toLowerCase().includes(q));
        if (!matchesInvoice && !matchesSupplier && !matchesNote && !matchesItem) return false;
      }

      if (selectedBrand !== "ALL") {
        const hasBrand = (p.items || []).some(
          (i) => i.brandName?.toLowerCase() === selectedBrand.toLowerCase()
        );
        if (!hasBrand) return false;
      }

      if (selectedCategory !== "ALL") {
        const hasCat = (p.items || []).some((i) => i.categoryId === selectedCategory || i.categoryName === selectedCategory);
        if (!hasCat) return false;
      }

      if (selectedSubcategory !== "ALL") {
        const hasSubcat = (p.items || []).some((i) => i.subcategoryId === selectedSubcategory || i.subcategoryName === selectedSubcategory);
        if (!hasSubcat) return false;
      }

      return true;
    });
  }, [data?.purchases, searchTerm, selectedBrand, selectedCategory, selectedSubcategory]);

  // Compute table totals (NO DUE)
  const totals = useMemo(() => {
    let bills = filteredPurchases.length;
    let totalAmt = 0;
    let paidAmt = 0;
    let totalItemsQty = 0;
    for (const p of filteredPurchases) {
      totalAmt += Number(p.totalAmount || 0);
      paidAmt += Number(p.paidAmount || 0);
      for (const item of p.items || []) {
        totalItemsQty += Number(item.quantity || 0);
      }
    }
    return {
      bills,
      totalAmount: Number(totalAmt.toFixed(2)),
      paidAmount: Number(paidAmt.toFixed(2)),
      totalItemsQty,
    };
  }, [filteredPurchases]);

  const formatCurrency = (val: number) => {
    return Number(val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // High-Resolution Print / Save as PDF matching Image 5 (NO DUE)
  const handlePrint = () => {
    if (!filteredPurchases.length) return;
    const branchName = currentBranch?.name || data?.branch?.name || "All Branches";
    const supplierLabel = selectedSupplierId === "ALL" ? "All Suppliers" : (suppliers.find((s) => s.id === selectedSupplierId)?.name || "Selected Supplier");

    // Flatten purchase records by items to match Image 5:
    // SL | Date | Supplier Name | Branch | Product Name | Qty | Unit Cost | Total Amount | Paid
    const rows: Array<Array<string | number>> = [];
    let rowIdx = 1;

    filteredPurchases.slice(0, pageSize).forEach((p) => {
      const pDate = new Date(p.purchaseDate).toLocaleDateString("en-GB");

      if (p.items && p.items.length > 0) {
        p.items.forEach((item, iIdx) => {
          rows.push([
            rowIdx++,
            iIdx === 0 ? pDate : "",
            iIdx === 0 ? p.supplierName : "",
            iIdx === 0 ? branchName : "",
            item.name,
            item.quantity,
            item.unitPurchasePrice.toFixed(2),
            iIdx === 0 ? p.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "",
            iIdx === 0 ? p.paidAmount.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "",
          ]);
        });
      } else {
        rows.push([
          rowIdx++,
          pDate,
          p.supplierName,
          branchName,
          "—",
          p.itemsCount,
          "—",
          p.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 }),
          p.paidAmount.toLocaleString("en-US", { minimumFractionDigits: 2 }),
        ]);
      }
    });

    printReportDocument({
      title: "Purchase Report",
      pharmacyName: data?.tenant?.name || "PharmaBiz Pharmacy",
      meta: [
        { label: "Period", value: `${startDate} to ${endDate}` },
        { label: "Branch", value: branchName },
        { label: "Supplier", value: supplierLabel },
        { label: "Generated", value: new Date().toLocaleString("en-GB") },
      ],
      columns: [
        { header: "SL", align: "center", width: "35px" },
        { header: "Date", align: "center", width: "85px" },
        { header: "Supplier Name", align: "left", width: "140px" },
        { header: "Branch", align: "left", width: "120px" },
        { header: "Product Name", align: "left" },
        { header: "Qty", align: "center", width: "55px" },
        { header: "Unit Cost", align: "right", width: "80px" },
        { header: "Total Amount", align: "right", width: "100px" },
        { header: "Paid", align: "right", width: "95px" },
      ],
      rows,
      footerRow: [
        { text: "Total:", colSpan: 5, align: "right" },
        { text: totals.totalItemsQty || "—", align: "center" },
        { text: "" },
        { text: totals.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 }), align: "right" },
        { text: totals.paidAmount.toLocaleString("en-US", { minimumFractionDigits: 2 }), align: "right" },
      ],
    });
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredPurchases.length) return;
    const headers = ["SL", "Chalan / Invoice #", "Purchase Date", "Supplier Name", "Items Count", "Total Bill (৳)", "Paid Amount (৳)"];
    const rows = filteredPurchases.map((p, idx) => [
      idx + 1,
      `"${p.invoiceNo}"`,
      `"${new Date(p.purchaseDate).toLocaleDateString("en-US")}"`,
      `"${p.supplierName}"`,
      p.itemsCount,
      p.totalAmount,
      p.paidAmount,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Purchase_Report_${startDate}_to_${endDate}.csv`);
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
            <div className="p-2 bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-none border border-purple-200 dark:border-purple-800">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Purchase Report
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Supplier procurement bills, pharmaceutical chalan records, and costs for this branch.
          </p>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-none shadow-2xs">
            <Store className="h-3.5 w-3.5 text-brand-primary shrink-0" />
            <span>Active Branch: <strong className="text-brand-primary">{branchDisplay}</strong></span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-none shadow-2xs">
            <Calendar className="h-3.5 w-3.5 text-purple-600 shrink-0" />
            <span>Period: <strong className="font-mono">{startDate}</strong> {startDate !== endDate && `→ ${endDate}`}</span>
          </div>
        </div>
      </div>

      {/* 2. FILTER TOOLBAR (From Date, To Date, Category, Subcategory, Brand, Supplier - NO QUICK BUTTONS, NO DUE) */}
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

          {/* Supplier Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">Supplier:</span>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="h-8.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-none outline-none focus:border-brand-primary min-w-[140px]"
            >
              <option value="ALL">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-none transition border border-slate-300 dark:border-slate-700 ml-auto"
            title="Refresh Procurement Data"
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
            placeholder="Chalan #, supplier, item..."
            className="h-8 px-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs rounded-none outline-none focus:border-brand-primary min-w-[200px]"
          />
        </div>
      </div>

      {/* 4. DATA TABLE SECTION (NO SUMMARY CARDS, NO DUE COLUMN) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-2xs overflow-hidden">
        {loading && !data ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
            <span className="text-xs font-bold">Loading purchase orders and procurement data...</span>
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
        ) : filteredPurchases.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <ShoppingBag className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No Purchase Bills Found</p>
            <p className="text-xs text-slate-400">No supplier purchases match the selected date range and filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                {/* Green Header */}
                <tr className="bg-emerald-700 text-white font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3 w-12 text-center">SL</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Chalan / Invoice #</th>
                  <th className="py-3 px-3">Supplier Name</th>
                  <th className="py-3 px-3 text-center">Items</th>
                  <th className="py-3 px-3 text-right">Total Bill (৳)</th>
                  <th className="py-3 px-3 text-right">Paid (৳)</th>
                  <th className="py-3 px-3 text-center print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPurchases.slice(0, pageSize).map((p, idx) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(p.purchaseDate).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-brand-primary">
                      <button
                        type="button"
                        onClick={() => setSelectedPurchase(p)}
                        className="hover:underline cursor-pointer"
                      >
                        {p.invoiceNo}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {p.supplierName}
                      {p.supplierPhone && (
                        <span className="block text-[10px] text-slate-400 font-mono font-normal">
                          {p.supplierPhone}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      {p.itemsCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ৳{formatCurrency(p.totalAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ৳{formatCurrency(p.paidAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-center print:hidden">
                      <button
                        type="button"
                        onClick={() => setSelectedPurchase(p)}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                        title="View Bill Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                  <td colSpan={5} className="py-3 px-4 uppercase tracking-wider text-right text-xs">
                    TOTAL ({totals.bills} Procurement Bills):
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm font-black text-slate-900 dark:text-white">
                    ৳{formatCurrency(totals.totalAmount)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                    ৳{formatCurrency(totals.paidAmount)}
                  </td>
                  <td className="py-3 px-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* 5. MODAL: FORMAL PURCHASE BILL / CHALAN DETAIL MODAL (Matching Sales Invoice Design) */}
      <PurchaseBillDetailModal
        purchase={selectedPurchase}
        pharmacyName={data?.tenant?.name || "Shapla Pharmacy"}
        branchName={data?.branch?.name || currentBranch?.name || "Main Branch"}
        receiverName={user?.name || "Store Manager"}
        logoUrl={data?.tenant?.logoUrl}
        onClose={() => setSelectedPurchase(null)}
      />
    </div>
  );
}
