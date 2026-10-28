"use client";

import React, { useState, useEffect, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useBranchContext } from "@/context/BranchContext";
import { useAuth } from "@/context/AuthContext";
import { OwnerModule } from "./DashboardSidebar";
import { printReportDocument } from "@/lib/reportPrintEngine";
import {
  Package,
  Search,
  Printer,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Store,
  Layers,
  Loader2,
  FileText,
  Filter,
} from "lucide-react";

interface ProductsReportViewProps {
  onNavigate?: (module: OwnerModule) => void;
  selectedBranchId?: string;
}

interface ProductItem {
  id: string;
  name: string;
  genericName?: string | null;
  sku: string;
  barcode?: string | null;
  imageUrl?: string | null;
  brand: string;
  category: string;
  subcategory?: string | null;
  unit: string;
  variant: string;
  stockQty: number;
  sellingPrice: number;
  unitCost: number;
  totalValuation: number;
}

interface ProductsReportData {
  branch: { id: string; name: string };
  tenant: { name: string; phone?: string; logoUrl?: string | null };
  totals: {
    totalProducts: number;
    totalStockQty: number;
    totalValuation: number;
  };
  products: ProductItem[];
}

export function ProductsReportView({ onNavigate, selectedBranchId: propBranchId }: ProductsReportViewProps) {
  const { user } = useAuth();
  const { selectedBranchId: contextBranchId, currentBranch, branches } = useBranchContext();
  const activeBranchId = propBranchId || contextBranchId || currentBranch?.id || (branches.length > 0 ? branches[0].id : "");

  const [categories, setCategories] = useState<any[]>([]);
  const [brandsList, setBrandsList] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("ALL");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProductsReportData | null>(null);

  // Load category and brand list for dropdowns
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetchApi<any[]>("/products/categories", { skipCache: true });
        if (res.success && res.data) {
          setCategories(res.data);
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

  // Subcategories of selected main category
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
      });
      if (selectedCategory !== "ALL") params.append("categoryId", selectedCategory);
      if (selectedSubcategory !== "ALL") params.append("subcategoryId", selectedSubcategory);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());

      const res = await fetchApi<ProductsReportData>(`/reports/products?${params.toString()}`, { skipCache: true });
      if (res.success && res.data) {
        setData(res.data);
      } else {
        throw new Error(res.message || "Failed to load products stock report");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load products data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBranchId, selectedCategory, selectedSubcategory]);

  // Client-side quick search and brand filter
  const filteredProducts = useMemo(() => {
    if (!data?.products) return [];
    return data.products.filter((p) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          p.name.toLowerCase().includes(q) ||
          (p.genericName || "").toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode || "").includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      if (selectedBrand !== "ALL") {
        if (p.brand?.toLowerCase() !== selectedBrand.toLowerCase()) return false;
      }

      return true;
    });
  }, [data?.products, searchTerm, selectedBrand]);

  // Total stock count for filtered items
  const totalStockQty = useMemo(() => {
    return filteredProducts.reduce((sum, p) => sum + (p.stockQty || 0), 0);
  }, [filteredProducts]);

  const formatCurrency = (val: number) => {
    return Number(val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // High-Resolution Print / Save as PDF matching Image 4
  const handlePrint = () => {
    if (!data) return;
    printReportDocument({
      title: "Products Report",
      pharmacyName: data.tenant.name || "PharmaBiz Pharmacy",
      meta: [
        { label: "Branch", value: currentBranch?.name || data.branch.name },
        { label: "Generated", value: new Date().toLocaleString("en-US") },
      ],
      columns: [
        { header: "SL", align: "center", width: "40px" },
        { header: "Product Name", align: "left" },
        { header: "SKU", align: "left", width: "80px" },
        { header: "Brand", align: "left", width: "100px" },
        { header: "Category", align: "left", width: "120px" },
        { header: "Stock", align: "right", width: "70px" },
        { header: "Selling Price", align: "right", width: "90px" },
      ],
      rows: filteredProducts.slice(0, pageSize).map((p, idx) => [
        idx + 1,
        p.name,
        p.sku,
        p.brand,
        p.subcategory ? `${p.category} > ${p.subcategory}` : p.category,
        p.stockQty.toLocaleString(),
        p.sellingPrice.toFixed(2),
      ]),
      footerRow: [
        { text: "Total:", colSpan: 5, align: "right" },
        { text: totalStockQty.toLocaleString(), align: "right" },
        { text: "" },
      ],
    });
  };

  // Export to Excel / CSV
  const handleExportCSV = () => {
    if (!filteredProducts.length) return;
    const headers = ["SL", "Product Name", "SKU", "Barcode", "Brand", "Category", "Subcategory", "Variant/Unit", "Stock Qty", "Selling Price (৳)"];
    const rows = filteredProducts.map((p, idx) => [
      idx + 1,
      `"${p.name}"`,
      `"${p.sku}"`,
      `"${p.barcode || ""}"`,
      `"${p.brand}"`,
      `"${p.category}"`,
      `"${p.subcategory || ""}"`,
      `"${p.variant}"`,
      p.stockQty,
      p.sellingPrice,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Products_Report_${new Date().toISOString().split("T")[0]}.csv`);
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
              <Package className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Products Report
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time branch inventory levels, medicine stock quantities, and selling prices (no date range needed).
          </p>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-none shadow-2xs">
            <Store className="h-3.5 w-3.5 text-brand-primary shrink-0" />
            <span>Active Branch: <strong className="text-brand-primary">{branchDisplay}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. FILTER TOOLBAR (Category, Subcategory, Live Search - NO DATE RANGE) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 rounded-none shadow-2xs space-y-3 print:hidden">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubcategory("ALL");
              }}
              className="h-8.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-none outline-none focus:border-brand-primary min-w-[150px]"
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
                className="h-8.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-none outline-none focus:border-brand-primary min-w-[150px]"
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
                className="h-8.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-none outline-none focus:border-brand-primary min-w-[140px]"
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

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-none transition border border-slate-300 dark:border-slate-700 ml-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-brand-primary" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 3. TABLE CONTROLS (Matching Image 3: Show [25 v] entries | [PDF] [Excel] [Print] --- Search) */}
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

          {/* Action Buttons (Matching Image 3) */}
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

        {/* Search Right Input (Matching Image 3) */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-semibold">Search:</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search medicine, SKU, barcode..."
            className="h-8 px-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs rounded-none outline-none focus:border-brand-primary w-48 sm:w-64"
          />
        </div>
      </div>

      {/* 4. DATA TABLE (Matching Image 3 Style) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-2xs overflow-hidden">
        {loading && !data ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
            <span className="text-xs font-bold">Loading product stock report...</span>
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
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FileText className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No Products Found</p>
            <p className="text-xs text-slate-400">No medicine items found for the selected category filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                {/* Green Header (Matching Image 3) */}
                <tr className="bg-emerald-700 text-white font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3 w-12 text-center">SL</th>
                  <th className="py-3 px-2 w-14 text-center">Image</th>
                  <th className="py-3 px-3">Product Name</th>
                  <th className="py-3 px-3">Brand</th>
                  <th className="py-3 px-3">Category Hierarchy</th>
                  <th className="py-3 px-3">Variants (Color/Size)</th>
                  <th className="py-3 px-4 text-right">Stock Qty</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProducts.slice(0, pageSize).map((p, idx) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="h-9 w-9 object-cover rounded-none border border-slate-200 dark:border-slate-700 mx-auto"
                        />
                      ) : (
                        <div className="h-9 w-9 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
                          <Package className="h-4 w-4" />
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        SKU: {p.sku} {p.barcode && `• Barcode: ${p.barcode}`}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">
                      {p.brand}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      <div>{p.category}</div>
                      {p.subcategory && (
                        <div className="text-[10px] text-slate-400">&gt; {p.subcategory}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">
                      {p.variant || "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {p.stockQty.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.sellingPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* TABLE SUMMARY FOOTER (Matching Image 3: TOTAL: [Stock Qty]) */}
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-800 font-black border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                  <td colSpan={6} className="py-3 px-4 text-right uppercase tracking-wider text-xs">
                    TOTAL:
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm font-black text-slate-900 dark:text-white">
                    {totalStockQty.toLocaleString()}
                  </td>
                  <td className="py-3 px-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
