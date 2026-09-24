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
    requiresPrescription: false,
  });

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

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("inv_variants")}
            className="h-11 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold transition flex items-center gap-2"
          >
            <FolderTree className="h-4 w-4 text-brand-primary" />
            Manage Categories
          </button>
          <button
            onClick={() => onNavigate("inv_add_product")}
            className="h-11 px-5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Product
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
    </div>
  );
}
