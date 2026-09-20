"use client";

import React, { useState } from "react";
import { fetchApi } from "@/lib/api";
import { showAlert } from "@/lib/swal";
import {
  FolderTree,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  List,
  Sparkles,
} from "lucide-react";

interface CreateCategoryViewProps {
  onNavigate?: (module: any) => void;
}

export function CreateCategoryView({ onNavigate }: CreateCategoryViewProps) {
  const [categoryName, setCategoryName] = useState("");
  const [subcategories, setSubcategories] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAddSubcategoryInput = () => {
    setSubcategories((prev) => [...prev, ""]);
  };

  const handleRemoveSubcategoryInput = (index: number) => {
    setSubcategories((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubcategoryChange = (index: number, value: string) => {
    setSubcategories((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setError("Category Name is required");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      // Filter out empty subcategory strings
      const validSubcategories = subcategories
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const res = await fetchApi("/products/variants/categories", {
        method: "POST",
        body: JSON.stringify({
          name: categoryName.trim(),
          subcategories: validSubcategories.length > 0 ? validSubcategories : undefined,
          isActive: true,
        }),
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to create Category");
      }

      const msg = `Category "${categoryName.trim()}" created successfully ${
        validSubcategories.length > 0
          ? `with ${validSubcategories.length} subcategory(ies)`
          : ""
      }!`;
      setSuccessMsg(msg);
      showAlert.success("Category Created Successfully!", msg);
      setCategoryName("");
      setSubcategories([""]);
    } catch (err: any) {
      const msg = err.message || "An unexpected error occurred";
      setError(msg);
      showAlert.error("Creation Failed", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Category Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Create Category</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FolderTree className="h-7 w-7 text-brand-primary" />
            Create Category
          </h2>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate("cat_list")}
            className="h-11 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold transition flex items-center gap-2 shrink-0"
          >
            <List className="h-4 w-4" />
            Category List
          </button>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-emerald-800 dark:text-emerald-300 text-sm flex items-center justify-between gap-3 font-bold animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate("cat_list")}
              className="h-9 px-3.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1 shrink-0"
            >
              Go to List
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-800 dark:text-rose-300 text-sm flex items-center gap-2 font-bold">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Creation Card */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        {/* Category Name Section */}
        <div>
          <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
            Category Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Medicine, Syrup, Medical Equipment, Saline"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-base font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20 transition"
          />
        </div>

        {/* Subcategories Section */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-primary" />
              Subcategories (Optional)
            </h3>
            <button
              type="button"
              onClick={handleAddSubcategoryInput}
              className="h-9 px-3.5 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Subcategory
            </button>
          </div>

          <div className="space-y-3">
            {subcategories.map((sub, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder={`Subcategory #${index + 1} (e.g. Tablet, Capsule, Cream)`}
                    value={sub}
                    onChange={(e) => handleSubcategoryChange(index, e.target.value)}
                    className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/20 transition"
                  />
                </div>
                {subcategories.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSubcategoryInput(index)}
                    className="h-11 w-11 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition shrink-0"
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setCategoryName("");
              setSubcategories([""]);
              setError(null);
            }}
            className="h-11 px-5 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving || !categoryName.trim()}
            className="h-11 px-6 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-2xl text-sm font-black transition flex items-center gap-2 shadow-md disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Category
          </button>
        </div>
      </form>
    </div>
  );
}
