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
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  X,
  Power,
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

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // View / Manage Subcategories Details Modal
  const [viewingSubcategoriesCat, setViewingSubcategoriesCat] = useState<Category | null>(null);
  const [modalNewSubName, setModalNewSubName] = useState("");

  // Top Action: Add Subcategory Modal with Category Dropdown
  const [addingSubForCat, setAddingSubForCat] = useState<Category | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string>("");
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
        // keep viewingSubcategoriesCat updated in real time
        setViewingSubcategoriesCat((prev) => {
          if (!prev) return null;
          return res.data.find((c: Category) => c.id === prev.id) || null;
        });
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
      return <Pill className="h-4 w-4 text-emerald-500" />;
    } else if (lower.includes("syrup") || lower.includes("liquid")) {
      return <Droplets className="h-4 w-4 text-blue-500" />;
    } else if (lower.includes("equip") || lower.includes("device")) {
      return <Stethoscope className="h-4 w-4 text-indigo-500" />;
    } else if (lower.includes("saline") || lower.includes("iv")) {
      return <Syringe className="h-4 w-4 text-amber-500" />;
    }
    return <Package className="h-4 w-4 text-purple-500" />;
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

      setSuccess(`"${cat.name}" status updated to ${newStatus ? "Active" : "Inactive"}.`);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Add Subcategory directly inside the Details Modal
  const handleSaveModalSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingSubcategoriesCat || !modalNewSubName.trim()) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetchApi("/products/variants/categories", {
        method: "POST",
        body: JSON.stringify({
          name: modalNewSubName.trim(),
          parentId: viewingSubcategoriesCat.id,
          isActive: true,
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to create subcategory");

      setSuccess(`Subcategory "${modalNewSubName.trim()}" created under "${viewingSubcategoriesCat.name}"!`);
      setModalNewSubName("");
      await loadData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Add Subcategory from top header modal
  const handleSaveQuickSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const parentId = selectedParentId || addingSubForCat?.id;
    if (!parentId || !quickSubName.trim()) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetchApi("/products/variants/categories", {
        method: "POST",
        body: JSON.stringify({
          name: quickSubName.trim(),
          parentId: parentId,
          isActive: true,
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to create subcategory");

      const parentCat = categories.find((c) => c.id === parentId);
      setSuccess(`Subcategory "${quickSubName.trim()}" added to "${parentCat?.name || "Category"}"!`);
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
        body: JSON.stringify({ name: editMainName.trim() }),
      });

      if (!res.success) throw new Error(res.message || "Failed to update category name");

      setSuccess(`Category updated to "${editMainName.trim()}" successfully!`);
      setEditingMainCat(null);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
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
      setTimeout(() => setSuccess(null), 3000);
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
          parentId: editingSubcategory.parentId,
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to update subcategory");

      setSuccess(`Subcategory updated to "${editSubName.trim()}" successfully!`);
      setEditingSubcategory(null);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
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

  // Filter Categories by search term (matches category name or any subcategory)
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories
      .map((cat) => {
        const mainMatches = cat.name.toLowerCase().includes(q);
        const filteredSubs = (cat.subcategories || []).filter((sub) =>
          sub.name.toLowerCase().includes(q)
        );
        if (mainMatches) return cat;
        if (filteredSubs.length > 0) return { ...cat, subcategories: filteredSubs };
        return null;
      })
      .filter(Boolean) as Category[];
  }, [categories, searchQuery]);

  // Reset page when search or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  // Pagination calculation
  const totalItems = filteredCategories.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCategories.slice(start, start + pageSize);
  }, [filteredCategories, currentPage, pageSize]);

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Category Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Category List</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <FolderTree className="h-7 w-7 text-brand-primary" />
            Category List
          </h2>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              const defaultCat = categories[0] || null;
              setSelectedParentId(defaultCat ? defaultCat.id : "");
              setQuickSubName("");
              setAddingSubForCat(defaultCat);
            }}
            className="h-11 px-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-bold transition flex items-center gap-2 shrink-0 shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Subcategory
          </button>

          {onNavigate && (
            <button
              onClick={() => onNavigate("cat_create")}
              className="h-11 px-5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shrink-0 shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Create Category
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2.5 font-bold animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-800 dark:text-rose-300 text-sm flex items-center gap-2.5 font-bold">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Clean Full-Width Search Box */}
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-12 pl-12 pr-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-base text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-primary/20 shadow-xs font-semibold"
        />
      </div>

      {/* Main Category Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <Loader2 className="h-7 w-7 animate-spin text-brand-primary mx-auto mb-2" />
            <p className="text-sm font-bold">Loading categories...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <FolderTree className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700" />
            <div>
              <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                {categories.length === 0 ? "No categories created yet" : "No matching categories found"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {categories.length === 0
                  ? "Start by creating your first category to organize your products."
                  : "Try adjusting your search query."}
              </p>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate("cat_create")}
                className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-sm font-bold transition inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Create Category
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-4 px-4 w-14 text-center">#</th>
                  <th className="py-4 px-6">Category Name</th>
                  <th className="py-4 px-6 text-center">Subcategories</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedCategories.map((mainCat, index) => {
                  const activeSubcats = (mainCat.subcategories || []).filter((s) => s.isActive !== false);
                  const subcatCount = activeSubcats.length;
                  const sl = (currentPage - 1) * pageSize + index + 1;

                  return (
                    <tr
                      key={mainCat.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* Serial Number */}
                      <td className="py-4 px-4 text-center text-sm font-bold text-slate-400">
                        {sl}
                      </td>

                      {/* Category Name (Just Category Name & Icon - No product counts) */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-brand-primary shrink-0">
                            {getCategoryIcon(mainCat.name)}
                          </div>
                          <span className="text-base font-black text-slate-900 dark:text-white">
                            {mainCat.name}
                          </span>
                        </div>
                      </td>

                      {/* Subcategory Count (Just number 1, 2, 3...) */}
                      <td className="py-4 px-6 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setViewingSubcategoriesCat(mainCat);
                            setModalNewSubName("");
                          }}
                          className="inline-flex items-center justify-center min-w-9 h-8 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-brand-primary/10 hover:text-brand-primary text-slate-900 dark:text-white font-black text-sm border border-slate-200/60 dark:border-slate-700 transition cursor-pointer shadow-2xs"
                          title={`Click to view subcategories (${subcatCount} active)`}
                        >
                          {subcatCount}
                        </button>
                      </td>

                      {/* Actions: Details, Edit, Delete */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setViewingSubcategoriesCat(mainCat);
                              setModalNewSubName("");
                            }}
                            className="px-3.5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs hover:shadow-md cursor-pointer shrink-0"
                            title={`View Details for ${mainCat.name}`}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Details</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingMainCat(mainCat);
                              setEditMainName(mainCat.name);
                            }}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                            title="Edit Category Name"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingMainCat(mainCat)}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 text-slate-400 transition cursor-pointer"
                            title="Delete Category"
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

        {/* Clean Integrated Table Footer with Page Size Selector & Pagination */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900">
          {/* Left: Records Info & Page Size */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-slate-600 dark:text-slate-300 font-bold">
              Showing <span className="text-slate-900 dark:text-white font-black">{totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{" "}
              <span className="text-slate-900 dark:text-white font-black">{Math.min(currentPage * pageSize, totalItems)}</span> of{" "}
              <span className="text-slate-900 dark:text-white font-black">{totalItems}</span> records
            </span>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-8 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer"
              >
                <option value={5}>5 / page</option>
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>

          {/* Right: Page Navigation Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold transition flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed text-xs shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`min-w-8 h-8 px-2 rounded-xl text-xs font-black transition cursor-pointer ${
                    currentPage === pageNum
                      ? "bg-brand-primary text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold transition flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed text-xs shadow-2xs cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* DETAILS MODAL: Subcategories under this Category + Direct Add */}
      {viewingSubcategoriesCat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-6 shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-brand-primary/10 text-brand-primary">
                  {getCategoryIcon(viewingSubcategoriesCat.name)}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{viewingSubcategoriesCat.name}</span>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                      {(viewingSubcategoriesCat.subcategories || []).filter((s) => s.isActive !== false).length} Active Subcategories
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Subcategories under category "{viewingSubcategoriesCat.name}"
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingSubcategoriesCat(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Direct Add Subcategory Input Box */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                + Add Subcategory under {viewingSubcategoriesCat.name}
              </label>
              <form onSubmit={handleSaveModalSubcategory} className="flex gap-2.5">
                <input
                  type="text"
                  placeholder="e.g. Tablet, Capsule, Syrup, Cream, Drops..."
                  value={modalNewSubName}
                  onChange={(e) => setModalNewSubName(e.target.value)}
                  className="flex-1 h-11 px-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20 placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={saving || !modalNewSubName.trim()}
                  className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black transition flex items-center gap-1.5 disabled:opacity-50 shrink-0 shadow-sm cursor-pointer"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>Add</span>
                </button>
              </form>
            </div>

            {/* Existing Subcategories List (No product count clutter) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500">
                <span>Subcategories List</span>
                <span>{(viewingSubcategoriesCat.subcategories || []).length} items</span>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {(viewingSubcategoriesCat.subcategories || []).length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-1">
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      No subcategories under {viewingSubcategoriesCat.name} yet.
                    </p>
                    <p className="text-xs text-slate-400">
                      Type a name in the box above and click "Add" to create one.
                    </p>
                  </div>
                ) : (
                  (viewingSubcategoriesCat.subcategories || []).map((sub) => {
                    const isSubActive = sub.isActive ?? true;

                    return (
                      <div
                        key={sub.id}
                        className={`p-3.5 px-4.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 flex items-center justify-between transition ${
                          !isSubActive ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            {sub.name}
                          </span>
                          {!isSubActive && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-800">
                              Inactive
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleActive(sub)}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              isSubActive
                                ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                : "text-slate-400 hover:text-emerald-600 hover:bg-slate-100"
                            }`}
                            title={isSubActive ? "Deactivate" : "Activate"}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingSubcategory({
                                id: sub.id,
                                name: sub.name,
                                parentId: viewingSubcategoriesCat.id,
                                parentName: viewingSubcategoriesCat.name,
                              });
                              setEditSubName(sub.name);
                            }}
                            className="p-1.5 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition cursor-pointer"
                            title="Edit Subcategory"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeletingSubcategory({ id: sub.id, name: sub.name })
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                            title="Delete Subcategory"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer close */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewingSubcategoriesCat(null)}
                className="h-10 px-5 text-xs font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP ACTION MODAL: Add Subcategory with Parent Selector */}
      {addingSubForCat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-brand-primary" />
                Add Subcategory
              </h3>
              <button
                onClick={() => setAddingSubForCat(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickSubcategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Select Parent Category *
                </label>
                <select
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Subcategory Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tablet, Capsule, Syrup, Cream, Drops"
                  value={quickSubName}
                  onChange={(e) => setQuickSubName(e.target.value)}
                  className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddingSubForCat(null)}
                  className="h-10 px-4 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !quickSubName.trim() || !selectedParentId}
                  className="h-10 px-5 bg-brand-primary text-white rounded-xl text-xs font-black hover:bg-brand-primary-hover transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create Subcategory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Category Name */}
      {editingMainCat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-brand-primary" />
                Edit Category Name
              </h3>
              <button
                onClick={() => setEditingMainCat(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditMain} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={editMainName}
                  onChange={(e) => setEditMainName(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMainCat(null)}
                  className="h-11 px-5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !editMainName.trim()}
                  className="h-11 px-6 bg-brand-primary text-white rounded-xl text-sm font-black hover:bg-brand-primary-hover transition flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Subcategory */}
      {editingSubcategory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-brand-primary" />
                Edit Subcategory
              </h3>
              <button
                onClick={() => setEditingSubcategory(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSub} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Subcategory Name *
                </label>
                <input
                  type="text"
                  required
                  value={editSubName}
                  onChange={(e) => setEditSubName(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSubcategory(null)}
                  className="h-11 px-5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !editSubName.trim()}
                  className="h-11 px-6 bg-brand-primary text-white rounded-xl text-sm font-black hover:bg-brand-primary-hover transition flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete Category Confirmation */}
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
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMain}
                disabled={saving}
                className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition flex items-center gap-1.5 disabled:opacity-50 shadow-md cursor-pointer"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Subcategory Confirmation */}
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
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSub}
                disabled={saving}
                className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition flex items-center gap-1.5 disabled:opacity-50 shadow-md cursor-pointer"
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
