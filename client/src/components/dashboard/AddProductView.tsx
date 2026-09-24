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
    <div className="max-w-5xl 2xl:max-w-6xl mx-auto space-y-6 sm:space-y-8 pb-16 px-2 sm:px-4">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-400 mb-1.5">
            <span>Inventory</span>
            <span>/</span>
            <span className="text-brand-primary">
              {isEditing ? "Edit Product" : "Add Product"}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl xl:text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Package className="h-7 w-7 xl:h-8 xl:w-8 text-brand-primary shrink-0" />
            <span>{isEditing ? `Edit Product: ${editingProduct?.name}` : "Create New Product"}</span>
          </h2>
          <p className="text-xs sm:text-sm xl:text-base text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
            {isEditing
              ? "Update product information and packaging configuration."
              : "Enter the product details below to add it to your inventory."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate("inv_product_list")}
            className="h-11 sm:h-12 px-4 sm:px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs sm:text-sm xl:text-base font-bold transition flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {success && (
        <div className="p-4 sm:p-5 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-900 rounded-2xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-3 sm:gap-4">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-sm sm:text-base text-emerald-900 dark:text-emerald-200">
                Product saved successfully!
              </div>
              <div className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                Redirecting to product list...
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetForNew}
            className="px-3.5 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5"
          >
            <Sparkles className="h-4 w-4" />
            Add Another Product
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 sm:p-5 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-200 dark:border-rose-900 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-300 text-xs sm:text-sm xl:text-base font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSave} className="space-y-6 sm:space-y-8">
        {/* Section 1: Basic Information */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 xl:p-8 rounded-2xl border-2 border-slate-200/90 dark:border-slate-800 shadow-xs space-y-5 sm:space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <Package className="h-5 w-5 xl:h-6 xl:w-6 text-brand-primary" />
            <h3 className="font-black text-base sm:text-lg xl:text-xl text-slate-900 dark:text-white">
              1. Basic Information
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* Product Name */}
            <div>
              <label className="block text-sm sm:text-base xl:text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Napa Extra, Seclo 20, ORS"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-12 sm:h-12 xl:h-13 px-4 bg-slate-50/70 hover:bg-slate-50 dark:bg-slate-800/60 dark:hover:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base xl:text-lg font-semibold text-slate-900 dark:text-white placeholder:text-xs sm:placeholder:text-sm xl:placeholder:text-base placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
              />
            </div>

            {/* Generic Name */}
            <div>
              <label className="block text-sm sm:text-base xl:text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
                Generic Name
              </label>
              <input
                type="text"
                placeholder="e.g. Paracetamol, Omeprazole"
                value={formData.genericName}
                onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                className="w-full h-12 sm:h-12 xl:h-13 px-4 bg-slate-50/70 hover:bg-slate-50 dark:bg-slate-800/60 dark:hover:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base xl:text-lg font-semibold text-slate-900 dark:text-white placeholder:text-xs sm:placeholder:text-sm xl:placeholder:text-base placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
              />
            </div>

            {/* Strength / Size */}
            <div>
              <label className="block text-sm sm:text-base xl:text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
                Strength / Size
              </label>
              <input
                type="text"
                placeholder="e.g. 500mg, 20mg, 100ml"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full h-12 sm:h-12 xl:h-13 px-4 bg-slate-50/70 hover:bg-slate-50 dark:bg-slate-800/60 dark:hover:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base xl:text-lg font-semibold text-slate-900 dark:text-white placeholder:text-xs sm:placeholder:text-sm xl:placeholder:text-base placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
              />
            </div>

            {/* Doctor Prescription Rx Checkbox */}
            <div className="flex flex-col justify-end">
              <label className="h-12 sm:h-12 xl:h-13 px-4 bg-slate-50/70 hover:bg-slate-50 dark:bg-slate-800/60 dark:hover:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between cursor-pointer transition">
                <span className="text-sm sm:text-base xl:text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2.5">
                  <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-md text-xs sm:text-sm font-black">
                    Rx
                  </span>
                  Requires Prescription
                </span>
                <input
                  type="checkbox"
                  checked={formData.requiresPrescription}
                  onChange={(e) => setFormData({ ...formData, requiresPrescription: e.target.checked })}
                  className="h-5 w-5 text-brand-primary rounded accent-brand-primary cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Category */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 xl:p-8 rounded-2xl border-2 border-slate-200/90 dark:border-slate-800 shadow-xs space-y-5 sm:space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <FolderTree className="h-5 w-5 xl:h-6 xl:w-6 text-brand-primary" />
            <h3 className="font-black text-base sm:text-lg xl:text-xl text-slate-900 dark:text-white">
              2. Category
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* Category */}
            <div>
              <label className="block text-sm sm:text-base xl:text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full h-12 sm:h-12 xl:h-13 px-4 bg-slate-50/70 hover:bg-slate-50 dark:bg-slate-800/60 dark:hover:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base xl:text-lg font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
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
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm sm:text-base xl:text-lg font-bold text-slate-800 dark:text-slate-200">
                  Subcategory (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => setQuickSubModalOpen(true)}
                  className="text-xs sm:text-sm xl:text-base text-brand-primary hover:underline font-bold flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add New
                </button>
              </div>
              <select
                value={formData.subcategoryId}
                onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
                className="w-full h-12 sm:h-12 xl:h-13 px-4 bg-slate-50/70 hover:bg-slate-50 dark:bg-slate-800/60 dark:hover:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base xl:text-lg font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
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

        {/* Section 3: Packaging Type */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 xl:p-8 rounded-2xl border-2 border-slate-200/90 dark:border-slate-800 shadow-xs space-y-5 sm:space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Pill className="h-5 w-5 xl:h-6 xl:w-6 text-brand-primary" />
              <h3 className="font-black text-base sm:text-lg xl:text-xl text-slate-900 dark:text-white">
                3. Packaging Type
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsPackagingEditing(!isPackagingEditing)}
              className={`text-xs sm:text-sm xl:text-base font-bold px-3.5 sm:px-4 py-2 rounded-xl transition flex items-center gap-2 border-2 ${
                isPackagingEditing
                  ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700"
              }`}
            >
              {isPackagingEditing ? (
                <>
                  <Lock className="h-3.5 w-3.5 xl:h-4 xl:w-4 text-amber-700 dark:text-amber-400" />
                  <span>Lock Settings</span>
                </>
              ) : (
                <>
                  <Edit2 className="h-3.5 w-3.5 xl:h-4 xl:w-4 text-slate-600 dark:text-slate-400" />
                  <span>Edit Settings</span>
                </>
              )}
            </button>
          </div>

          {/* Packaging Form Type Selector */}
          <div>
            <label className="block text-sm sm:text-base xl:text-lg font-bold text-slate-800 dark:text-slate-200 mb-2.5">
              Select Packaging Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Option 1: Strip & Tablet */}
              <button
                type="button"
                disabled={!isPackagingEditing}
                onClick={() => handleSelectPackagingType("TABLET")}
                className={`p-3.5 sm:p-4 xl:p-5 rounded-2xl border-2 text-left transition flex flex-col gap-1.5 disabled:opacity-75 ${
                  packagingType === "TABLET"
                    ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-sm sm:text-base xl:text-lg">
                    <Pill className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0" />
                    <span>Tablet / Capsule</span>
                  </div>
                  {packagingType === "TABLET" && (
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  )}
                </div>
                <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Box & Strips
                </span>
              </button>

              {/* Option 2: Bottle / Liquid */}
              <button
                type="button"
                disabled={!isPackagingEditing}
                onClick={() => handleSelectPackagingType("BOTTLE")}
                className={`p-3.5 sm:p-4 xl:p-5 rounded-2xl border-2 text-left transition flex flex-col gap-1.5 disabled:opacity-75 ${
                  packagingType === "BOTTLE"
                    ? "bg-blue-50/80 dark:bg-blue-950/30 border-blue-500 text-blue-950 dark:text-blue-200 ring-2 ring-blue-500/20 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-sm sm:text-base xl:text-lg">
                    <Droplets className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0" />
                    <span>Syrup / Bottle</span>
                  </div>
                  {packagingType === "BOTTLE" && (
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  )}
                </div>
                <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Bottles / Liquid
                </span>
              </button>

              {/* Option 3: Piece / Equipment */}
              <button
                type="button"
                disabled={!isPackagingEditing}
                onClick={() => handleSelectPackagingType("PIECE")}
                className={`p-3.5 sm:p-4 xl:p-5 rounded-2xl border-2 text-left transition flex flex-col gap-1.5 disabled:opacity-75 ${
                  packagingType === "PIECE"
                    ? "bg-purple-50/80 dark:bg-purple-950/30 border-purple-500 text-purple-950 dark:text-purple-200 ring-2 ring-purple-500/20 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-sm sm:text-base xl:text-lg">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 shrink-0" />
                    <span>Piece / Unit</span>
                  </div>
                  {packagingType === "PIECE" && (
                    <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                  )}
                </div>
                <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Single item or pack
                </span>
              </button>

              {/* Option 4: Vial / Injection */}
              <button
                type="button"
                disabled={!isPackagingEditing}
                onClick={() => handleSelectPackagingType("VIAL")}
                className={`p-3.5 sm:p-4 xl:p-5 rounded-2xl border-2 text-left transition flex flex-col gap-1.5 disabled:opacity-75 ${
                  packagingType === "VIAL"
                    ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-500 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-sm sm:text-base xl:text-lg">
                    <Syringe className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 shrink-0" />
                    <span>Injection / Vial</span>
                  </div>
                  {packagingType === "VIAL" && (
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  )}
                </div>
                <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Ampoule / Vial
                </span>
              </button>
            </div>
          </div>

          {/* Unit Quantity Inputs */}
          {packagingType === "TABLET" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3">
              <div>
                <label className="block text-sm sm:text-base xl:text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Strips per Box <span className="text-rose-500">*</span>
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
                  className="w-full h-12 sm:h-12 xl:h-13 px-4 bg-slate-50/70 hover:bg-slate-50 dark:bg-slate-800/60 dark:hover:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base xl:text-lg font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-sm sm:text-base xl:text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Tablets per Strip <span className="text-rose-500">*</span>
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
                  className="w-full h-12 sm:h-12 xl:h-13 px-4 bg-slate-50/70 hover:bg-slate-50 dark:bg-slate-800/60 dark:hover:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base xl:text-lg font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all disabled:opacity-60"
                />
              </div>
            </div>
          )}

          {packagingType === "BOTTLE" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3">
              <div>
                <label className="block text-sm sm:text-base xl:text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Bottles per Carton <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  disabled={!isPackagingEditing}
                  value={itemsPerBox}
                  onChange={(e) => setItemsPerBox(parseInt(e.target.value) || 1)}
                  className="w-full h-12 sm:h-12 xl:h-13 px-4 bg-slate-50/70 hover:bg-slate-50 dark:bg-slate-800/60 dark:hover:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base xl:text-lg font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-sm sm:text-base xl:text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Sales Unit
                </label>
                <div className="w-full h-12 sm:h-12 xl:h-13 px-4 bg-slate-100 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base xl:text-lg font-bold text-slate-700 dark:text-slate-300 flex items-center">
                  Single Bottle
                </div>
              </div>
            </div>
          )}

          {packagingType === "PIECE" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3">
              <div>
                <label className="block text-sm sm:text-base xl:text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Pieces per Box / Pack <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  disabled={!isPackagingEditing}
                  value={itemsPerBox}
                  onChange={(e) => setItemsPerBox(parseInt(e.target.value) || 1)}
                  className="w-full h-12 sm:h-12 xl:h-13 px-4 bg-slate-50/70 hover:bg-slate-50 dark:bg-slate-800/60 dark:hover:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base xl:text-lg font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-sm sm:text-base xl:text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Sales Unit
                </label>
                <div className="w-full h-12 sm:h-12 xl:h-13 px-4 bg-slate-100 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base xl:text-lg font-bold text-slate-700 dark:text-slate-300 flex items-center">
                  Single Piece / Unit
                </div>
              </div>
            </div>
          )}

          {packagingType === "VIAL" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3">
              <div>
                <label className="block text-sm sm:text-base xl:text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Vials / Ampoules per Box <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  disabled={!isPackagingEditing}
                  value={itemsPerBox}
                  onChange={(e) => setItemsPerBox(parseInt(e.target.value) || 1)}
                  className="w-full h-12 sm:h-12 xl:h-13 px-4 bg-slate-50/70 hover:bg-slate-50 dark:bg-slate-800/60 dark:hover:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base xl:text-lg font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-sm sm:text-base xl:text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Sales Unit
                </label>
                <div className="w-full h-12 sm:h-12 xl:h-13 px-4 bg-slate-100 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base xl:text-lg font-bold text-slate-700 dark:text-slate-300 flex items-center">
                  Single Vial / Ampoule
                </div>
              </div>
            </div>
          )}

          {/* Quick Summary Pill */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-2 border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm xl:text-base font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white">Summary:</span>
            {packagingType === "TABLET" && (
              <span>
                1 Box = {formData.stripsPerBox || 10} Strips ({Number(formData.stripsPerBox || 10) * Number(formData.tabletsPerStrip || 10)} Tablets total)
              </span>
            )}
            {packagingType === "BOTTLE" && (
              <span>
                1 Carton = {itemsPerBox || 12} Bottles (dispensed per single bottle)
              </span>
            )}
            {packagingType === "PIECE" && (
              <span>
                1 Box = {itemsPerBox || 1} Pieces
              </span>
            )}
            {packagingType === "VIAL" && (
              <span>
                1 Box = {itemsPerBox || 10} Vials / Ampoules
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 sm:gap-4 pt-3">
          <button
            type="button"
            onClick={() => onNavigate("inv_product_list")}
            className="h-11 sm:h-12 xl:h-13 px-5 sm:px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm sm:text-base xl:text-lg font-bold transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-11 sm:h-12 xl:h-13 px-6 sm:px-8 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-sm sm:text-base xl:text-lg font-bold transition flex items-center gap-2.5 shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>{isEditing ? "Update Product" : "Save Product"}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick Add Subcategory Modal */}
      {quickSubModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border-2 border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <FolderTree className="h-5 w-5 text-brand-primary" />
                <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  Add Subcategory
                </h4>
              </div>
              <button
                onClick={() => setQuickSubModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateSubcategory} className="space-y-4">
              <div>
                <label className="block text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Subcategory Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Antibiotics, Antipyretics"
                  value={quickSubName}
                  onChange={(e) => setQuickSubName(e.target.value)}
                  className="w-full h-11 sm:h-12 px-4 bg-slate-50 hover:bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-xs sm:placeholder:text-sm placeholder:text-slate-400 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickSubModalOpen(false)}
                  className="h-10 sm:h-11 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm sm:text-base font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickSubSaving || !quickSubName.trim()}
                  className="h-10 sm:h-11 px-5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-sm sm:text-base font-bold transition flex items-center gap-2 disabled:opacity-50"
                >
                  {quickSubSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
