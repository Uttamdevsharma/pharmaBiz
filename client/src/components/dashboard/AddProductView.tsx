"use client";

import React, { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { Product, Category, Brand } from "@/types";
import {
  Package,
  ArrowLeft,
  Barcode,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  ShieldAlert,
  Sparkles,
  Plus,
  X,
  Building,
  FolderTree,
} from "lucide-react";
import { ImageUploader } from "@/components/common/ImageUploader";

interface AddProductViewProps {
  editingProduct?: Product | null;
  onNavigate: (module: any) => void;
  onClearEditing?: () => void;
}

export function AddProductView({
  editingProduct,
  onNavigate,
  onClearEditing,
}: AddProductViewProps) {
  const isEditing = Boolean(editingProduct);

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Quick Subcategory Modal
  const [quickSubModalOpen, setQuickSubModalOpen] = useState(false);
  const [quickSubName, setQuickSubName] = useState("");
  const [quickSubUnit, setQuickSubUnit] = useState("tablet");
  const [quickSubSaving, setQuickSubSaving] = useState(false);

  // Quick Brand Modal
  const [quickBrandModalOpen, setQuickBrandModalOpen] = useState(false);
  const [quickBrandName, setQuickBrandName] = useState("");
  const [quickBrandSaving, setQuickBrandSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: editingProduct?.name || "",
    genericName: editingProduct?.genericName || "",
    sku: editingProduct?.sku || "",
    barcode: editingProduct?.barcode || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
    basePrice: editingProduct?.basePrice ? Number(editingProduct.basePrice) : 15,
    categoryId: editingProduct?.categoryId || "",
    subcategoryId: editingProduct?.subcategoryId || "",
    brandId: editingProduct?.brandId || "",
    brandName: editingProduct?.brandName || "",
    unit: editingProduct?.unit || "tablet",
    size: editingProduct?.size || "500mg",
    defaultPackType: editingProduct?.defaultPackType || "BOX",
    stripsPerBox: editingProduct?.stripsPerBox || 10,
    tabletsPerStrip: editingProduct?.tabletsPerStrip || 10,
    shelfLocation: editingProduct?.shelfLocation || "Rack A-1",
    minStockAlert: editingProduct?.minStockAlert || 20,
    description: editingProduct?.description || "",
    imageUrl: editingProduct?.imageUrl || "",
    isControlled: Boolean(editingProduct?.isControlled),
    requiresPrescription: Boolean(editingProduct?.requiresPrescription),
  });

  const loadVariants = async () => {
    try {
      setLoadingVariants(true);
      const [catsRes, brandsRes] = await Promise.all([
        fetchApi("/products/variants/categories"),
        fetchApi("/products/variants/brands"),
      ]);
      if (catsRes.success && catsRes.data) {
        setCategories(catsRes.data);
        if (!formData.categoryId && catsRes.data.length > 0) {
          const defaultCat = catsRes.data.find((c: Category) => c.name === "Medicine") || catsRes.data[0];
          setFormData((prev) => ({ ...prev, categoryId: defaultCat.id }));
        }
      }
      if (brandsRes.success && brandsRes.data) {
        setBrands(brandsRes.data);
        if (!formData.brandId && brandsRes.data.length > 0) {
          setFormData((prev) => ({
            ...prev,
            brandId: brandsRes.data[0].id,
            brandName: brandsRes.data[0].name,
          }));
        }
      }
    } catch (err) {
      console.error("Failed to load catalog variants", err);
    } finally {
      setLoadingVariants(false);
    }
  };

  useEffect(() => {
    loadVariants();
  }, []);

  const selectedCategoryObj = categories.find((c) => c.id === formData.categoryId);
  const isMedicineCategory =
    !selectedCategoryObj ||
    selectedCategoryObj.name === "Medicine" ||
    selectedCategoryObj.name.toLowerCase().includes("med");

  const availableSubcategories = selectedCategoryObj?.subcategories || [];

  const handleCategoryChange = (catId: string) => {
    const selectedCat = categories.find((c) => c.id === catId);
    if (!selectedCat) return;

    let defaultUnit = "piece";
    let defaultSize = "Standard";
    let packType = "PIECE";
    let strips = 1;
    let tablets = 1;

    if (selectedCat.name === "Medicine") {
      defaultUnit = "tablet";
      defaultSize = "500mg";
      packType = "BOX";
      strips = 10;
      tablets = 10;
    } else if (selectedCat.name === "Syrup") {
      defaultUnit = "bottle";
      defaultSize = "100ml";
      packType = "BOTTLE";
    } else if (selectedCat.name.includes("Saline")) {
      defaultUnit = "bag";
      defaultSize = "500ml";
      packType = "BAG";
    } else if (selectedCat.name === "Medical Equipment") {
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

  const handleBrandChange = (bId: string) => {
    const b = brands.find((brand) => brand.id === bId);
    setFormData((prev) => ({
      ...prev,
      brandId: bId,
      brandName: b ? b.name : "",
    }));
  };

  const handleQuickCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSubName.trim() || !formData.categoryId) return;
    try {
      setQuickSubSaving(true);
      const res = await fetchApi("/products/variants/categories", {
        method: "POST",
        body: JSON.stringify({
          name: quickSubName.trim(),
          parentId: formData.categoryId,
          defaultUnit: quickSubUnit.trim() || null,
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to create subcategory");

      const createdSub = res.data;
      await loadVariants();
      setFormData((prev) => ({ ...prev, subcategoryId: createdSub?.id || "" }));
      setQuickSubModalOpen(false);
      setQuickSubName("");
    } catch (err: any) {
      alert(err.message || "Failed to create subcategory");
    } finally {
      setQuickSubSaving(false);
    }
  };

  const handleQuickCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBrandName.trim()) return;
    try {
      setQuickBrandSaving(true);
      const res = await fetchApi("/products/variants/brands", {
        method: "POST",
        body: JSON.stringify({
          name: quickBrandName.trim(),
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to create brand");

      const createdBrand = res.data;
      await loadVariants();
      setFormData((prev) => ({
        ...prev,
        brandId: createdBrand?.id || "",
        brandName: createdBrand?.name || quickBrandName.trim(),
      }));
      setQuickBrandModalOpen(false);
      setQuickBrandName("");
    } catch (err: any) {
      alert(err.message || "Failed to create brand");
    } finally {
      setQuickBrandSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

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
        imageUrl: formData.imageUrl || null,
        isControlled: formData.isControlled,
        requiresPrescription: formData.requiresPrescription,
      };

      const url = isEditing ? `/products/${editingProduct?.id}` : "/products";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetchApi(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to save product");
      }

      setSuccess(true);
      if (onClearEditing) onClearEditing();

      // Auto redirect to Product List after 1.2s
      setTimeout(() => {
        onNavigate("inv_product_list");
      }, 1200);
    } catch (err: any) {
      setError(err.message || "An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  const handleResetForNew = () => {
    setSuccess(false);
    setError(null);
    if (onClearEditing) onClearEditing();
    const defaultCat = categories.find((c) => c.name === "Medicine") || categories[0];
    setFormData({
      name: "",
      genericName: "",
      sku: "",
      barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      basePrice: 15,
      categoryId: defaultCat?.id || "",
      subcategoryId: "",
      brandId: brands[0]?.id || "",
      brandName: brands[0]?.name || "",
      unit: "tablet",
      size: "500mg",
      defaultPackType: "BOX",
      stripsPerBox: 10,
      tabletsPerStrip: 10,
      shelfLocation: "Rack A-1",
      minStockAlert: 20,
      description: "",
      imageUrl: "",
      isControlled: false,
      requiresPrescription: false,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Inventory</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">
              {isEditing ? "Edit Product" : "Add Product"}
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="h-6 w-6 text-brand-primary" />
            {isEditing ? `Edit Product: ${editingProduct?.name}` : "Create New Catalog Product"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure pharmaceutical specifications, Main Category classification, optional subcategory, and pricing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate("inv_product_list")}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Product List
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-xs text-emerald-900 dark:text-emerald-200">
                Product saved successfully!
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Redirecting to Product List...
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetForNew}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Add Another Product
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-300 text-xs">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Full-Page Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Basic Formulation */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Package className="h-4 w-4 text-brand-primary" />
            1. Product Formulation & Brand Identity
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Product Brand Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Napa Extra, Seclo 20, Ciprocin, ORS"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Generic Name (Active Ingredient)
              </label>
              <input
                type="text"
                placeholder="e.g. Paracetamol + Caffeine, Omeprazole Magnesium"
                value={formData.genericName}
                onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Strength / Size (e.g. 500mg, 20mg, 100ml, 500ml)
              </label>
              <input
                type="text"
                placeholder="e.g. 500mg + 65mg, 100ml, Standard"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Barcode (EAN-13 / UPC / Custom)</span>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
                    })
                  }
                  className="text-[11px] text-brand-primary hover:underline font-bold"
                >
                  Generate Barcode
                </button>
              </label>
              <div className="relative">
                <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Scan or enter barcode number"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20 font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Category Hierarchy & Pricing */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Layers className="h-4 w-4 text-brand-primary" />
            2. Main Category, Subcategory, Manufacturer & Base Pricing
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Main Category *
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20 font-bold"
              >
                <option value="">-- Choose Main Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Subcategory (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const parent = categories.find((c) => c.id === formData.categoryId);
                    if (parent) {
                      if (parent.name === "Medicine") setQuickSubUnit("tablet");
                      else if (parent.name === "Syrup") setQuickSubUnit("bottle");
                      else if (parent.name === "Medical Equipment") setQuickSubUnit("piece");
                      else if (parent.name.includes("Saline")) setQuickSubUnit("bag");
                      else setQuickSubUnit("piece");
                    }
                    setQuickSubModalOpen(true);
                  }}
                  className="text-[11px] text-brand-primary hover:underline font-bold flex items-center gap-0.5"
                >
                  <Plus className="h-3 w-3" />
                  New
                </button>
              </div>
              <select
                value={formData.subcategoryId}
                onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20 font-bold"
              >
                <option value="">-- None / General --</option>
                {availableSubcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Brand / Manufacturer
                </label>
                <button
                  type="button"
                  onClick={() => setQuickBrandModalOpen(true)}
                  className="text-[11px] text-brand-primary hover:underline font-bold flex items-center gap-0.5"
                >
                  <Plus className="h-3 w-3" />
                  New
                </button>
              </div>
              <select
                value={formData.brandId}
                onChange={(e) => handleBrandChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20 font-bold"
              >
                <option value="">-- Choose Brand --</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Base Selling Price (per {formData.unit}) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  ৳
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Multi-Unit Packaging (If Medicine) */}
        {isMedicineCategory ? (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="font-black text-sm text-slate-900 dark:text-white flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4 text-brand-primary" />
                3. Packaging & Dispensing Units (Box → Strip → Tablet)
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Medicine Packaging Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Default Sales Unit
                </label>
                <select
                  value={formData.defaultPackType}
                  onChange={(e) => setFormData({ ...formData, defaultPackType: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-bold outline-none"
                >
                  <option value="BOX">Full Box</option>
                  <option value="STRIP">Strip / Pouch</option>
                  <option value="TABLET">Individual Tablet / Capsule</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Strips per Box
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.stripsPerBox}
                  onChange={(e) =>
                    setFormData({ ...formData, stripsPerBox: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tablets / Capsules per Strip
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.tabletsPerStrip}
                  onChange={(e) =>
                    setFormData({ ...formData, tabletsPerStrip: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-400">
              💡 <strong>Automatic Multiplier:</strong> 1 Box = {formData.stripsPerBox} Strips ={" "}
              {formData.stripsPerBox * formData.tabletsPerStrip} Tablets. Inwarding and POS calculations will automatically convert between Boxes, Strips, and Tablets.
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="font-black text-sm text-slate-900 dark:text-white flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4 text-brand-primary" />
                3. Dispensing Unit & Packaging
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {selectedCategoryObj?.name || "Standard Item"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Sales Dispensing Unit
                </label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g. bottle, piece, bag, pack, set"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Package Type
                </label>
                <select
                  value={formData.defaultPackType}
                  onChange={(e) => setFormData({ ...formData, defaultPackType: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                >
                  <option value="PIECE">Single Piece</option>
                  <option value="BOTTLE">Bottle</option>
                  <option value="BAG">Infusion Bag</option>
                  <option value="BOX">Box / Carton</option>
                  <option value="PACK">Pack / Tin</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Storage, Clinical Flags & Alerts */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <ShieldAlert className="h-4 w-4 text-brand-primary" />
            4. Storage Location, Minimum Threshold & Clinical Alerts
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Shelf / Rack Location
              </label>
              <input
                type="text"
                placeholder="e.g. Rack A-1, Cold Storage, Drawer B-3"
                value={formData.shelfLocation}
                onChange={(e) => setFormData({ ...formData, shelfLocation: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Low Stock Alert Threshold ({formData.unit}s)
              </label>
              <input
                type="number"
                min="1"
                value={formData.minStockAlert}
                onChange={(e) =>
                  setFormData({ ...formData, minStockAlert: parseInt(e.target.value) || 10 })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
          </div>

          {/* Clinical Switches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <label className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-100 transition">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Requires Doctor Prescription (Rx)
                </div>
                <div className="text-[10px] text-slate-400">
                  Cashiers must verify prescription details during POS billing
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.requiresPrescription}
                onChange={(e) => setFormData({ ...formData, requiresPrescription: e.target.checked })}
                className="h-4 w-4 text-brand-primary rounded"
              />
            </label>

            <label className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-100 transition">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Controlled Substance (Narcotics / Sedatives)
                </div>
                <div className="text-[10px] text-slate-400">
                  Requires Manager PIN approval & doctor verification at counter
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.isControlled}
                onChange={(e) => setFormData({ ...formData, isControlled: e.target.checked })}
                className="h-4 w-4 text-brand-primary rounded"
              />
            </label>
          </div>

          {/* Image Uploader */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Product Image
            </label>
            <ImageUploader
              value={formData.imageUrl}
              onChange={(data) => setFormData({ ...formData, imageUrl: data ? data.url : "" })}
              folder="pharmacy_products"
              label="Upload Product Packaging Photo"
            />
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigate("inv_product_list")}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving Product...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEditing ? "Update Product" : "Save Product"}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick Add Subcategory Modal */}
      {quickSubModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-brand-primary" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Add Subcategory under {selectedCategoryObj?.name || "Selected Category"}
                </h3>
              </div>
              <button
                onClick={() => setQuickSubModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateSubcategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subcategory Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Antibiotics, Antipyretics, Eye Drops"
                  value={quickSubName}
                  onChange={(e) => setQuickSubName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Default Unit (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. tablet, capsule, bottle, bag, piece"
                  value={quickSubUnit}
                  onChange={(e) => setQuickSubUnit(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickSubModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickSubSaving || !quickSubName.trim()}
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {quickSubSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Create & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Brand Modal */}
      {quickBrandModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-brand-primary" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Add Brand / Manufacturer
                </h3>
              </div>
              <button
                onClick={() => setQuickBrandModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateBrand} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Brand / Manufacturer Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Beximco, Square Pharma, Incepta"
                  value={quickBrandName}
                  onChange={(e) => setQuickBrandName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickBrandModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickBrandSaving || !quickBrandName.trim()}
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {quickBrandSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Create & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
