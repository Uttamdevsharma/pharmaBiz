"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { Product, Category } from "@/types";
import { Pagination } from "@/components/common/Pagination";
import { showAlert } from "@/lib/swal";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  FolderTree,
  X,
  Save,
  Pill,
  Droplets,
  Syringe,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileUp,
} from "lucide-react";

interface ProductListViewProps {
  onNavigate: (module: any) => void;
  onEditProduct?: (product: Product) => void;
}

type PackagingModel = "TABLET" | "BOTTLE" | "PIECE" | "VIAL";

let cachedProductsList: Product[] = [];
let cachedCategoriesList: Category[] = [];
let cachedTotalPages = 1;
let cachedTotalItems = 0;

/**
 * Robust RFC-4180 CSV Text Parser (handles quoted strings, commas, linebreaks, empty lines)
 */
function parseCsv(text: string): string[][] {
  const p: string[][] = [];
  let row: string[] = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      row.push("");
    } else if ((c === "\r" || c === "\n") && !inQuotes) {
      if (c === "\r" && next === "\n") i++;
      if (row.length > 1 || row[0].trim() !== "") {
        p.push(row);
      }
      row = [""];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0].trim() !== "") {
    p.push(row);
  }
  return p;
}

/**
 * Maps parsed CSV rows into product objects with validation
 */
function mapCsvRowsToProducts(rows: string[][]): {
  valid: any[];
  invalid: { row: number; error: string; raw: any }[];
} {
  if (rows.length < 2) return { valid: [], invalid: [] };
  const rawHeaders = rows[0].map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));

  const headerMap: { [key: string]: number } = {};
  rawHeaders.forEach((h, idx) => {
    if (["productname", "name", "medicine", "medicinename", "itemname"].includes(h)) headerMap["name"] = idx;
    else if (["genericname", "generic", "genericgroup"].includes(h)) headerMap["genericName"] = idx;
    else if (["category", "maincategory"].includes(h)) headerMap["category"] = idx;
    else if (["subcategory", "subcat"].includes(h)) headerMap["subcategory"] = idx;
    else if (["manufacturer", "company", "brand", "brandname", "mfg"].includes(h)) headerMap["manufacturer"] = idx;
    else if (["size", "strength", "mg", "ml"].includes(h)) headerMap["size"] = idx;
    else if (["unit", "packagingunit"].includes(h)) headerMap["unit"] = idx;
    else if (["defaultpacktype", "packtype"].includes(h)) headerMap["defaultPackType"] = idx;
    else if (["stripsperbox", "strips"].includes(h)) headerMap["stripsPerBox"] = idx;
    else if (["tabletsperstrip", "tablets"].includes(h)) headerMap["tabletsPerStrip"] = idx;
    else if (["basemrpprice", "baseprice", "price", "mrp", "unitprice"].includes(h)) headerMap["basePrice"] = idx;
    else if (["barcode"].includes(h)) headerMap["barcode"] = idx;
    else if (["sku", "productcode", "code"].includes(h)) headerMap["sku"] = idx;
    else if (["minstockalert", "minstock", "alertqty"].includes(h)) headerMap["minStockAlert"] = idx;
    else if (["prescriptionrequired", "requiresprescription", "rx", "prescription"].includes(h))
      headerMap["requiresPrescription"] = idx;
  });

  if (headerMap["name"] === undefined) {
    throw new Error("Could not find 'Product Name' or 'Name' column in CSV header.");
  }

  const valid: any[] = [];
  const invalid: { row: number; error: string; raw: any }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.every((c) => !c.trim())) continue;

    const getVal = (field: string) => {
      const idx = headerMap[field];
      return idx !== undefined && r[idx] !== undefined ? r[idx].trim() : "";
    };

    const name = getVal("name");
    if (!name || name.length < 2) {
      invalid.push({ row: i + 1, error: "Product name is required (min 2 characters)", raw: r });
      continue;
    }

    const priceNum = parseFloat(getVal("basePrice"));
    const basePrice = !isNaN(priceNum) && priceNum >= 0 ? priceNum : 0;

    const stripsNum = parseInt(getVal("stripsPerBox"), 10);
    const stripsPerBox = !isNaN(stripsNum) && stripsNum > 0 ? stripsNum : 10;

    const tabsNum = parseInt(getVal("tabletsPerStrip"), 10);
    const tabletsPerStrip = !isNaN(tabsNum) && tabsNum > 0 ? tabsNum : 10;

    const minAlertNum = parseInt(getVal("minStockAlert"), 10);
    const minStockAlert = !isNaN(minAlertNum) && minAlertNum >= 0 ? minAlertNum : 10;

    const rxVal = getVal("requiresPrescription").toLowerCase();
    const requiresPrescription = ["yes", "true", "1", "y"].includes(rxVal);

    const category = getVal("category") || "Medicine";
    const subcategory = getVal("subcategory") || null;
    const genericName = getVal("genericName") || null;
    const manufacturer = getVal("manufacturer") || null;
    const size = getVal("size") || null;
    const unit = getVal("unit") || "tablet";
    const defaultPackType = (getVal("defaultPackType") || "BOX").toUpperCase();
    const barcode = getVal("barcode") || null;
    const sku = getVal("sku") || null;

    valid.push({
      name,
      genericName,
      category,
      subcategory,
      manufacturer,
      brandName: manufacturer,
      size,
      unit,
      defaultPackType,
      stripsPerBox,
      tabletsPerStrip,
      basePrice,
      barcode,
      sku,
      minStockAlert,
      shopMinStockAlert: minStockAlert,
      godownMinStockAlert: Math.max(50, minStockAlert * 3),
      requiresPrescription,
    });
  }

  return { valid, invalid };
}

