"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Product, Category, Brand } from "@/types";
import {
  Package,
  Plus,
  Search,
  Barcode,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  SlidersHorizontal,
  X,
  BoxSelect,
} from "lucide-react";

interface ProductsModuleProps {
  subAction?: string;
}

export function ProductsModule({ subAction }: ProductsModuleProps = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [variantsModalOpen, setVariantsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Variant manager sub-tab: "categories" | "brands"
  const [variantTab, setVariantTab] = useState<"categories" | "brands">("categories");
  const [selectedParentIdForModal, setSelectedParentIdForModal] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [variantSaving, setVariantSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    genericName: "",
    sku: "",
    barcode: "",
    basePrice: 15,
    categoryId: "",
    subcategoryId: "",
    brandId: "",
    brandName: "",
    unit: "tablet",
    size: "500mg",
    defaultPackType: "BOX",
    stripsPerBox: 10,
    tabletsPerStrip: 10,
    shelfLocation: "Rack A-1",
    minStockAlert: 20,
    description: "",
    isControlled: false,
    requiresPrescription: false,
  });

  const loadVariants = async () => {
    try {
      const [catsRes, brandsRes] = await Promise.all([
        fetchApi("/products/variants/categories"),
        fetchApi("/products/variants/brands"),
      ]);
      if (catsRes.success && catsRes.data) {
        setCategories(catsRes.data);
        if (catsRes.data.length > 0 && !selectedParentIdForModal) {
          setSelectedParentIdForModal(catsRes.data[0].id);
        }
      }
      if (brandsRes.success && brandsRes.data) setBrands(brandsRes.data);
    } catch (err) {
      console.error("Failed to load variants", err);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "15");
      if (search) params.append("search", search);
      if (categoryFilter) params.append("categoryId", categoryFilter);
      if (subcategoryFilter) params.append("subcategoryId", subcategoryFilter);

      const res = await fetchApi(`/products?${params.toString()}`);
      if (res.success && res.data) {
        setProducts(res.data);
        if (res.meta) {
          setTotalPages(res.meta.totalPages || 1);
        }
      }
    } catch (err) {
      console.error("Failed to load products", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVariants();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [page, categoryFilter, subcategoryFilter]);

  // Handle subAction from sidebar
  useEffect(() => {
    if (subAction === "inventory:add_product") {
      handleOpenCreate();
    } else if (subAction === "inventory:variants") {
      setVariantsModalOpen(true);
      setModalOpen(false);
    } else if (subAction === "inventory:product_list") {
      setModalOpen(false);
      setVariantsModalOpen(false);
    }
  }, [subAction]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadProducts();
  };

  const selectedCategoryObj = categories.find((c) => c.id === formData.categoryId);
  const isMedicineCategory =
    !selectedCategoryObj ||
    selectedCategoryObj.name === "Medicine" ||
    selectedCategoryObj.name.toLowerCase().includes("med");

  const availableSubcategories = selectedCategoryObj?.subcategories || [];

  const handleCategoryChange = (catId: string) => {
    const selected = categories.find((c) => c.id === catId);
    if (!selected) return;

    let defaultUnit = "piece";
    let defaultSize = "Standard";
    let packType = "PIECE";
    let strips = 1;
    let tablets = 1;

    if (selected.name === "Medicine") {
      defaultUnit = "tablet";
      defaultSize = "500mg";
      packType = "BOX";
      strips = 10;
      tablets = 10;
    } else if (selected.name === "Syrup") {
      defaultUnit = "bottle";
      defaultSize = "100ml";
      packType = "BOTTLE";
    } else if (selected.name.includes("Saline")) {
      defaultUnit = "bag";
      defaultSize = "500ml";
      packType = "BAG";
    } else if (selected.name === "Medical Equipment") {
      defaultUnit = "piece";
      defaultSize = "Standard";
      packType = "PIECE";
    }

    setFormData((prev) => ({
      ...prev,
      categoryId: catId,
      subcategoryId: "",
      unit: defaultUnit,
      size: defaultSize,
      defaultPackType: packType,
      stripsPerBox: strips,
      tabletsPerStrip: tablets,
    }));
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    const defaultCat = categories[0];
    const defaultBrand = brands[0];

    setFormData({
      name: "",
      genericName: "",
      sku: "",
      barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      basePrice: 15,
      categoryId: defaultCat?.id || "",
      subcategoryId: "",
      brandId: defaultBrand?.id || "",
      brandName: defaultBrand?.name || "Square Pharmaceuticals",
      unit: "tablet",
      size: "500mg",
      defaultPackType: "BOX",
      stripsPerBox: 10,
      tabletsPerStrip: 10,
      shelfLocation: "Rack A-1",
      minStockAlert: 20,
      description: "",
      isControlled: false,
      requiresPrescription: false,
    });
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      genericName: p.genericName || "",
      sku: p.sku || "",
      barcode: p.barcode || "",
      basePrice: Number(p.basePrice),
      categoryId: p.categoryId || (categories.find((c) => c.name === p.category)?.id || ""),
      subcategoryId: p.subcategoryId || "",
      brandId: p.brandId || "",
      brandName: p.brandName || p.manufacturer || "",
      unit: p.unit || "piece",
      size: p.size || "",
      defaultPackType: p.defaultPackType || "BOX",
      stripsPerBox: p.stripsPerBox || 10,
      tabletsPerStrip: p.tabletsPerStrip || 10,
      shelfLocation: p.shelfLocation || "",
      minStockAlert: p.minStockAlert || 10,
      description: p.description || "",
      isControlled: Boolean(p.isControlled),
      requiresPrescription: Boolean(p.requiresPrescription),
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: formData.name.trim(),
        genericName: formData.genericName?.trim() || null,
        sku: formData.sku?.trim() || undefined,
        barcode: formData.barcode || null,
        basePrice: Number(formData.basePrice),
        categoryId: formData.categoryId || null,
        subcategoryId: formData.subcategoryId || null,
        brandId: formData.brandId || null,
        brandName: formData.brandName || null,
        manufacturer: formData.brandName || null,
        unit: formData.unit,
        size: formData.size || null,
        defaultPackType: formData.defaultPackType,
        stripsPerBox: isMedicineCategory ? Number(formData.stripsPerBox) : null,
        tabletsPerStrip: isMedicineCategory ? Number(formData.tabletsPerStrip) : null,
        shelfLocation: formData.shelfLocation || null,
        minStockAlert: Number(formData.minStockAlert),
        description: formData.description || null,
        isControlled: formData.isControlled,
        requiresPrescription: formData.requiresPrescription,
      };

      if (editingProduct) {
        const res = await fetchApi(`/products/${editingProduct.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        if (!res.success) throw new Error(res.message || "Failed to update product");
      } else {
        const res = await fetchApi("/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!res.success) throw new Error(res.message || "Failed to create product");
      }

      setModalOpen(false);
      loadProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete or deactivate "${name}"?`)) return;
    try {
      const res = await fetchApi(`/products/${id}`, { method: "DELETE" });
      if (res.success) {
        loadProducts();
      } else {
        alert(res.message || "Failed to delete product");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Add Subcategory Handler (in modal)
  const handleAddSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubcategoryName.trim() || !selectedParentIdForModal) return;
    try {
      setVariantSaving(true);
      const res = await fetchApi("/products/variants/categories", {
        method: "POST",
        body: JSON.stringify({
          name: newSubcategoryName.trim(),
          parentId: selectedParentIdForModal,
        }),
      });
      if (res.success) {
        setNewSubcategoryName("");
        loadVariants();
      } else {
        alert(res.message || "Failed to create subcategory");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setVariantSaving(false);
    }
  };

  // Add Brand Handler (in modal)
  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    try {
      setVariantSaving(true);
      const res = await fetchApi("/products/variants/brands", {
        method: "POST",
        body: JSON.stringify({
          name: newBrandName.trim(),
        }),
      });
      if (res.success) {
        setNewBrandName("");
        loadVariants();
      } else {
        alert(res.message || "Failed to create brand");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setVariantSaving(false);
    }
  };

  // For the filter bar: subcategories under currently selected category filter
  const filterCatObj = categories.find((c) => c.id === categoryFilter);
  const filterSubcategories = filterCatObj ? filterCatObj.subcategories || [] : [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="h-6 w-6 text-brand-primary" />
              Central Product Catalog
            </h1>
            <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
              Multi-Unit & FEFO Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage medicines, syrups, equipment, saline, and subcategories with multi-pack conversions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setVariantsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
            Categories & Subcategories
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:opacity-95 transition"
          >
            <Plus className="h-4 w-4" />
            Add New Product
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between">
        <form onSubmit={handleSearch} className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name, generic name, brand, barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-primary/20 outline-none dark:text-white"
          />
        </form>

        <div className="flex items-center gap-2.5">
          {/* Main Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setSubcategoryFilter("");
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-bold outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Subcategory Filter */}
          {filterSubcategories.length > 0 && (
            <select
              value={subcategoryFilter}
              onChange={(e) => {
                setSubcategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium outline-none animate-in fade-in"
            >
              <option value="">All Subcategories</option>
              {filterSubcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Product Catalog Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
            <p className="text-xs">Loading central product catalog...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Package className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No products found</p>
            <p className="text-xs mt-1">Get started by registering your first pharmacy medicine or equipment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3.5 px-4">Product Name & Generic</th>
                  <th className="py-3.5 px-4">Barcode / SKU</th>
                  <th className="py-3.5 px-4">Category & Subcategory</th>
                  <th className="py-3.5 px-4">Packaging Specs</th>
                  <th className="py-3.5 px-4">Base Selling Price</th>
                  <th className="py-3.5 px-4">Current Stock</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {products.map((p) => {
                  const isMed =
                    p.category === "Medicine" ||
                    p.categoryRef?.name === "Medicine" ||
                    p.productType === "MEDICINE";
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-sm shrink-0">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              {p.name}
                              {p.size && (
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] px-1.5 py-0.2 rounded font-semibold">
                                  {p.size}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {p.genericName ? (
                                <span className="font-semibold text-brand-primary">
                                  {p.genericName} •{" "}
                                </span>
                              ) : null}
                              {p.brandName || p.manufacturer || "Generic"} • {p.shelfLocation || "Unassigned rack"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-800 dark:text-slate-200 text-[11px]">{p.sku}</div>
                        {p.barcode && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Barcode className="h-3 w-3" />
                            {p.barcode}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block bg-brand-primary/10 text-brand-primary px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                          {p.categoryRef?.name || p.category || "Medicine"}
                        </span>
                        {(p.subcategoryRef?.name || p.subcategory) && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                            <span className="text-slate-400">›</span>
                            {p.subcategoryRef?.name || p.subcategory}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isMed && p.stripsPerBox && p.tabletsPerStrip ? (
                          <div className="text-[11px]">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              1 Box = {p.stripsPerBox} Strips
                            </span>
                            <div className="text-[10px] text-slate-400">
                              (1 Strip = {p.tabletsPerStrip} Tabs)
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-600 dark:text-slate-400">
                            Unit: <span className="font-bold text-slate-800 dark:text-slate-200">{p.unit}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          ৳{Number(p.basePrice).toFixed(2)}
                          <span className="text-[10px] font-normal text-slate-400"> / {p.unit}</span>
                        </div>
                        {p.hasBranchOverride && (
                          <div className="text-[10px] text-amber-600 font-bold">Branch override active</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {p.currentStock !== null && p.currentStock !== undefined ? (
                          <div>
                            <span
                              className={`font-bold ${
                                p.currentStock <= p.minStockAlert
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {p.currentStock} {p.unit}s
                            </span>
                            {p.currentStock <= p.minStockAlert && (
                              <div className="text-[10px] text-rose-500 font-medium">Low stock warning</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Select branch in inventory</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Edit Product"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                            title="Delete / Deactivate"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div>
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT PRODUCT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Package className="h-5 w-5 text-brand-primary" />
                  {editingProduct ? "Edit Product Specifications" : "Register New Pharmacy Product"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select main category, optional subcategory, and multi-unit pricing specifications.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              {/* Category & Subcategory Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Main Category *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subcategory (Optional)
                  </label>
                  <select
                    value={formData.subcategoryId}
                    onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">None / General</option>
                    {availableSubcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Napa Extra, Seclo, Ciprocin, ORS"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Generic Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paracetamol + Caffeine"
                    value={formData.genericName}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
              </div>

              {/* Strength/Size & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Strength / Size
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 500mg, 100ml, Standard"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Brand / Manufacturer
                  </label>
                  <select
                    value={formData.brandId}
                    onChange={(e) => {
                      const sel = brands.find((b) => b.id === e.target.value);
                      setFormData({
                        ...formData,
                        brandId: e.target.value,
                        brandName: sel ? sel.name : formData.brandName,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">Select Brand</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Barcode & Shelf */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Barcode</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
                        })
                      }
                      className="text-[10px] text-brand-primary hover:underline font-normal"
                    >
                      Generate Barcode
                    </button>
                  </label>
                  <input
                    type="text"
                    placeholder="Scan or enter barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Shelf / Rack Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rack A-1, Fridge 2"
                    value={formData.shelfLocation}
                    onChange={(e) => setFormData({ ...formData, shelfLocation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Packaging Multipliers for Medicine vs Standard Unit for others */}
              {isMedicineCategory ? (
                <div className="p-3.5 bg-brand-primary/5 border border-brand-primary/15 rounded-2xl space-y-3">
                  <div className="text-xs font-bold text-brand-primary flex items-center gap-1.5">
                    <BoxSelect className="h-4 w-4" />
                    Medicine Packaging Hierarchy (Carton → Box → Strip → Tablet)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Strips per Box
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.stripsPerBox}
                        onChange={(e) =>
                          setFormData({ ...formData, stripsPerBox: parseInt(e.target.value, 10) || 1 })
                        }
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Tablets per Strip
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.tabletsPerStrip}
                        onChange={(e) =>
                          setFormData({ ...formData, tabletsPerStrip: parseInt(e.target.value, 10) || 1 })
                        }
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Lowest Sellable Unit
                      </label>
                      <input
                        type="text"
                        disabled
                        value="tablet"
                        className="w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 font-bold"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Calculated: 1 Box = {formData.stripsPerBox} Strips ={" "}
                    {(formData.stripsPerBox || 1) * (formData.tabletsPerStrip || 1)} Tablets.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Selling Unit
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. bottle, bag, piece"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Pack Type
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BOTTLE, BAG, PIECE"
                      value={formData.defaultPackType}
                      onChange={(e) => setFormData({ ...formData, defaultPackType: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none uppercase font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Price & Stock Alert */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Selling Price (per lowest unit) ৳ *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Min Stock Threshold Alert
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minStockAlert}
                    onChange={(e) =>
                      setFormData({ ...formData, minStockAlert: parseInt(e.target.value, 10) || 10 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Prescription / Controlled Toggles */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requiresPrescription}
                    onChange={(e) => setFormData({ ...formData, requiresPrescription: e.target.checked })}
                    className="rounded text-brand-primary"
                  />
                  <span>Requires Doctor's Prescription</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isControlled}
                    onChange={(e) => setFormData({ ...formData, isControlled: e.target.checked })}
                    className="rounded text-amber-600"
                  />
                  <span>Controlled Substance / Narcotics (Requires Manager Authorization at POS)</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-brand-primary text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm hover:opacity-95 disabled:opacity-50 transition"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingProduct ? "Update Product" : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE CATEGORIES & BRANDS MODAL */}
      {variantsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-brand-primary" />
                  Categories & Taxonomy
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage subcategories under the 5 standard Main Categories and pharmaceutical brands.
                </p>
              </div>
              <button
                onClick={() => setVariantsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sub Tabs */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 mt-4 mb-4">
              <button
                onClick={() => setVariantTab("categories")}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition ${
                  variantTab === "categories"
                    ? "border-brand-primary text-brand-primary"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                Categories & Subcategories ({categories.length})
              </button>
              <button
                onClick={() => setVariantTab("brands")}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition ${
                  variantTab === "brands"
                    ? "border-brand-primary text-brand-primary"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                Brands / Manufacturers ({brands.length})
              </button>
            </div>

            {variantTab === "categories" ? (
              <div className="space-y-4">
                <form onSubmit={handleAddSubcategory} className="flex flex-col sm:flex-row gap-2 items-stretch">
                  <select
                    value={selectedParentIdForModal}
                    onChange={(e) => setSelectedParentIdForModal(e.target.value)}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="Subcategory name (e.g. Antibiotics)"
                    value={newSubcategoryName}
                    onChange={(e) => setNewSubcategoryName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white outline-none"
                  />
                  <button
                    type="submit"
                    disabled={variantSaving || !selectedParentIdForModal}
                    className="bg-brand-primary text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                  >
                    Add Subcategory
                  </button>
                </form>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {categories.map((mainCat) => (
                    <div
                      key={mainCat.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80"
                    >
                      <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                        <span>{mainCat.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {mainCat.subcategories?.length || 0} subcategories
                        </span>
                      </div>
                      {mainCat.subcategories && mainCat.subcategories.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {mainCat.subcategories.map((sub) => (
                            <span
                              key={sub.id}
                              className="text-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-md font-medium text-slate-700 dark:text-slate-300"
                            >
                              {sub.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <form onSubmit={handleAddBrand} className="flex gap-2 items-center">
                  <input
                    type="text"
                    required
                    placeholder="New brand name (e.g. Beximco, Square, Incepta)"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white outline-none"
                  />
                  <button
                    type="submit"
                    disabled={variantSaving}
                    className="bg-brand-primary text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:opacity-90 disabled:opacity-50"
                  >
                    Add Brand
                  </button>
                </form>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                  {brands.map((b) => (
                    <div key={b.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{b.name}</div>
                      </div>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-bold text-slate-500">
                        {b._count?.products || 0} products
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
