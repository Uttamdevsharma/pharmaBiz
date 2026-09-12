"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { Category, Brand } from "@/types";
import {
  FolderTree,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  AlertCircle,
  Building,
  CheckCircle2,
  Pill,
  Syringe,
  Stethoscope,
  Droplets,
  Package,
  ChevronRight,
  Search,
  Layers,
  X,
  Power,
  Check,
  Sparkles,
} from "lucide-react";

export function VariantsView() {
  const [activeTab, setActiveTab] = useState<"categories" | "brands">("categories");

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search & category filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");

  // Create Main Category Modal (ONLY Category Name)
  const [mainCatModalOpen, setMainCatModalOpen] = useState(false);
  const [newMainName, setNewMainName] = useState("");

  // Edit Main Category Modal (ONLY Category Name)
  const [editingMainCat, setEditingMainCat] = useState<Category | null>(null);
  const [editMainName, setEditMainName] = useState("");

  // Delete Main Category Modal
  const [deletingMainCat, setDeletingMainCat] = useState<Category | null>(null);

  // Create Subcategory Form (Select Main Category + Subcategory Name)
  const [selectedParentId, setSelectedParentId] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");

  // Edit Subcategory Modal (ONLY Subcategory Name)
  const [editingSubcategory, setEditingSubcategory] = useState<{
    id: string;
    name: string;
    parentId: string;
    parentName: string;
  } | null>(null);
  const [editName, setEditName] = useState("");

  // Delete Subcategory Modal / Confirmation
  const [deletingSubcategory, setDeletingSubcategory] = useState<{ id: string; name: string } | null>(null);

  // New Brand Form
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandDesc, setNewBrandDesc] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [cRes, bRes] = await Promise.all([
        fetchApi("/products/variants/categories"),
        fetchApi("/products/variants/brands"),
      ]);
      if (cRes.success && cRes.data) {
        setCategories(cRes.data);
        if (cRes.data.length > 0 && !selectedParentId) {
          setSelectedParentId(cRes.data[0].id);
        }
      }
      if (bRes.success && bRes.data) setBrands(bRes.data);
    } catch (err) {
      console.error("Failed to load catalog taxonomy data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleParentChange = (parentId: string) => {
    setSelectedParentId(parentId);
  };

  // Create Main Category (ONLY Category Name)
  const handleCreateMainCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMainName.trim()) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetchApi("/products/variants/categories", {
        method: "POST",
        body: JSON.stringify({
          name: newMainName.trim(),
          parentId: null,
          isActive: true,
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to create Main Category");

      setSuccess(`Main Category "${newMainName.trim()}" created successfully!`);
      setNewMainName("");
      setMainCatModalOpen(false);
      await loadData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Edit Main Category
  const handleOpenEditMain = (cat: Category) => {
    setEditingMainCat(cat);
    setEditMainName(cat.name);
  };

  const handleSaveEditMain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMainCat || !editMainName.trim()) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetchApi(`/products/variants/categories/${editingMainCat.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editMainName.trim(),
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to update category");

      setSuccess(`Main Category "${editMainName.trim()}" updated successfully!`);
      setEditingMainCat(null);
      await loadData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete Main Category
  const handleConfirmDeleteMain = async () => {
    if (!deletingMainCat) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetchApi(`/products/variants/categories/${deletingMainCat.id}`, {
        method: "DELETE",
      });

      if (!res.success) throw new Error(res.message || "Failed to delete category");

      setSuccess(`Category "${deletingMainCat.name}" removed successfully.`);
      setDeletingMainCat(null);
      await loadData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Toggle Active/Inactive status
  const handleToggleActive = async (cat: Category) => {
    try {
      setError(null);
      const newStatus = !(cat.isActive ?? true);
      const res = await fetchApi(`/products/variants/categories/${cat.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!res.success) throw new Error(res.message || "Failed to update category status");

      setSuccess(`Category "${cat.name}" is now ${newStatus ? "Active" : "Inactive"}.`);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Create Subcategory (Select Main Category + Subcategory Name)
  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubcategoryName.trim() || !selectedParentId) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetchApi("/products/variants/categories", {
        method: "POST",
        body: JSON.stringify({
          name: newSubcategoryName.trim(),
          parentId: selectedParentId,
          isActive: true,
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to create subcategory");

      setSuccess(`Subcategory "${newSubcategoryName.trim()}" created successfully!`);
      setNewSubcategoryName("");
      await loadData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (sub: Category, parent: Category) => {
    setEditingSubcategory({
      id: sub.id,
      name: sub.name,
      parentId: parent.id,
      parentName: parent.name,
    });
    setEditName(sub.name);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubcategory || !editName.trim()) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetchApi(`/products/variants/categories/${editingSubcategory.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName.trim(),
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to update subcategory");

      setSuccess(`Subcategory "${editName.trim()}" updated successfully!`);
      setEditingSubcategory(null);
      await loadData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSubcategory) return;
    try {
      setSaving(true);
      const res = await fetchApi(`/products/variants/categories/${deletingSubcategory.id}`, {
        method: "DELETE",
      });

      if (!res.success) throw new Error(res.message || "Failed to delete subcategory");

      setSuccess(`Subcategory "${deletingSubcategory.name}" removed successfully.`);
      setDeletingSubcategory(null);
      await loadData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetchApi("/products/variants/brands", {
        method: "POST",
        body: JSON.stringify({
          name: newBrandName.trim(),
          description: newBrandDesc.trim() || null,
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to create brand");

      setSuccess(`Brand "${newBrandName.trim()}" registered successfully!`);
      setNewBrandName("");
      setNewBrandDesc("");
      await loadData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBrand = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove brand "${name}"?`)) return;
    try {
      const res = await fetchApi(`/products/variants/brands/${id}`, { method: "DELETE" });
      if (res.success) {
        setBrands((prev) => prev.filter((b) => b.id !== id));
        setSuccess(`Brand "${name}" removed`);
        setTimeout(() => setSuccess(null), 2500);
      } else {
        alert(res.message || "Failed to delete brand");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getMainCategoryMeta = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("med")) {
      return {
        icon: <Pill className="h-5 w-5 text-emerald-500" />,
        badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      };
    } else if (lower.includes("syrup") || lower.includes("liquid")) {
      return {
        icon: <Droplets className="h-5 w-5 text-blue-500" />,
        badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      };
    } else if (lower.includes("equip") || lower.includes("device")) {
      return {
        icon: <Stethoscope className="h-5 w-5 text-indigo-500" />,
        badgeColor: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      };
    } else if (lower.includes("saline") || lower.includes("iv")) {
      return {
        icon: <Syringe className="h-5 w-5 text-amber-500" />,
        badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      };
    }
    return {
      icon: <Package className="h-5 w-5 text-purple-500" />,
      badgeColor: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    };
  };

  // Filter Categories
  const filteredCategories = useMemo(() => {
    return categories
      .filter((cat) => {
        if (selectedCategoryFilter !== "ALL" && cat.id !== selectedCategoryFilter) {
          return false;
        }
        return true;
      })
      .map((cat) => {
        if (!searchQuery.trim()) return cat;
        const q = searchQuery.toLowerCase();
        const mainMatches = cat.name.toLowerCase().includes(q);
        const filteredSubs = (cat.subcategories || []).filter((sub) =>
          sub.name.toLowerCase().includes(q)
        );
        if (mainMatches) return cat;
        if (filteredSubs.length > 0) return { ...cat, subcategories: filteredSubs };
        return null;
      })
      .filter(Boolean) as Category[];
  }, [categories, selectedCategoryFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Inventory</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Categories & Taxonomy</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FolderTree className="h-6 w-6 text-brand-primary" />
            Dynamic Categories & Brands
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create and manage Main Categories, custom Subcategories, and pharmaceutical manufacturers.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setMainCatModalOpen(true)}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Main Category
          </button>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("categories")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "categories"
                  ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <FolderTree className="h-3.5 w-3.5" />
              Categories ({categories.length})
            </button>
            <button
              onClick={() => setActiveTab("brands")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "brands"
                  ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Building className="h-3.5 w-3.5" />
              Brands ({brands.length})
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-bold animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: CATEGORIES & SUBCATEGORIES */}
      {activeTab === "categories" && (
        <div className="space-y-6">
          {/* Main Category Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {categories.map((c) => {
              const meta = getMainCategoryMeta(c.name);
              const isSelected = selectedCategoryFilter === c.id;
              const isActive = c.isActive ?? true;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCategoryFilter(isSelected ? "ALL" : c.id)}
                  className={`p-3.5 rounded-2xl border text-left transition relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? "bg-white dark:bg-slate-900 border-brand-primary ring-2 ring-brand-primary/20 shadow-sm"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  } ${!isActive ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                      {meta.icon}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {c.name}
                    </h4>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5 flex items-center justify-between">
                      <span>{c.subcategories?.length || 0} sub</span>
                      <span>{c._count?.products || 0} items</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Create Subcategory Form */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 sticky top-6">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Add Subcategory
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Add custom subcategories under any Main Category.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateSubcategory} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Main Category *
                  </label>
                  <select
                    value={selectedParentId}
                    onChange={(e) => handleParentChange(e.target.value)}
                    required
                    disabled={categories.length === 0}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-bold disabled:opacity-50"
                  >
                    {categories.length === 0 ? (
                      <option value="">No categories available (Create one first)</option>
                    ) : (
                      categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.isActive === false ? "(Inactive)" : ""}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subcategory Name *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={categories.length === 0}
                    placeholder="e.g. Tablet, Capsule, Cream, Dry Syrup"
                    value={newSubcategoryName}
                    onChange={(e) => setNewSubcategoryName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-bold disabled:opacity-50"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Example: Tablet, Capsule, Syrup, Drops, Injections
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving || !selectedParentId || !newSubcategoryName.trim() || categories.length === 0}
                  className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add Subcategory
                </button>
              </form>
            </div>

            {/* Hierarchical Categories & Subcategories List */}
            <div className="lg:col-span-8 space-y-4">
              {/* Search & Filter Bar */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search subcategories or categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20 font-medium"
                  />
                </div>

                {selectedCategoryFilter !== "ALL" && (
                  <button
                    onClick={() => setSelectedCategoryFilter("ALL")}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-slate-200 transition shrink-0"
                  >
                    <span>Show All</span>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {loading ? (
                <div className="p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-primary mb-2" />
                  <p className="text-xs font-medium">Loading categories...</p>
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <FolderTree className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {categories.length === 0 ? "No categories created yet" : "No matching categories found"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {categories.length === 0
                      ? "Click 'New Main Category' to create your first main category."
                      : "Try clearing your search query or create a new Main Category."}
                  </p>
                </div>
              ) : (
                filteredCategories.map((mainCat) => {
                  const meta = getMainCategoryMeta(mainCat.name);
                  const subcats = mainCat.subcategories || [];
                  const isActive = mainCat.isActive ?? true;

                  return (
                    <div
                      key={mainCat.id}
                      className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden transition ${
                        isActive
                          ? "border-slate-200 dark:border-slate-800"
                          : "border-slate-200 dark:border-slate-800 opacity-70"
                      }`}
                    >
                      {/* Main Category Header */}
                      <div className="p-4 bg-slate-50/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-700 shadow-xs border border-slate-200/60 dark:border-slate-600/60">
                            {meta.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                {mainCat.name}
                              </h4>
                              <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border ${meta.badgeColor}`}>
                                Main Category
                              </span>
                              {!isActive && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/50">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {subcats.length > 0 ? `${subcats.length} subcategories` : "Main Category (No subcategories)"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                          <button
                            onClick={() => handleToggleActive(mainCat)}
                            className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              isActive
                                ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                : "text-slate-400 hover:text-emerald-600 hover:bg-slate-100"
                            }`}
                            title={isActive ? "Deactivate Category" : "Activate Category"}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditMain(mainCat)}
                            className="p-1.5 text-slate-500 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition"
                            title="Edit Main Category"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingMainCat(mainCat)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                            title="Delete Main Category"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedParentId(mainCat.id);
                              handleParentChange(mainCat.id);
                            }}
                            className="text-xs font-bold text-brand-primary hover:bg-brand-primary/10 px-2.5 py-1 rounded-lg transition flex items-center gap-1 ml-1"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Subcategory
                          </button>
                        </div>
                      </div>

                      {/* Subcategories List */}
                      {subcats.length === 0 ? (
                        <div className="p-5 text-center text-slate-400 text-xs">
                          No subcategories under {mainCat.name}. Main categories can exist alone, or click "Add Subcategory" to add one.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {subcats.map((sub) => {
                            const prodCount = sub._count?.subProducts || 0;
                            const isSubActive = sub.isActive ?? true;
                            return (
                              <div
                                key={sub.id}
                                className={`p-3.5 pl-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 flex items-center justify-between transition ${
                                  !isSubActive ? "opacity-60" : ""
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
                                  <div>
                                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                      <span>{sub.name}</span>
                                      {!isSubActive && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-800">
                                          Inactive
                                        </span>
                                      )}
                                      {prodCount > 0 && (
                                        <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded-full">
                                          {prodCount} {prodCount === 1 ? "product" : "products"}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleToggleActive(sub)}
                                    className={`p-1.5 rounded-lg transition ${
                                      isSubActive
                                        ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                        : "text-slate-400 hover:text-emerald-600 hover:bg-slate-100"
                                    }`}
                                    title={isSubActive ? "Deactivate Subcategory" : "Activate Subcategory"}
                                  >
                                    <Power className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenEdit(sub, mainCat)}
                                    className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition"
                                    title={`Edit ${sub.name}`}
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingSubcategory({ id: sub.id, name: sub.name })}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                                    title={`Delete ${sub.name}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BRANDS */}
      {activeTab === "brands" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Create Brand Form */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="h-4 w-4 text-brand-primary" />
              Register Brand / Manufacturer
            </h3>
            <form onSubmit={handleCreateBrand} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Brand Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Square, Beximco, Incepta"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Details about this pharmaceutical company..."
                  value={newBrandDesc}
                  onChange={(e) => setNewBrandDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none resize-none font-medium"
                />
              </div>
              <button
                type="submit"
                disabled={saving || !newBrandName.trim()}
                className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Brand
              </button>
            </form>
          </div>

          {/* Brands List */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Registered Brands ({brands.length})
            </h3>
            {brands.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No brands registered yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {brands.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{b.name}</div>
                      {b.description && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{b.description}</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteBrand(b.id, b.name)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE MAIN CATEGORY MODAL */}
      {mainCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-brand-primary" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Create Main Category
                </h3>
              </div>
              <button
                onClick={() => setMainCatModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMainCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Medicine, Syrup, Medical Equipment, Saline, Other"
                  value={newMainName}
                  onChange={(e) => setNewMainName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Example: Medicine, Syrup, Medical Equipment, Saline, Other
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setMainCatModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !newMainName.trim()}
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MAIN CATEGORY MODAL */}
      {editingMainCat && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-brand-primary" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Edit Main Category
                </h3>
              </div>
              <button
                onClick={() => setEditingMainCat(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditMain} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Medicine, Syrup, Medical Equipment, Saline, Other"
                  value={editMainName}
                  onChange={(e) => setEditMainName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingMainCat(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !editMainName.trim()}
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MAIN CATEGORY CONFIRM MODAL */}
      {deletingMainCat && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Delete Category
                </h3>
                <p className="text-[11px] text-slate-400">
                  {deletingMainCat.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-white">"{deletingMainCat.name}"</strong>?
              {deletingMainCat.subcategories && deletingMainCat.subcategories.length > 0 && (
                <span className="block mt-1 text-rose-600 dark:text-rose-400 font-bold">
                  ⚠️ This category contains {deletingMainCat.subcategories.length} subcategory(ies).
                </span>
              )}
            </p>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
              ℹ️ Safe Deletion Rule: If any catalog products are linked to this category or its subcategories, deletion will be safely blocked to protect your inventory data.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingMainCat(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMain}
                disabled={saving}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SUBCATEGORY MODAL */}
      {editingSubcategory && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-brand-primary" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Edit Subcategory
                </h3>
              </div>
              <button
                onClick={() => setEditingSubcategory(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Main Category
                </label>
                <input
                  type="text"
                  disabled
                  value={editingSubcategory.parentName}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 font-bold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subcategory Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSubcategory(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !editName.trim()}
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE SUBCATEGORY CONFIRM MODAL */}
      {deletingSubcategory && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Delete Subcategory
                </h3>
                <p className="text-[11px] text-slate-400">
                  {deletingSubcategory.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to delete the subcategory <strong className="text-slate-900 dark:text-white">"{deletingSubcategory.name}"</strong>?
            </p>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
              ℹ️ Any existing catalog products linked to this subcategory will remain safely organized in their Main Category.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingSubcategory(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={saving}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Delete Subcategory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
