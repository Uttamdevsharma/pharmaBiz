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
  Trash2,
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

  const handleAddSubcategoryField = () => {
    setSubcategories((prev) => [...prev, ""]);
  };

  const handleSubcategoryChange = (index: number, value: string) => {
    setSubcategories((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleRemoveSubcategoryField = (index: number) => {
    setSubcategories((prev) => {
      if (prev.length <= 1) return [""];
      return prev.filter((_, i) => i !== index);
    });
  };

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

      // Support multi-line subcategories and comma-separated entries
      const validSubcategories = subcategories
        .flatMap((s) => s.split(","))
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

      const msg = `Category "${categoryName.trim()}" created successfully${
        validSubcategories.length > 0
          ? ` with ${validSubcategories.length} subcategor${validSubcategories.length === 1 ? "y" : "ies"}`
          : ""
      }!`;
      setSuccessMsg(msg);
      showAlert.success("Success", msg);
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
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Category Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Create Category</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-brand-primary" />
            Create Category
          </h2>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate("cat_list")}
            className="h-9 px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-2 shrink-0 cursor-pointer border border-slate-200/80 dark:border-slate-700"
          >
            <List className="h-4 w-4" />
            Category List
          </button>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-3 font-medium animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate("cat_list")}
              className="h-7 px-2.5 bg-emerald-600 text-white rounded-md text-xs font-semibold hover:bg-emerald-700 transition flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>View List</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 font-medium animate-in fade-in">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Clean Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4"
      >
        {/* Category Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Category Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Enter category name (e.g. Medicine, Syrup, Saline)"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            className="w-full h-10 px-3.5 bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white placeholder:text-xs placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 transition"
          />
        </div>

        {/* Subcategories Section */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Subcategories <span className="text-xs font-normal text-slate-400">(Optional)</span>
            </label>
            <button
              type="button"
              onClick={handleAddSubcategoryField}
              className="px-2.5 py-1 rounded-lg border border-brand-primary/30 hover:border-brand-primary hover:bg-brand-primary/5 text-brand-primary text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Subcategory</span>
            </button>
          </div>

          <div className="space-y-2">
            {subcategories.map((sub, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder={
                      index === 0
                        ? "Enter subcategory name (e.g. Tablet)"
                        : index === 1
                        ? "Enter subcategory name (e.g. Capsule)"
                        : index === 2
                        ? "Enter subcategory name (e.g. Syrup)"
                        : `Enter subcategory name #${index + 1}`
                    }
                    value={sub}
                    onChange={(e) => handleSubcategoryChange(index, e.target.value)}
                    className="w-full h-10 px-3.5 bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white placeholder:text-xs placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 transition"
                  />
                </div>
                {subcategories.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSubcategoryField(index)}
                    className="h-10 w-10 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition flex items-center justify-center shrink-0 cursor-pointer"
                    title="Remove this subcategory"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">
            Click <strong>+ Add Subcategory</strong> to add as many subcategories as you want under this category.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setCategoryName("");
              setSubcategories([""]);
              setError(null);
            }}
            className="h-9 px-4 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving || !categoryName.trim()}
            className="h-9 px-4.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save Category</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
