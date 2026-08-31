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

  // Create Subcategory Form
  const [selectedParentId, setSelectedParentId] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newSubcategoryUnit, setNewSubcategoryUnit] = useState("tablet");
  const [newSubcategoryDesc, setNewSubcategoryDesc] = useState("");

  // Edit Subcategory Modal
  const [editingSubcategory, setEditingSubcategory] = useState<{
    id: string;
    name: string;
    parentId: string;
    parentName: string;
    defaultUnit: string;
    description: string;
  } | null>(null);
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editDesc, setEditDesc] = useState("");

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
    const parent = categories.find((c) => c.id === parentId);
    if (!parent) return;
    if (parent.name === "Medicine") setNewSubcategoryUnit("tablet");
    else if (parent.name === "Syrup") setNewSubcategoryUnit("bottle");
    else if (parent.name === "Medical Equipment") setNewSubcategoryUnit("piece");
    else if (parent.name.includes("Saline")) setNewSubcategoryUnit("bag");
    else setNewSubcategoryUnit("piece");
  };

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
          defaultUnit: newSubcategoryUnit || null,
          description: newSubcategoryDesc.trim() || null,
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to create subcategory");

      setSuccess(`Subcategory "${newSubcategoryName.trim()}" created successfully!`);
      setNewSubcategoryName("");
      setNewSubcategoryDesc("");
      loadData();
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
      defaultUnit: sub.defaultUnit || "",
      description: sub.description || "",
    });
    setEditName(sub.name);
    setEditUnit(sub.defaultUnit || "");
    setEditDesc(sub.description || "");
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
          defaultUnit: editUnit.trim() || null,
          description: editDesc.trim() || null,
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to update subcategory");

      setSuccess(`Subcategory "${editName.trim()}" updated successfully!`);
      setEditingSubcategory(null);
      loadData();
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
      loadData();
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
      loadData();
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
    if (name.includes("Medicine")) {
      return {
        icon: <Pill className="h-5 w-5 text-emerald-500" />,
        badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        accent: "text-emerald-600 dark:text-emerald-400",
        bgLight: "bg-emerald-50/50 dark:bg-emerald-950/20",
        defaultUnits: ["tablet", "capsule", "tube", "strip", "box"],
      };
    }
    if (name.includes("Syrup")) {
      return {
        icon: <Droplets className="h-5 w-5 text-blue-500" />,
        badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        accent: "text-blue-600 dark:text-blue-400",
        bgLight: "bg-blue-50/50 dark:bg-blue-950/20",
        defaultUnits: ["bottle", "ml", "suspension"],
      };
    }
    if (name.includes("Equipment")) {
      return {
        icon: <Stethoscope className="h-5 w-5 text-purple-500" />,
        badgeColor: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800",
        accent: "text-purple-600 dark:text-purple-400",
        bgLight: "bg-purple-50/50 dark:bg-purple-950/20",
        defaultUnits: ["piece", "box", "set", "pack"],
      };
    }
    if (name.includes("Saline")) {
      return {
        icon: <Syringe className="h-5 w-5 text-cyan-500" />,
        badgeColor: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
        accent: "text-cyan-600 dark:text-cyan-400",
        bgLight: "bg-cyan-50/50 dark:bg-cyan-950/20",
        defaultUnits: ["bag", "bottle", "ml"],
      };
    }
    return {
      icon: <Package className="h-5 w-5 text-amber-500" />,
      badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      accent: "text-amber-600 dark:text-amber-400",
      bgLight: "bg-amber-50/50 dark:bg-amber-950/20",
      defaultUnits: ["piece", "pack", "tin", "tube", "bottle"],
    };
  };

  const totalSubcategories = categories.reduce((acc, c) => acc + (c.subcategories?.length || 0), 0);

  // Filtered categories based on Search & Selected Category
  const filteredCategories = useMemo(() => {
    return categories
      .filter((c) => (selectedCategoryFilter === "ALL" ? true : c.id === selectedCategoryFilter))
      .map((c) => {
        if (!searchQuery.trim()) return c;
        const q = searchQuery.toLowerCase();
        const matchesCategory = c.name.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q);
        const matchedSubcategories = (c.subcategories || []).filter(
          (sub) => sub.name.toLowerCase().includes(q) || (sub.description || "").toLowerCase().includes(q)
        );
        if (matchesCategory) return c;
        return {
          ...c,
          subcategories: matchedSubcategories,
        };
      })
      .filter((c) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.description || "").toLowerCase().includes(q) ||
          (c.subcategories && c.subcategories.length > 0)
        );
      });
  }, [categories, selectedCategoryFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Inventory</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Category Management</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FolderTree className="h-6 w-6 text-brand-primary" />
            Category & Subcategory Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize catalog under the 5 standard Main Categories and create optional subcategories (e.g. Antibiotics, Antipyretics, Eye Drops).
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === "categories"
                ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Main Categories & Subcategories ({totalSubcategories})
          </button>
          <button
            onClick={() => setActiveTab("brands")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === "brands"
                ? "bg-white dark:bg-slate-900 text-brand-primary shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Building className="h-3.5 w-3.5" />
            Manufacturers & Brands ({brands.length})
          </button>
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
          {/* Overview Stat Cards for the 5 Main Categories */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {categories.map((c) => {
              const meta = getMainCategoryMeta(c.name);
              const isSelected = selectedCategoryFilter === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategoryFilter(isSelected ? "ALL" : c.id)}
                  className={`p-4 rounded-2xl border text-left transition relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? "bg-white dark:bg-slate-900 border-brand-primary ring-2 ring-brand-primary/20 shadow-sm"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                      {meta.icon}
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {c.subcategories?.length || 0} sub
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {c.name}
                    </h4>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {c._count?.products || 0} products
                    </div>
                  </div>
                </button>
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
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-bold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subcategory Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Antibiotics, Antipyretics, Eye Drops"
                    value={newSubcategoryName}
                    onChange={(e) => setNewSubcategoryName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Default Unit (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. tablet, capsule, bottle, bag, piece, tube"
                    value={newSubcategoryUnit}
                    onChange={(e) => setNewSubcategoryUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-medium"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {["tablet", "capsule", "bottle", "piece", "bag", "tube", "tin", "pack"].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setNewSubcategoryUnit(u)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border transition ${
                          newSubcategoryUnit === u
                            ? "bg-brand-primary text-white border-brand-primary"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of this clinical classification..."
                    value={newSubcategoryDesc}
                    onChange={(e) => setNewSubcategoryDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-medium resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving || !selectedParentId}
                  className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add Subcategory
                </button>
              </form>
            </div>

            {/* Hierarchical Categories & Subcategories List */}
            <div className="lg:col-span-8 space-y-4">
              {/* Filter Bar */}
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
                    <span>Show All (5)</span>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {loading ? (
                <div className="p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-primary mb-2" />
                  <p className="text-xs font-medium">Loading category hierarchy...</p>
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <FolderTree className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No matching categories found</p>
                  <p className="text-[11px] text-slate-400 mt-1">Try clearing your search query.</p>
                </div>
              ) : (
                filteredCategories.map((mainCat) => {
                  const meta = getMainCategoryMeta(mainCat.name);
                  const subcats = mainCat.subcategories || [];

                  return (
                    <div
                      key={mainCat.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
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
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {mainCat.description || "Standard canonical core category"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            {subcats.length} subcategories
                          </span>
                          <button
                            onClick={() => {
                              setSelectedParentId(mainCat.id);
                              handleParentChange(mainCat.id);
                            }}
                            className="text-xs font-bold text-brand-primary hover:bg-brand-primary/10 px-2.5 py-1 rounded-lg transition flex items-center gap-1"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Under {mainCat.name}
                          </button>
                        </div>
                      </div>

                      {/* Subcategories List */}
                      {subcats.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-xs">
                          No subcategories created yet under {mainCat.name}. Use the form on the left to add one.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {subcats.map((sub) => {
                            const prodCount = sub._count?.subProducts || 0;
                            return (
                              <div
                                key={sub.id}
                                className="p-3.5 pl-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 flex items-center justify-between transition"
                              >
                                <div className="flex items-center gap-3">
                                  <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
                                  <div>
                                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                      {sub.name}
                                      {sub.defaultUnit && (
                                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                          unit: {sub.defaultUnit}
                                        </span>
                                      )}
                                      {prodCount > 0 && (
                                        <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded-full">
                                          {prodCount} {prodCount === 1 ? "product" : "products"}
                                        </span>
                                      )}
                                    </div>
                                    {sub.description && (
                                      <div className="text-[11px] text-slate-400 mt-0.5">
                                        {sub.description}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
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
              <Plus className="h-4 w-4 text-brand-primary" />
              Add Pharmaceutical Brand
            </h3>
            <form onSubmit={handleCreateBrand} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Brand / Manufacturer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Beximco, Square Pharma, Incepta, Renata"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Country (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Local manufacturer, multinational, generic exporter"
                  value={newBrandDesc}
                  onChange={(e) => setNewBrandDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Register Brand
              </button>
            </form>
          </div>

          {/* Brands List */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-brand-primary mb-2" />
                <p className="text-xs">Loading brands...</p>
              </div>
            ) : brands.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Building className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-bold">No brands registered yet</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-bold text-[10px]">
                    <th className="py-3 px-4">Brand / Manufacturer Name</th>
                    <th className="py-3 px-4">Catalog Products</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {brands.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {b.name}
                        {b.description && (
                          <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                            {b.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {b._count?.products || 0} products
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteBrand(b.id, b.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                          title="Delete Brand"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Edit Subcategory Modal */}
      {editingSubcategory && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-brand-primary" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Edit Subcategory
                </h3>
              </div>
              <button
                onClick={() => setEditingSubcategory(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
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
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Default Unit (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. tablet, capsule, bottle, piece, bag"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none font-medium resize-none"
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

      {/* Delete Subcategory Confirmation Modal */}
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
