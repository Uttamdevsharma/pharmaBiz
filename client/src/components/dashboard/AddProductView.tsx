"use client";

import React, { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { Product, Category } from "@/types";
import { showAlert } from "@/lib/swal";
import {
  Package,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Edit2,
  Lock,
  Pill,
  Droplets,
  Syringe,
  Sparkles,
  Plus,
  X,
  FolderTree,
} from "lucide-react";

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
  const [loadingVariants, setLoadingVariants] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  type PackagingModel = "TABLET" | "BOTTLE" | "PIECE" | "VIAL";

  const [packagingType, setPackagingType] = useState<PackagingModel>("TABLET");
  const [itemsPerBox, setItemsPerBox] = useState<number>(10);
  const [isPackagingEditing, setIsPackagingEditing] = useState(true);

  // Quick Subcategory Modal
  const [quickSubModalOpen, setQuickSubModalOpen] = useState(false);
  const [quickSubName, setQuickSubName] = useState("");
  const [quickSubSaving, setQuickSubSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: editingProduct?.name || "",
    genericName: editingProduct?.genericName || "",
    sku: editingProduct?.sku || "",
    barcode: editingProduct?.barcode || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
    basePrice: editingProduct?.basePrice ? Number(editingProduct.basePrice) : 0,
    categoryId: editingProduct?.categoryId || "",
    subcategoryId: editingProduct?.subcategoryId || "",
    brandId: editingProduct?.brandId || "",
    brandName: editingProduct?.brandName || "",
    unit: editingProduct?.unit || "tablet",
    size: editingProduct?.size || "500mg",
    defaultPackType: "BOX",
    stripsPerBox: editingProduct?.stripsPerBox || 10,
    tabletsPerStrip: editingProduct?.tabletsPerStrip || 10,
    description: editingProduct?.description || "",
    requiresPrescription: Boolean(editingProduct?.requiresPrescription),
  });

  const loadVariants = async () => {
    try {
      setLoadingVariants(true);
      const catsRes = await fetchApi("/products/variants/categories");
      if (catsRes.success && catsRes.data) {
        setCategories(catsRes.data);
        if (!formData.categoryId && catsRes.data.length > 0) {
          const defaultCat = catsRes.data[0];
          setFormData((prev) => ({ ...prev, categoryId: defaultCat.id }));
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

  useEffect(() => {
    if (editingProduct) {
      const u = editingProduct.unit?.toLowerCase() || "";
      const p = editingProduct.defaultPackType?.toUpperCase() || "";
      if (u === "bottle" || p === "BOTTLE") {
        setPackagingType("BOTTLE");
        setItemsPerBox(editingProduct.stripsPerBox || 12);
      } else if (u === "vial" || u === "ampoule") {
        setPackagingType("VIAL");
        setItemsPerBox(editingProduct.stripsPerBox || 10);
      } else if (u === "piece" || u === "pack" || p === "PIECE") {
        setPackagingType("PIECE");
        setItemsPerBox(editingProduct.stripsPerBox || 1);
      } else {
        setPackagingType("TABLET");
      }
    }
  }, [editingProduct]);

  const selectedCategoryObj = categories.find((c) => c.id === formData.categoryId);
  const availableSubcategories = selectedCategoryObj?.subcategories || [];

  const handleCategoryChange = (catId: string) => {
    const selectedCat = categories.find((c) => c.id === catId);
    if (!selectedCat) return;

    const lowerName = selectedCat.name.toLowerCase();
    let detectedType: PackagingModel = "TABLET";
    let defaultUnit = "tablet";
    let defaultSize = "500mg";
    let packType = "BOX";
    let strips = 10;
    let tablets = 10;
    let items = 10;

    if (
      lowerName.includes("syrup") ||
      lowerName.includes("liquid") ||
      lowerName.includes("suspension") ||
      lowerName.includes("drop") ||
      lowerName.includes("tonic")
    ) {
      detectedType = "BOTTLE";
      defaultUnit = "bottle";
      defaultSize = "100ml";
      packType = "BOTTLE";
      items = 12;
      strips = 12;
      tablets = 1;
    } else if (
      lowerName.includes("inject") ||
      lowerName.includes("vial") ||
      lowerName.includes("ampoule") ||
      lowerName.includes("saline") ||
      lowerName.includes("infusion")
    ) {
      detectedType = "VIAL";
      defaultUnit = "vial";
      defaultSize = "1g";
      packType = "BOX";
      items = 10;
      strips = 10;
      tablets = 1;
    } else if (
      lowerName.includes("equip") ||
      lowerName.includes("device") ||
      lowerName.includes("care") ||
      lowerName.includes("diaper") ||
      lowerName.includes("surgical") ||
      lowerName.includes("essential") ||
      lowerName.includes("hygiene")
    ) {
      detectedType = "PIECE";
      defaultUnit = "piece";
      defaultSize = "Standard";
      packType = "PIECE";
      items = 1;
      strips = 1;
      tablets = 1;
    } else {
      detectedType = "TABLET";
      defaultUnit = "tablet";
      defaultSize = "500mg";
      packType = "BOX";
      strips = 10;
      tablets = 10;
      items = 10;
    }

    setPackagingType(detectedType);
    setItemsPerBox(items);
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

  const handleSelectPackagingType = (type: PackagingModel) => {
    setPackagingType(type);
    if (type === "TABLET") {
      setFormData((prev) => ({
        ...prev,
        unit: "tablet",
        defaultPackType: "BOX",
        size: prev.size && !prev.size.includes("ml") && prev.size !== "Standard" ? prev.size : "500mg",
        stripsPerBox: prev.stripsPerBox || 10,
        tabletsPerStrip: prev.tabletsPerStrip || 10,
      }));
    } else if (type === "BOTTLE") {
      const bItems = itemsPerBox && itemsPerBox > 1 ? itemsPerBox : 12;
      setItemsPerBox(bItems);
      setFormData((prev) => ({
        ...prev,
        unit: "bottle",
        defaultPackType: "BOTTLE",
        size: prev.size && prev.size.includes("ml") ? prev.size : "100ml",
        stripsPerBox: bItems,
        tabletsPerStrip: 1,
      }));
    } else if (type === "PIECE") {
      const pItems = itemsPerBox && itemsPerBox > 0 ? itemsPerBox : 1;
      setItemsPerBox(pItems);
      setFormData((prev) => ({
        ...prev,
        unit: "piece",
        defaultPackType: "PIECE",
        size: "Standard",
        stripsPerBox: pItems,
        tabletsPerStrip: 1,
      }));
    } else if (type === "VIAL") {
      const vItems = itemsPerBox && itemsPerBox > 1 ? itemsPerBox : 10;
      setItemsPerBox(vItems);
      setFormData((prev) => ({
        ...prev,
        unit: "vial",
        defaultPackType: "BOX",
        size: prev.size && (prev.size.includes("g") || prev.size.includes("ml")) ? prev.size : "1g",
        stripsPerBox: vItems,
        tabletsPerStrip: 1,
      }));
    }
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const isTablet = packagingType === "TABLET";
      const isBottle = packagingType === "BOTTLE";
      const isPiece = packagingType === "PIECE";
      const isVial = packagingType === "VIAL";

      let finalUnit = "tablet";
      let defaultPackType = "BOX";
      let strips = Number(formData.stripsPerBox) || 10;
      let tablets = Number(formData.tabletsPerStrip) || 10;

      if (isTablet) {
        finalUnit = formData.unit || "tablet";
        defaultPackType = "BOX";
        strips = Number(formData.stripsPerBox) || 10;
        tablets = Number(formData.tabletsPerStrip) || 10;
      } else if (isBottle) {
        finalUnit = "bottle";
        defaultPackType = "BOTTLE";
        strips = Number(itemsPerBox) || 1;
        tablets = 1;
      } else if (isPiece) {
        finalUnit = formData.unit || "piece";
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
        name: formData.name.trim(),
        genericName: formData.genericName?.trim() || null,
        sku: formData.sku?.trim() || undefined,
        barcode: formData.barcode || null,
        basePrice: Number(formData.basePrice) || 0,
        categoryId: formData.categoryId || null,
        subcategoryId: formData.subcategoryId || null,
        brandId: formData.brandId || null,
        brandName: formData.brandName || null,
        manufacturer: formData.brandName || null,
        unit: finalUnit,
        size: formData.size || null,
        defaultPackType,
        qtyPerLevel2: isBottle ? (Number(itemsPerBox) || 12) : 10,
        stripsPerBox: strips,
        tabletsPerStrip: tablets,
        qtyPerLevel3: strips,
        qtyPerLevel4: tablets,
        description: formData.description || null,
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
      await showAlert.success(
        isEditing ? "Product Updated!" : "Product Created Successfully!",
        `Product "${formData.name}" has been saved to your inventory.`,
        { timer: 2000 }
      );

      if (onClearEditing) onClearEditing();
      onNavigate("inv_product_list");
    } catch (err: any) {
      const msg = err.message || "An error occurred while saving";
      setError(msg);
      showAlert.error("Save Failed", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleResetForNew = () => {
    setSuccess(false);
    setError(null);
    if (onClearEditing) onClearEditing();
    setPackagingType("TABLET");
    setItemsPerBox(10);
    const defaultCat = categories[0];
    setFormData({
      name: "",
      genericName: "",
      sku: "",
      barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      basePrice: 0,
      categoryId: defaultCat?.id || "",
      subcategoryId: "",
      brandId: "",
      brandName: "",
      unit: "tablet",
      size: "500mg",
      defaultPackType: "BOX",
      stripsPerBox: 10,
      tabletsPerStrip: 10,
      description: "",
      requiresPrescription: false,
    });
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-1">
            <span>Inventory</span>
            <span>/</span>
            <span className="text-brand-primary">
              {isEditing ? "Edit Product" : "Add Product"}
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Package className="h-7 w-7 text-brand-primary" />
            {isEditing ? `Edit Product: ${editingProduct?.name}` : "Create New Catalog Product"}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate("inv_product_list")}
            className="h-11 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold transition flex items-center gap-2"
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
      <form onSubmit={handleSave} className="space-y-6 w-full">
        {/* Section 1: Basic Formulation */}
        <div className="bg-white dark:bg-slate-900 p-6 lg:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Package className="h-5 w-5 text-brand-primary" />
            1. Product Formulation & Brand Identity
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                Product Brand Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Napa Extra, Seclo 20, Ciprocin, ORS"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-12 px-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white outline-none focus:border-brand-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                Generic Name (Active Ingredient)
              </label>
              <input
                type="text"
                placeholder="e.g. Paracetamol + Caffeine, Omeprazole Magnesium"
                value={formData.genericName}
                onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                className="w-full h-12 px-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white outline-none focus:border-brand-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                Strength / Size (e.g. 500mg, 20mg, 100ml, 500ml)
              </label>
              <input
                type="text"
                placeholder="e.g. 500mg + 65mg, 100ml, Standard"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full h-12 px-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white outline-none focus:border-brand-primary"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Main Category & Subcategory */}
        <div className="bg-white dark:bg-slate-900 p-6 lg:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Layers className="h-5 w-5 text-brand-primary" />
            2. Main Category & Subcategory
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                Main Category *
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full h-12 px-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white outline-none focus:border-brand-primary"
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
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Subcategory (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => setQuickSubModalOpen(true)}
                  className="text-xs text-brand-primary hover:underline font-bold flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New
                </button>
              </div>
              <select
                value={formData.subcategoryId}
                onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
                className="w-full h-12 px-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white outline-none focus:border-brand-primary"
              >
                <option value="">-- None / General --</option>
                {availableSubcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Packaging & Dispensing Units */}
        <div className="bg-white dark:bg-slate-900 p-6 lg:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="font-black text-base text-slate-900 dark:text-white flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-2">
              <Package className="h-5 w-5 text-brand-primary" />
              3. Packaging & Dispensing Units
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {packagingType === "TABLET"
                  ? `Full Box • ${formData.stripsPerBox || 10} Strips per Box • ${formData.tabletsPerStrip || 10} Tablets per Strip`
                  : packagingType === "BOTTLE"
                  ? `${itemsPerBox > 1 ? `1 Carton = ${itemsPerBox} Bottles` : "Single Bottle"}`
                  : packagingType === "VIAL"
                  ? `1 Box = ${itemsPerBox} Vials / Ampoules`
                  : `${itemsPerBox > 1 ? `1 Box/Pack = ${itemsPerBox} Pieces` : "Single Piece / Unit"}`}
              </span>
              <button
                type="button"
                onClick={() => setIsPackagingEditing(!isPackagingEditing)}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 border shadow-xs ${
                  isPackagingEditing
                    ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700"
                }`}
              >
                {isPackagingEditing ? (
                  <>
                    <Lock className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                    <span>Lock Config</span>
                  </>
                ) : (
                  <>
                    <Edit2 className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                    <span>Edit Packaging</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Packaging Form Type Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Select Packaging Model / Form *
              </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Option 1: Strip & Tablet */}
              <button
                type="button"
                disabled={!isPackagingEditing}
                onClick={() => handleSelectPackagingType("TABLET")}
                className={`p-3.5 rounded-xl border-2 text-left transition flex flex-col gap-1 disabled:opacity-80 ${
                  packagingType === "TABLET"
                    ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-sm">
                    <Pill className="h-4 w-4 text-emerald-600" />
                    <span>Strip & Tablet</span>
                  </div>
                  {packagingType === "TABLET" && (
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  )}
                </div>
              </button>

              {/* Option 2: Bottle / Liquid */}
              <button
                type="button"
                disabled={!isPackagingEditing}
                onClick={() => handleSelectPackagingType("BOTTLE")}
                className={`p-3.5 rounded-xl border-2 text-left transition flex flex-col gap-1 disabled:opacity-80 ${
                  packagingType === "BOTTLE"
                    ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 text-blue-950 dark:text-blue-200 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-sm">
                    <Droplets className="h-4 w-4 text-blue-600" />
                    <span>Bottle / Liquid</span>
                  </div>
                  {packagingType === "BOTTLE" && (
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  )}
                </div>
              </button>

              {/* Option 3: Piece / Equipment */}
              <button
                type="button"
                disabled={!isPackagingEditing}
                onClick={() => handleSelectPackagingType("PIECE")}
                className={`p-3.5 rounded-xl border-2 text-left transition flex flex-col gap-1 disabled:opacity-80 ${
                  packagingType === "PIECE"
                    ? "bg-purple-50/70 dark:bg-purple-950/30 border-purple-500 text-purple-950 dark:text-purple-200 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-sm">
                    <Package className="h-4 w-4 text-purple-600" />
                    <span>Piece / Unit</span>
                  </div>
                  {packagingType === "PIECE" && (
                    <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                  )}
                </div>
              </button>

              {/* Option 4: Vial / Injection */}
              <button
                type="button"
                disabled={!isPackagingEditing}
                onClick={() => handleSelectPackagingType("VIAL")}
                className={`p-3.5 rounded-xl border-2 text-left transition flex flex-col gap-1 disabled:opacity-80 ${
                  packagingType === "VIAL"
                    ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-500 text-amber-950 dark:text-amber-200 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-sm">
                    <Syringe className="h-4 w-4 text-amber-600" />
                    <span>Injection / Vial</span>
                  </div>
                  {packagingType === "VIAL" && (
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Dynamic Unit Inputs by Packaging Type */}
          {packagingType === "TABLET" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Default Sales Unit
                </label>
                <div className="w-full h-12 px-4 bg-slate-100 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base text-slate-800 dark:text-slate-200 font-bold flex items-center justify-between">
                  <span>Full Box</span>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/50 rounded-full">
                    Box / Strip / Tablet
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Strips per Box *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  disabled={!isPackagingEditing}
                  value={formData.stripsPerBox}
                  onChange={(e) =>
                    setFormData({ ...formData, stripsPerBox: parseInt(e.target.value) || 1 })
                  }
                  className="w-full h-12 px-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white outline-none focus:border-brand-primary disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800/40"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Tablets / Capsules per Strip *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  disabled={!isPackagingEditing}
                  value={formData.tabletsPerStrip}
                  onChange={(e) =>
                    setFormData({ ...formData, tabletsPerStrip: parseInt(e.target.value) || 1 })
                  }
                  className="w-full h-12 px-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white outline-none focus:border-brand-primary disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800/40"
                />
              </div>
            </div>
          )}

          {packagingType === "BOTTLE" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Default Sales Unit
                </label>
                <div className="w-full h-12 px-4 bg-slate-100 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base text-slate-800 dark:text-slate-200 font-bold flex items-center justify-between">
                  <span>Single Bottle</span>
                  <span className="text-xs text-blue-700 dark:text-blue-400 font-bold px-2.5 py-0.5 bg-blue-100 dark:bg-blue-950/50 rounded-full">
                    Bottle
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Bottles per Carton
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  disabled={!isPackagingEditing}
                  value={itemsPerBox}
                  onChange={(e) => setItemsPerBox(parseInt(e.target.value) || 1)}
                  className="w-full h-12 px-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white outline-none focus:border-brand-primary disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800/40"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Volume / Net Content
                </label>
                <input
                  type="text"
                  disabled={!isPackagingEditing}
                  placeholder="e.g. 100ml, 200ml, 60ml"
                  value={formData.size || ""}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="w-full h-12 px-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white outline-none focus:border-brand-primary disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800/40"
                />
              </div>
            </div>
          )}

          {packagingType === "PIECE" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Default Sales Unit
                </label>
                <div className="w-full h-12 px-4 bg-slate-100 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base text-slate-800 dark:text-slate-200 font-bold flex items-center justify-between">
                  <span>Single Piece / Item</span>
                  <span className="text-xs text-purple-700 dark:text-purple-400 font-bold px-2.5 py-0.5 bg-purple-100 dark:bg-purple-950/50 rounded-full">
                    Piece (Pcs)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Pieces per Box / Pack
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  disabled={!isPackagingEditing}
                  value={itemsPerBox}
                  onChange={(e) => setItemsPerBox(parseInt(e.target.value) || 1)}
                  className="w-full h-12 px-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white outline-none focus:border-brand-primary disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800/40"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Item Specification / Size
                </label>
                <input
                  type="text"
                  disabled={!isPackagingEditing}
                  placeholder="e.g. 5ml, Large, Standard, 10cm"
                  value={formData.size || ""}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="w-full h-12 px-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white outline-none focus:border-brand-primary disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800/40"
                />
              </div>
            </div>
          )}

          {packagingType === "VIAL" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Default Sales Unit
                </label>
                <div className="w-full h-12 px-4 bg-slate-100 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base text-slate-800 dark:text-slate-200 font-bold flex items-center justify-between">
                  <span>Single Vial / Ampoule</span>
                  <span className="text-xs text-amber-700 dark:text-amber-400 font-bold px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/50 rounded-full">
                    Vial / Ampoule
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Vials / Ampoules per Box *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  disabled={!isPackagingEditing}
                  value={itemsPerBox}
                  onChange={(e) => setItemsPerBox(parseInt(e.target.value) || 1)}
                  className="w-full h-12 px-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white outline-none focus:border-brand-primary disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800/40"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Strength / Dosage
                </label>
                <input
                  type="text"
                  disabled={!isPackagingEditing}
                  placeholder="e.g. 1g, 500mg/2ml, 40IU"
                  value={formData.size || ""}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="w-full h-12 px-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white outline-none focus:border-brand-primary disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800/40"
                />
              </div>
            </div>
          )}

          {/* Multiplier Info Banner */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300">
            💡 <strong>Automatic Multiplier:</strong>{" "}
            {packagingType === "TABLET" && (
              <>
                1 Box = {formData.stripsPerBox || 10} Strips ={" "}
                <strong className="text-brand-primary">
                  {(formData.stripsPerBox || 10) * (formData.tabletsPerStrip || 10)} Tablets/Capsules
                </strong>
                . Stock Receiving & POS can dispense by Full Box, Strip, or single Tablet.
              </>
            )}
            {packagingType === "BOTTLE" && (
              <>
                1 Master Carton/Box ={" "}
                <strong className="text-brand-primary">{itemsPerBox || 1} Bottles</strong>. Counter
                POS dispenses and bills per Single Bottle.
              </>
            )}
            {packagingType === "PIECE" && (
              <>
                1 Box/Pack ={" "}
                <strong className="text-brand-primary">{itemsPerBox || 1} Pieces</strong>. Stock
                receiving & sales are tracked per Piece.
              </>
            )}
            {packagingType === "VIAL" && (
              <>
                1 Box ={" "}
                <strong className="text-brand-primary">{itemsPerBox || 1} Vials / Ampoules</strong>.
                Counter POS can dispense single Vial or Full Box.
              </>
            )}
          </div>
        </div>

        {/* Section 4: Doctor Prescription (Rx) */}
        <div className="bg-white dark:bg-slate-900 p-6 lg:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <label className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded font-black text-xs">
                Rx
              </span>
              Requires Doctor Prescription (Rx)
            </div>
            <input
              type="checkbox"
              checked={formData.requiresPrescription}
              onChange={(e) => setFormData({ ...formData, requiresPrescription: e.target.checked })}
              className="h-5 w-5 text-brand-primary rounded accent-brand-primary"
            />
          </label>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigate("inv_product_list")}
            className="h-12 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-black transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-12 px-7 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-sm font-black transition flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving Product...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {isEditing ? "Update Product" : "Save Product"}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick Add Subcategory Modal */}
      {quickSubModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-brand-primary" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Add Subcategory
                </h3>
              </div>
              <button
                onClick={() => setQuickSubModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateSubcategory} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Subcategory Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Antibiotics, Antipyretics, Eye Drops"
                  value={quickSubName}
                  onChange={(e) => setQuickSubName(e.target.value)}
                  className="w-full h-12 px-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white outline-none focus:border-brand-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickSubModalOpen(false)}
                  className="h-11 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickSubSaving || !quickSubName.trim()}
                  className="h-11 px-6 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-sm font-black transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {quickSubSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
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