/**
 * Downloads a sample product CSV template
 */
function downloadSampleCsv() {
  const sampleHeaders = [
    "Product Name",
    "Generic Name",
    "Category",
    "Subcategory",
    "Manufacturer",
    "Size",
    "Unit",
    "Default Pack Type",
    "Strips Per Box",
    "Tablets Per Strip",
    "Base MRP Price",
    "Barcode",
    "SKU",
    "Min Stock Alert",
    "Prescription Required",
  ];

  const sampleRows = [
    [
      '"Napa 500mg"',
      '"Paracetamol"',
      '"Medicine"',
      '"Antipyretics & Pain Relief"',
      '"Beximco Pharmaceuticals"',
      '"500mg"',
      '"tablet"',
      '"BOX"',
      "10",
      "10",
      "12.00",
      '"8901234567890"',
      '"NAPA-500"',
      "20",
      '"No"',
    ],
    [
      '"Seclo 20mg"',
      '"Omeprazole"',
      '"Medicine"',
      '"Gastrointestinal & Antacids"',
      '"Square Pharmaceuticals"',
      '"20mg"',
      '"capsule"',
      '"BOX"',
      "10",
      "10",
      "60.00",
      '"8901234567891"',
      '"SECLO-20"',
      "30",
      '"No"',
    ],
    [
      '"Ace Plus"',
      '"Paracetamol + Caffeine"',
      '"Medicine"',
      '"Antipyretics & Pain Relief"',
      '"Square Pharmaceuticals"',
      '"Standard"',
      '"tablet"',
      '"BOX"',
      "10",
      "10",
      "25.00",
      '"8901234567892"',
      '"ACE-PLUS"',
      "15",
      '"No"',
    ],
    [
      '"Tofen Syrup 100ml"',
      '"Ketotifen"',
      '"Syrup"',
      '"Pediatric Syrups & Drops"',
      '"Beximco Pharmaceuticals"',
      '"100ml"',
      '"bottle"',
      '"BOTTLE"',
      "1",
      "1",
      "85.00",
      '"8901234567893"',
      '"TOFEN-100"',
      "10",
      '"No"',
    ],
  ];

  const csv = [sampleHeaders.join(","), ...sampleRows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pharmabiz_product_import_sample.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ProductListView({ onNavigate, onEditProduct }: ProductListViewProps) {
  const [products, setProducts] = useState<Product[]>(() => cachedProductsList);
  const [categories, setCategories] = useState<Category[]>(() => cachedCategoriesList);
  const [loading, setLoading] = useState(() => cachedProductsList.length === 0);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(() => cachedTotalPages);
  const [totalItems, setTotalItems] = useState(() => cachedTotalItems);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [packagingType, setPackagingType] = useState<PackagingModel>("TABLET");
  const [itemsPerBox, setItemsPerBox] = useState<number>(10);

  const [editFormData, setEditFormData] = useState({
    name: "",
    genericName: "",
    size: "",
    categoryId: "",
    subcategoryId: "",
    unit: "tablet",
    stripsPerBox: 10,
    tabletsPerStrip: 10,
    minStockAlert: 10,
    shopMinStockAlert: 10,
    godownMinStockAlert: 50,
    requiresPrescription: false,
  });

  // CSV Export & Import State
  const [isExporting, setIsExporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [parsedValidProducts, setParsedValidProducts] = useState<any[]>([]);
  const [parsedInvalidRows, setParsedInvalidRows] = useState<{ row: number; error: string; raw: any }[]>([]);
  const [isImportSubmitting, setIsImportSubmitting] = useState(false);
  const [importPreviewTab, setImportPreviewTab] = useState<"VALID" | "INVALID">("VALID");

  const loadVariants = useCallback(async () => {
    try {
      const catsRes = await fetchApi("/products/variants/categories");
      if (catsRes.success && catsRes.data) setCategories(catsRes.data);
    } catch (err) {
      console.error("Failed to load catalog variants", err);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "10");
      if (search) params.append("search", search);
      if (categoryFilter) params.append("categoryId", categoryFilter);
      if (subcategoryFilter) params.append("subcategoryId", subcategoryFilter);

      const res = await fetchApi(`/products?${params.toString()}`);
      if (res.success && res.data) {
        cachedProductsList = res.data;
        setProducts(res.data);
        if (res.meta) {
          cachedTotalPages = res.meta.totalPages || 1;
          cachedTotalItems = res.meta.total || res.data.length || 0;
          setTotalPages(cachedTotalPages);
          setTotalItems(cachedTotalItems);
        }
      }
    } catch (err) {
      console.error("Failed to load products", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, subcategoryFilter]);

  useEffect(() => {
    loadVariants();
  }, [loadVariants]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadProducts();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate and remove "${name}" from catalog?`)) {
      return;
    }
    try {
      const res = await fetchApi(`/products/${id}`, { method: "DELETE" });
      if (res.success) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        showAlert.success("Deleted", `"${name}" removed from catalog.`);
      } else {
        showAlert.error("Delete Failed", res.message || "Failed to delete product");
      }
    } catch (err: any) {
      showAlert.error("Delete Failed", err.message || "Failed to delete product");
    }
  };

  // Open Edit Modal with Pre-filled Data
  const handleOpenEdit = (p: Product) => {
    const u = p.unit?.toLowerCase() || "";
    const pt = p.defaultPackType?.toUpperCase() || "";
    let detectedType: PackagingModel = "TABLET";
    let items = p.stripsPerBox || 10;

    if (u === "bottle" || pt === "BOTTLE") {
      detectedType = "BOTTLE";
      items = p.stripsPerBox || 12;
    } else if (u === "vial" || u === "ampoule" || pt === "VIAL") {
      detectedType = "VIAL";
      items = p.stripsPerBox || 10;
    } else if (u === "piece" || u === "pack" || pt === "PIECE") {
      detectedType = "PIECE";
      items = p.stripsPerBox || 1;
    }

    setPackagingType(detectedType);
    setItemsPerBox(items);
    setEditFormData({
      name: p.name || "",
      genericName: p.genericName || "",
      size: p.size || "",
      categoryId: p.categoryId || (p.categoryRef?.id || ""),
      subcategoryId: p.subcategoryId || "",
      unit: p.unit || "tablet",
      stripsPerBox: p.stripsPerBox || 10,
      tabletsPerStrip: p.tabletsPerStrip || 10,
      minStockAlert: (p as any).minStockAlert ?? 10,
      shopMinStockAlert: (p as any).shopMinStockAlert ?? (p as any).minStockAlert ?? 10,
      godownMinStockAlert: (p as any).godownMinStockAlert ?? 50,
      requiresPrescription: Boolean(p.requiresPrescription),
    });
    setEditingProduct(p);
    setEditModalOpen(true);
  };

  const handleSelectPackagingType = (type: PackagingModel) => {
    setPackagingType(type);
    if (type === "TABLET") {
      setEditFormData((prev) => ({
        ...prev,
        unit: "tablet",
        size: prev.size && !prev.size.includes("ml") && prev.size !== "Standard" ? prev.size : "500mg",
        stripsPerBox: prev.stripsPerBox || 10,
        tabletsPerStrip: prev.tabletsPerStrip || 10,
      }));
    } else if (type === "BOTTLE") {
      const bItems = itemsPerBox && itemsPerBox > 1 ? itemsPerBox : 12;
      setItemsPerBox(bItems);
      setEditFormData((prev) => ({
        ...prev,
        unit: "bottle",
        size: prev.size && prev.size.includes("ml") ? prev.size : "100ml",
        stripsPerBox: bItems,
        tabletsPerStrip: 1,
      }));
    } else if (type === "PIECE") {
      const pItems = itemsPerBox && itemsPerBox > 0 ? itemsPerBox : 1;
      setItemsPerBox(pItems);
      setEditFormData((prev) => ({
        ...prev,
        unit: "piece",
        size: "Standard",
        stripsPerBox: pItems,
        tabletsPerStrip: 1,
      }));
    } else if (type === "VIAL") {
      const vItems = itemsPerBox && itemsPerBox > 1 ? itemsPerBox : 10;
      setItemsPerBox(vItems);
      setEditFormData((prev) => ({
        ...prev,
        unit: "vial",
        size: prev.size && (prev.size.includes("g") || prev.size.includes("ml")) ? prev.size : "1g",
        stripsPerBox: vItems,
        tabletsPerStrip: 1,
      }));
    }
  };

  // Save changes from Edit Modal
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      setModalSaving(true);
      const isTablet = packagingType === "TABLET";
      const isBottle = packagingType === "BOTTLE";
      const isPiece = packagingType === "PIECE";
      const isVial = packagingType === "VIAL";

      let finalUnit = "tablet";
      let defaultPackType = "BOX";
      let strips = Number(editFormData.stripsPerBox) || 10;
      let tablets = Number(editFormData.tabletsPerStrip) || 10;

      if (isTablet) {
        finalUnit = editFormData.unit || "tablet";
        defaultPackType = "BOX";
        strips = Number(editFormData.stripsPerBox) || 10;
        tablets = Number(editFormData.tabletsPerStrip) || 10;
      } else if (isBottle) {
        finalUnit = "bottle";
        defaultPackType = "BOTTLE";
        strips = Number(itemsPerBox) || 1;
        tablets = 1;
      } else if (isPiece) {
        finalUnit = editFormData.unit || "piece";
        defaultPackType = "PIECE";
        strips = Number(itemsPerBox) || 1;
        tablets = 1;
      } else if (isVial) {
        finalUnit = "vial";
        defaultPackType = "VIAL";
        strips = Number(itemsPerBox) || 1;
        tablets = 1;
      }

      const payload = {
        name: editFormData.name.trim(),
        genericName: editFormData.genericName?.trim() || null,
        size: editFormData.size || null,
        categoryId: editFormData.categoryId || null,
        subcategoryId: editFormData.subcategoryId || null,
        unit: finalUnit,
        defaultPackType,
        qtyPerLevel2: isBottle ? (Number(itemsPerBox) || 12) : 10,
        stripsPerBox: strips,
        tabletsPerStrip: tablets,
        qtyPerLevel3: strips,
        qtyPerLevel4: tablets,
        minStockAlert: Number(editFormData.minStockAlert) >= 0 ? Number(editFormData.minStockAlert) : 10,
        shopMinStockAlert: Number(editFormData.shopMinStockAlert) >= 0 ? Number(editFormData.shopMinStockAlert) : (Number(editFormData.minStockAlert) >= 0 ? Number(editFormData.minStockAlert) : 10),
        godownMinStockAlert: Number(editFormData.godownMinStockAlert) >= 0 ? Number(editFormData.godownMinStockAlert) : 50,
        requiresPrescription: editFormData.requiresPrescription,
      };

      const res = await fetchApi(`/products/${editingProduct.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to update product");
      }

      // Update in local state & refetch
      setProducts((prev) =>
        prev.map((item) => (item.id === editingProduct.id ? { ...item, ...payload } : item))
      );
      setEditModalOpen(false);
      setEditingProduct(null);

      showAlert.success("Product Updated!", `"${editFormData.name}" updated successfully.`, {
        timer: 1500,
      });
      loadProducts();
    } catch (err: any) {
      showAlert.error("Update Failed", err.message || "An error occurred");
    } finally {
      setModalSaving(false);
    }
  };

  // Export All Products to CSV
  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const res = await fetchApi<any>("/products?limit=10000");
      const list: any[] = res.success && Array.isArray(res.data) ? res.data : products;

      if (!list || list.length === 0) {
        showAlert.info("No Products", "No products available to export.");
        return;
      }

      const headers = [
        "Product Name",
        "Generic Name",
        "Category",
        "Subcategory",
        "Manufacturer",
        "Size",
        "Unit",
        "Default Pack Type",
        "Strips Per Box",
        "Tablets Per Strip",
        "Base MRP Price",
        "Barcode",
        "SKU",
        "Min Stock Alert",
        "Prescription Required",
      ];

      const escapeVal = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val);
        return `"${str.replace(/"/g, '""')}"`;
      };

      const rows = list.map((p: any) => [
        escapeVal(p.name || ""),
        escapeVal(p.genericName || ""),
        escapeVal(p.category || (p.categoryRef ? p.categoryRef.name : "")),
        escapeVal(p.subcategory || (p.subcategoryRef ? p.subcategoryRef.name : "")),
        escapeVal(p.manufacturer || p.brandName || ""),
        escapeVal(p.size || ""),
        escapeVal(p.unit || "piece"),
        escapeVal(p.defaultPackType || "BOX"),
        p.stripsPerBox || 10,
        p.tabletsPerStrip || 10,
        Number(p.basePrice || 0).toFixed(2),
        escapeVal(p.barcode || ""),
        escapeVal(p.sku || ""),
        p.minStockAlert || 10,
        escapeVal(p.requiresPrescription ? "Yes" : "No"),
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pharmabiz_products_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showAlert.toast(`Exported ${list.length} products to CSV!`, "success");
    } catch (err: any) {
      console.error("Export CSV error:", err);
      showAlert.error("Export Failed", err.message || "Failed to export products.");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle CSV file selection and parsing
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      showAlert.error("Invalid File", "Please upload a valid .csv file.");
      return;
    }

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const matrix = parseCsv(text);
        if (matrix.length < 2) {
          showAlert.error("Empty CSV", "The selected CSV file has no product rows.");
          setParsedValidProducts([]);
          setParsedInvalidRows([]);
          return;
        }

        const { valid, invalid } = mapCsvRowsToProducts(matrix);
        setParsedValidProducts(valid);
        setParsedInvalidRows(invalid);
        setImportPreviewTab(valid.length > 0 ? "VALID" : "INVALID");

        if (valid.length === 0) {
          showAlert.error(
            "Validation Failed",
            "No valid products found in this CSV. Please check required columns like 'Product Name'."
          );
        }
      } catch (err: any) {
        console.error("Failed to parse CSV", err);
        showAlert.error("CSV Parse Error", err.message || "Could not read this CSV file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Confirm and submit bulk import
  const handleConfirmImport = async () => {
    if (parsedValidProducts.length === 0) {
      showAlert.error("No Products", "No valid products to import.");
      return;
    }

    try {
      setIsImportSubmitting(true);
      const res = await fetchApi<any>("/products/bulk", {
        method: "POST",
        body: JSON.stringify({
          products: parsedValidProducts,
        }),
      });

      if (res.success || (res as any)?.totalProcessed || (res as any)?.createdCount !== undefined) {
        showAlert.success(
          "Import Successful!",
          `Successfully processed ${parsedValidProducts.length} products.`,
          { timer: 2000 }
        );
        setIsImportModalOpen(false);
        setImportFileName("");
        setParsedValidProducts([]);
        setParsedInvalidRows([]);
        await loadProducts();
      } else {
        throw new Error(res.message || "Bulk import failed.");
      }
    } catch (err: any) {
      console.error("Bulk import error:", err);
      showAlert.error("Import Failed", err.message || "Failed to import products via CSV.");
    } finally {
      setIsImportSubmitting(false);
    }
  };

  const activeCategoryObj = categories.find((c) => c.id === categoryFilter);
  const availableSubcategories = activeCategoryObj ? activeCategoryObj.subcategories || [] : [];

  const editCategoryObj = categories.find((c) => c.id === editFormData.categoryId);
  const editAvailableSubcategories = editCategoryObj ? editCategoryObj.subcategories || [] : [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-400 mb-1">
            <span>Inventory</span>
            <span>/</span>
            <span className="text-brand-primary">Product List</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Package className="h-7 w-7 text-brand-primary" />
            Product Catalog
          </h2>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="h-11 px-4 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
            title="Download all products in CSV format"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
            ) : (
              <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsImportModalOpen(true);
              setImportFileName("");
              setParsedValidProducts([]);
              setParsedInvalidRows([]);
            }}
            className="h-11 px-4 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-2xs cursor-pointer active:scale-95"
            title="Import products from a CSV file"
          >
            <Upload className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => onNavigate("inv_variants")}
            className="h-11 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <FolderTree className="h-4 w-4 text-brand-primary" />
            <span>Categories</span>
          </button>

          <button
            onClick={() => onNavigate("inv_add_product")}
            className="h-11 px-5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name, generic name, or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-11 pr-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-xs sm:placeholder:text-sm placeholder:text-slate-400 outline-none focus:border-brand-primary"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Main Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setSubcategoryFilter("");
              setPage(1);
            }}
            className="h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-brand-primary"
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Subcategory Filter */}
          {availableSubcategories.length > 0 && (
            <select
              value={subcategoryFilter}
              onChange={(e) => {
                setSubcategoryFilter(e.target.value);
                setPage(1);
              }}
              className="h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-brand-primary animate-in fade-in"
            >
              <option value="">All Subcategories ({availableSubcategories.length})</option>
              {availableSubcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          )}

          {(categoryFilter || subcategoryFilter || search) && (
            <button
              onClick={() => {
                setCategoryFilter("");
                setSubcategoryFilter("");
                setSearch("");
                setPage(1);
              }}
              className="h-12 w-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl transition"
              title="Clear Filters"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Product Catalog Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading && products.length === 0 ? (
          <div className="table-responsive-container">
            <table className="w-full min-w-[800px] text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-black text-xs">
                  <th className="py-4 px-4 w-12 text-center">#</th>
                  <th className="py-4 px-5">Product Name &amp; Strength</th>
                  <th className="py-4 px-5">Generic Name</th>
                  <th className="py-4 px-4 text-center">Category</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 animate-pulse">
                {[...Array(6)].map((_, i) => (
                  <tr key={i} className="h-16">
                    <td className="py-4 px-4 text-center">
                      <div className="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded mx-auto" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
                        <div className="h-5 w-14 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg mx-auto" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                        <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : products.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Package className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-base font-bold text-slate-700 dark:text-slate-300">No products found</p>
            <p className="text-xs mt-1">Try adjusting your filters or click "Add Product" to add a new medicine.</p>
          </div>
        ) : (
          <div className="table-responsive-container">
            <table className="w-full min-w-[800px] text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-black text-xs">
                  <th className="py-4 px-4 w-12 text-center">#</th>
                  <th className="py-4 px-5">Product Name &amp; Strength</th>
                  <th className="py-4 px-5">Generic Name</th>
                  <th className="py-4 px-4 text-center">Category</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {products.map((p, index) => {
                  const serialNo = (page - 1) * 10 + index + 1;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-4 px-4 text-center text-xs font-bold text-slate-400">
                        {serialNo}
                      </td>

                      <td className="py-4 px-5">
                        <div className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                          <span>{p.name}</span>
                          {p.size && (
                            <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 text-xs px-2.5 py-0.5 rounded-lg font-black tracking-wide">
                              {p.size}
                            </span>
                          )}
                          {p.requiresPrescription && (
                            <span className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 text-[10px] px-2 py-0.5 rounded-md font-black">
                              Rx
                            </span>
                          )}
                          <span
                            title={`Shop/Rack alert triggers at ≤ ${p.shopMinStockAlert ?? p.minStockAlert ?? 10} units. Godown alert triggers at ≤ ${p.godownMinStockAlert ?? 50} units.`}
                            className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 text-[11px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1"
                          >
                            <span>Shop ≤ {p.shopMinStockAlert ?? p.minStockAlert ?? 10}</span>
                            <span className="text-slate-300 dark:text-slate-600">|</span>
                            <span>Godown ≤ {p.godownMinStockAlert ?? 50}</span>
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        {p.genericName ? (
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                            {p.genericName}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic font-normal">—</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-brand-primary/10 text-brand-primary">
                          {p.categoryRef?.name || p.category || "General"}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={10}
          onPageChange={setPage}
          alwaysShow={true}
        />
      </div>

      {/* EDIT PRODUCT MODAL POPUP */}
      {editModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full my-auto overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    Edit Product
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Update details for <span className="font-bold text-slate-700 dark:text-slate-300">{editingProduct.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingProduct(null);
                }}
                className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveEdit} className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {/* Product Name */}
                <div className="sm:col-span-2">
                  <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Napa Extra, Seclo 20"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full h-11 sm:h-12 px-3.5 bg-slate-50 hover:bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-xs sm:placeholder:text-sm placeholder:text-slate-400 outline-none focus:border-brand-primary transition"
                  />
                </div>

                {/* Generic Name */}
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Generic Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paracetamol, Omeprazole"
                    value={editFormData.genericName}
                    onChange={(e) => setEditFormData({ ...editFormData, genericName: e.target.value })}
                    className="w-full h-11 sm:h-12 px-3.5 bg-slate-50 hover:bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-xs sm:placeholder:text-sm placeholder:text-slate-400 outline-none focus:border-brand-primary transition"
                  />
                </div>

                {/* Strength / Size */}
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Strength / Size
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 500mg, 100ml"
                    value={editFormData.size}
                    onChange={(e) => setEditFormData({ ...editFormData, size: e.target.value })}
                    className="w-full h-11 sm:h-12 px-3.5 bg-slate-50 hover:bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-xs sm:placeholder:text-sm placeholder:text-slate-400 outline-none focus:border-brand-primary transition"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={editFormData.categoryId}
                    onChange={(e) => setEditFormData({ ...editFormData, categoryId: e.target.value, subcategoryId: "" })}
                    className="w-full h-11 sm:h-12 px-3.5 bg-slate-50 hover:bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-primary transition"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subcategory */}
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Subcategory
                  </label>
                  <select
                    value={editFormData.subcategoryId}
                    onChange={(e) => setEditFormData({ ...editFormData, subcategoryId: e.target.value })}
                    className="w-full h-11 sm:h-12 px-3.5 bg-slate-50 hover:bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-primary transition"
                  >
                    <option value="">-- None / General --</option>
                    {editAvailableSubcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Shop Low Stock Alert Limit */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      Shop Alert Limit
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      Shop / Shelf
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 10 or 20 (Default: 10)"
                    value={editFormData.shopMinStockAlert}
                    onChange={(e) => {
                      const val = e.target.value === "" ? 0 : Number(e.target.value);
                      setEditFormData({
                        ...editFormData,
                        shopMinStockAlert: val,
                        minStockAlert: val,
                      });
                    }}
                    className="w-full h-11 sm:h-12 px-3.5 bg-slate-50 hover:bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-xs sm:placeholder:text-sm placeholder:text-slate-400 outline-none focus:border-brand-primary transition"
                  />
                </div>

                {/* Godown Low Stock Alert Limit */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      Godown Alert Limit
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                      Warehouse
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 50 or 100 (Default: 50)"
                    value={editFormData.godownMinStockAlert}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        godownMinStockAlert: e.target.value === "" ? 0 : Number(e.target.value),
                      })
                    }
                    className="w-full h-11 sm:h-12 px-3.5 bg-slate-50 hover:bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-xs sm:placeholder:text-sm placeholder:text-slate-400 outline-none focus:border-brand-primary transition"
                  />
                </div>
              </div>

              {/* Packaging Type Options */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                  Packaging Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSelectPackagingType("TABLET")}
                    className={`p-3 rounded-xl border-2 text-left transition flex flex-col gap-1 ${
                      packagingType === "TABLET"
                        ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold">
                      <Pill className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Tablet / Box</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPackagingType("BOTTLE")}
                    className={`p-3 rounded-xl border-2 text-left transition flex flex-col gap-1 ${
                      packagingType === "BOTTLE"
                        ? "bg-blue-50/80 dark:bg-blue-950/30 border-blue-500 text-blue-950 dark:text-blue-200 font-bold"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold">
                      <Droplets className="h-4 w-4 text-blue-600 shrink-0" />
                      <span>Syrup / Bottle</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPackagingType("PIECE")}
                    className={`p-3 rounded-xl border-2 text-left transition flex flex-col gap-1 ${
                      packagingType === "PIECE"
                        ? "bg-purple-50/80 dark:bg-purple-950/30 border-purple-500 text-purple-950 dark:text-purple-200 font-bold"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold">
                      <Package className="h-4 w-4 text-purple-600 shrink-0" />
                      <span>Piece / Unit</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPackagingType("VIAL")}
                    className={`p-3 rounded-xl border-2 text-left transition flex flex-col gap-1 ${
                      packagingType === "VIAL"
                        ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-500 text-amber-950 dark:text-amber-200 font-bold"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold">
                      <Syringe className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>Injection / Vial</span>
                    </div>
                  </button>
                </div>

                {/* Packaging numbers */}
                {packagingType === "TABLET" && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Strips per Box
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editFormData.stripsPerBox}
                        onChange={(e) => setEditFormData({ ...editFormData, stripsPerBox: parseInt(e.target.value) || 1 })}
                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Tablets per Strip
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editFormData.tabletsPerStrip}
                        onChange={(e) => setEditFormData({ ...editFormData, tabletsPerStrip: parseInt(e.target.value) || 1 })}
                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {(packagingType === "BOTTLE" || packagingType === "PIECE" || packagingType === "VIAL") && (
                  <div className="pt-1">
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {packagingType === "BOTTLE" ? "Bottles per Box / Carton" : packagingType === "PIECE" ? "Pieces per Pack" : "Vials per Box"}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={itemsPerBox}
                      onChange={(e) => setItemsPerBox(parseInt(e.target.value) || 1)}
                      className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              {/* Prescription Rx */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between cursor-pointer">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded text-xs font-black">
                      Rx
                    </span>
                    Requires Doctor Prescription
                  </span>
                  <input
                    type="checkbox"
                    checked={editFormData.requiresPrescription}
                    onChange={(e) => setEditFormData({ ...editFormData, requiresPrescription: e.target.checked })}
                    className="h-4 w-4 text-brand-primary rounded accent-brand-primary"
                  />
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="h-11 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="h-11 px-6 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {modalSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Update Product</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Bulk Import Products (.CSV)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Upload a spreadsheet to bulk create or update your medicine catalog
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFileName("");
                  setParsedValidProducts([]);
                  setParsedInvalidRows([]);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Template Download Prompt */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Need the standard column format?
                  </div>
                  <div className="text-xs text-slate-500">
                    Download our sample template with pre-filled sample medicine columns.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="px-3.5 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Download Sample CSV</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Select CSV File <span className="text-rose-500">*</span>
                </label>
                <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-primary dark:hover:border-brand-primary bg-slate-50/50 dark:bg-slate-850/50 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition group">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-2 group-hover:scale-110 transition">
                    <FileUp className="h-6 w-6" />
                  </div>
                  {importFileName ? (
                    <div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white block">
                        {importFileName}
                      </span>
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 inline-block">
                        Click to choose a different file
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                        Click to browse or drop CSV file here
                      </span>
                      <span className="text-xs text-slate-400 mt-0.5 block">
                        Supported file format: .csv (Comma Separated Values)
                      </span>
                    </div>
                  )}
                </label>
              </div>

              {/* Validation Summary & Preview */}
              {(parsedValidProducts.length > 0 || parsedInvalidRows.length > 0) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      File Analysis &amp; Validation
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {parsedValidProducts.length} Valid
                      </span>
                      {parsedInvalidRows.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {parsedInvalidRows.length} Skipped / Error
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Invalid Rows Warning */}
                  {parsedInvalidRows.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        <span>The following rows have issues and will be skipped:</span>
                      </div>
                      <ul className="list-disc pl-5 space-y-0.5 text-xs text-amber-700 dark:text-amber-300 max-h-24 overflow-y-auto">
                        {parsedInvalidRows.map((inv, idx) => (
                          <li key={idx}>
                            Row {inv.row}: {inv.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Valid Products Preview Table */}
                  {parsedValidProducts.length > 0 && (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-750 text-xs font-bold text-slate-600 dark:text-slate-300">
                        Preview of Valid Medicines to Import (Showing first {Math.min(5, parsedValidProducts.length)} of {parsedValidProducts.length})
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100/70 dark:bg-slate-850 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="py-2 px-3">Medicine Name</th>
                              <th className="py-2 px-3">Generic</th>
                              <th className="py-2 px-3">Category</th>
                              <th className="py-2 px-3">Manufacturer</th>
                              <th className="py-2 px-3 text-right">Price</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                            {parsedValidProducts.slice(0, 5).map((p, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                                <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                                  {p.name}
                                </td>
                                <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                                  {p.genericName || "—"}
                                </td>
                                <td className="py-2 px-3 text-slate-500">
                                  {p.category || "Medicine"}
                                </td>
                                <td className="py-2 px-3 text-slate-500">
                                  {p.manufacturer || "—"}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                  ৳{Number(p.basePrice || 0).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFileName("");
                  setParsedValidProducts([]);
                  setParsedInvalidRows([]);
                }}
                className="h-10 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImportSubmitting || parsedValidProducts.length === 0}
                className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
              >
                {isImportSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Importing {parsedValidProducts.length} Products...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Import {parsedValidProducts.length > 0 ? `${parsedValidProducts.length} ` : ""}Products</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
