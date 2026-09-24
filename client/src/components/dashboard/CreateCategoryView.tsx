"use client";

import React, { useState } from "react";
import { fetchApi } from "@/lib/api";
import { showAlert } from "@/lib/swal";
import {
  FolderTree,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  List,
} from "lucide-react";

interface CreateCategoryViewProps {
  onNavigate?: (module: any) => void;
}

export function CreateCategoryView({ onNavigate }: CreateCategoryViewProps) {
  const [categoryName, setCategoryName] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setError("Category Name is required.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      // Support single or comma-separated subcategories (e.g. "Tablet" or "Tablet, Capsule")
      const validSubcategories = subcategoryName
        .split(",")
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

      const msg = `Category "${categoryName.trim()}" created successfully!`;
      setSuccessMsg(msg);
      showAlert.success("Success", msg);
      setCategoryName("");
      setSubcategoryName("");
    } catch (err: any) {
      const msg = err.message || "An unexpected error occurred";
      setError(msg);
      showAlert.error("Creation Failed", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Category Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Create Category</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FolderTree className="h-6 w-6 text-brand-primary" />
            Create Category
          </h2>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate("cat_list")}
            className="h-10 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold transition flex items-center gap-2 shrink-0 cursor-pointer"
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
              className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>View List</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-800 dark:text-rose-300 text-sm flex items-center gap-2.5 font-bold animate-in fade-in">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Clean Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-5"
      >
        {/* Category Name */}
        <div>
          <label className="block text-sm font-black text-slate-800 dark:text-slate-200 mb-2">
            Category Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Enter category name (e.g. Medicine, Syrup, Saline)"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-base font-bold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal outline-none focus:ring-2 focus:ring-brand-primary/20 transition"
          />
        </div>

        {/* Subcategory Name */}
        <div>
          <label className="block text-sm font-black text-slate-800 dark:text-slate-200 mb-2">
            Subcategory Name <span className="text-xs font-normal text-slate-400">(Optional)</span>
          </label>
          <input
            type="text"
            placeholder="Enter subcategory name (e.g. Tablet, Capsule)"
            value={subcategoryName}
            onChange={(e) => setSubcategoryName(e.target.value)}
            className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-base font-bold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal outline-none focus:ring-2 focus:ring-brand-primary/20 transition"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setCategoryName("");
              setSubcategoryName("");
              setError(null);
            }}
            className="h-11 px-5 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving || !categoryName.trim()}
            className="h-11 px-6 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-2xl text-sm font-black transition flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Category</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
