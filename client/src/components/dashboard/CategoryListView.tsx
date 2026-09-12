"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { Category } from "@/types";
import {
  FolderTree,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Pill,
  Syringe,
  Stethoscope,
  Droplets,
  Package,
  ChevronRight,
  Search,
  X,
  Power,
  Layers,
  Sparkles,
} from "lucide-react";

interface CategoryListViewProps {
  onNavigate?: (module: any) => void;
}

export function CategoryListView({ onNavigate }: CategoryListViewProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");

  // Inline Quick Add Subcategory Modal
  const [addingSubForCat, setAddingSubForCat] = useState<Category | null>(null);
  const [quickSubName, setQuickSubName] = useState("");

  // Edit Main Category Modal
  const [editingMainCat, setEditingMainCat] = useState<Category | null>(null);
  const [editMainName, setEditMainName] = useState("");

  // Delete Main Category Modal
  const [deletingMainCat, setDeletingMainCat] = useState<Category | null>(null);

  // Edit Subcategory Modal
  const [editingSubcategory, setEditingSubcategory] = useState<{
    id: string;
    name: string;
    parentId: string;
    parentName: string;
  } | null>(null);
  const [editSubName, setEditSubName] = useState("");

  // Delete Subcategory Modal
  const [deletingSubcategory, setDeletingSubcategory] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi("/products/variants/categories");
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load categories", err);
      setError("Failed to fetch category list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Category visual metadata icon helper
  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("med")) {
      return <Pill className="h-5 w-5 text-emerald-500" />;
    } else if (lower.includes("syrup") || lower.includes("liquid")) {
      return <Droplets className="h-5 w-5 text-blue-500" />;
    } else if (lower.includes("equip") || lower.includes("device")) {
      return <Stethoscope className="h-5 w-5 text-indigo-500" />;
    } else if (lower.includes("saline") || lower.includes("iv")) {
      return <Syringe className="h-5 w-5 text-amber-500" />;
    }
    return <Package className="h-5 w-5 text-purple-500" />;
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

      setSuccess(`Category "${cat.name}" status updated to ${newStatus ? "Active" : "Inactive"}.`);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Immediate Add Subcategory
  const handleSaveQuickSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingSubForCat || !quickSubName.trim()) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetchApi("/products/variants/categories", {
        method: "POST",
        body: JSON.stringify({
          name: quickSubName.trim(),
          parentId: addingSubForCat.id,
          isActive: true,
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to create subcategory");

      setSuccess(`Subcategory "${quickSubName.trim()}" added to "${addingSubForCat.name}"!`);
      setQuickSubName("");
      setAddingSubForCat(null);
      await loadData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Edit Main Category
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

      setSuccess(`Main Category updated to "${editMainName.trim()}" successfully!`);
      setEditingMainCat(null);
      await loadData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Safe Delete Main Category
  const handleConfirmDeleteMain = async () => {
    if (!deletingMainCat) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetchApi(`/products/variants/categories/${deletingMainCat.id}`, {
        method: "DELETE",
      });

      if (!res.success) throw new Error(res.message || "Failed to delete category");

      setSuccess(`Category "${deletingMainCat.name}" deleted successfully.`);
      setDeletingMainCat(null);
      await loadData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message);
      setDeletingMainCat(null);
    } finally {
      setSaving(false);
    }
  };

  // Edit Subcategory
  const handleSaveEditSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubcategory || !editSubName.trim()) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetchApi(`/products/variants/categories/${editingSubcategory.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editSubName.trim(),
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to update subcategory");

      setSuccess(`Subcategory updated to "${editSubName.trim()}" successfully!`);
      setEditingSubcategory(null);
      await loadData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Safe Delete Subcategory
  const handleConfirmDeleteSub = async () => {
    if (!deletingSubcategory) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetchApi(`/products/variants/categories/${deletingSubcategory.id}`, {
        method: "DELETE",
      });

      if (!res.success) throw new Error(res.message || "Failed to delete subcategory");

      setSuccess(`Subcategory "${deletingSubcategory.name}" deleted successfully.`);
      setDeletingSubcategory(null);
      await loadData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message);
      setDeletingSubcategory(null);
    } finally {
      setSaving(false);
    }
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
            <span>Category Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Category List</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FolderTree className="h-6 w-6 text-brand-primary" />
            Category Hierarchy & Subcategories
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            View main categories, subcategories, assigned product counts, and manage statuses.
          </p>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate("cat_create")}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Create Category
          </button>
        )}
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5 font-bold animate-in fade-in">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5 font-semibold">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {categories.map((c) => {
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
                  {getCategoryIcon(c.name)}
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
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

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search categories or subcategories..."
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
            <span>Show All Categories</span>
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Category List */}
      {loading ? (
        <div className="p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-brand-primary mb-2" />
          <p className="text-xs font-medium">Loading category taxonomy...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <FolderTree className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700" />
          <div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {categories.length === 0 ? "No categories created yet" : "No matching categories found"}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {categories.length === 0
                ? "Start by creating your first category to organize your products and subcategories."
                : "Try adjusting your search query or clear filters to view categories."}
            </p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate("cat_create")}
              className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Create Category
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCategories.map((mainCat) => {
            const subcats = mainCat.subcategories || [];
            const isActive = mainCat.isActive ?? true;

            return (
              <div
                key={mainCat.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl border shadow-sm overflow-hidden transition ${
                  isActive
                    ? "border-slate-200 dark:border-slate-800"
                    : "border-slate-200 dark:border-slate-800 opacity-70"
                }`}
              >
                {/* Main Category Row / Header */}
                <div className="p-4 sm:p-5 bg-slate-50/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-700 shadow-xs border border-slate-200/60 dark:border-slate-600/60">
                      {getCategoryIcon(mainCat.name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                          {mainCat.name}
                        </h4>
                        <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                          Main Category
                        </span>
                        {!isActive && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/50">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {subcats.length} subcategory(ies) • {mainCat._count?.products || 0} product(s) linked
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() => handleToggleActive(mainCat)}
                      className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        isActive
                          ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          : "text-slate-400 hover:text-emerald-600 hover:bg-slate-100"
                      }`}
                      title={isActive ? "Deactivate Category" : "Activate Category"}
                    >
                      <Power className="h-4 w-4" />
                      <span className="hidden md:inline">{isActive ? "Active" : "Inactive"}</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingMainCat(mainCat);
                        setEditMainName(mainCat.name);
                      }}
                      className="p-2 text-slate-500 hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition flex items-center gap-1 text-xs font-bold"
                      title="Edit Category Name"
                    >
                      <Edit2 className="h-4 w-4" />
                      <span className="hidden md:inline">Edit</span>
                    </button>

                    <button
                      onClick={() => setDeletingMainCat(mainCat)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition"
                      title="Delete Category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => {
                        setAddingSubForCat(mainCat);
                        setQuickSubName("");
                      }}
                      className="px-3 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs ml-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      + Add Subcategory
                    </button>
                  </div>
                </div>

                {/* Subcategory List under Main Category */}
                {subcats.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs italic">
                    No subcategories under {mainCat.name}. Click "+ Add Subcategory" to create one immediately.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {subcats.map((sub) => {
                      const prodCount = sub._count?.subProducts || 0;
                      const isSubActive = sub.isActive ?? true;

                      return (
                        <div
                          key={sub.id}
                          className={`p-3.5 pl-6 sm:pl-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 flex items-center justify-between transition ${
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
                                {prodCount > 0 ? (
                                  <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">
                                    {prodCount} product(s)
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">
                                    0 products
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
                              onClick={() => {
                                setEditingSubcategory({
                                  id: sub.id,
                                  name: sub.name,
                                  parentId: mainCat.id,
                                  parentName: mainCat.name,
                                });
                                setEditSubName(sub.name);
                              }}
                              className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition"
                              title={`Edit ${sub.name}`}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setDeletingSubcategory({ id: sub.id, name: sub.name })
                              }
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
          })}
        </div>
      )}

      {/* MODAL 1: Immediate Add Subcategory */}
      {addingSubForCat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-brand-primary" />
                Add Subcategory under "{addingSubForCat.name}"
              </h3>
              <button
                onClick={() => setAddingSubForCat(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickSubcategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subcategory Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tablet, Capsule, Cream, Drops"
                  value={quickSubName}
                  onChange={(e) => setQuickSubName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddingSubForCat(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !quickSubName.trim()}
                  className="px-5 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold hover:bg-brand-primary-hover transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add Subcategory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Main Category */}
      {editingMainCat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-brand-primary" />
                Edit Category Name
              </h3>
              <button
                onClick={() => setEditingMainCat(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
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
                  value={editMainName}
                  onChange={(e) => setEditMainName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMainCat(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !editMainName.trim()}
                  className="px-5 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold hover:bg-brand-primary-hover transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Subcategory */}
      {editingSubcategory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-brand-primary" />
                Edit Subcategory under "{editingSubcategory.parentName}"
              </h3>
              <button
                onClick={() => setEditingSubcategory(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSub} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subcategory Name *
                </label>
                <input
                  type="text"
                  required
                  value={editSubName}
                  onChange={(e) => setEditSubName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSubcategory(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !editSubName.trim()}
                  className="px-5 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold hover:bg-brand-primary-hover transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete Main Category Confirmation */}
      {deletingMainCat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 w-12 h-12 rounded-2xl mx-auto flex items-center justify-center">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Delete Category "{deletingMainCat.name}"?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                This will safely remove the category and its subcategories if no products are linked. If products exist under it, deletion will be blocked safely.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMainCat(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMain}
                disabled={saving}
                className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition flex items-center gap-1.5 disabled:opacity-50 shadow-md"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Delete Subcategory Confirmation */}
      {deletingSubcategory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 w-12 h-12 rounded-2xl mx-auto flex items-center justify-center">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Delete Subcategory "{deletingSubcategory.name}"?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove this subcategory?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSubcategory(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSub}
                disabled={saving}
                className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition flex items-center gap-1.5 disabled:opacity-50 shadow-md"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
