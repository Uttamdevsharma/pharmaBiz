"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { Product, Category } from "@/types";
import { Pagination } from "@/components/common/Pagination";
import {
  Package,
  Plus,
  Search,
  Barcode,
  Edit2,
  Trash2,
  Loader2,
  FolderTree,
  X,
} from "lucide-react";

interface ProductListViewProps {
  onNavigate: (module: any) => void;
  onEditProduct: (product: Product) => void;
}

export function ProductListView({ onNavigate, onEditProduct }: ProductListViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const loadVariants = useCallback(async () => {
    try {
      const catsRes = await fetchApi("/products/variants/categories");
      if (catsRes.success && catsRes.data) setCategories(catsRes.data);
    } catch (err) {
      console.error("Failed to load catalog variants", err);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "10");
      if (search) params.append("search", search);
      if (categoryFilter) params.append("categoryId", categoryFilter);
      if (subcategoryFilter) params.append("subcategoryId", subcategoryFilter);

      const res = await fetchApi(`/products?${params.toString()}`);
      if (res.success && res.data) {
        setProducts(res.data);
        if (res.meta) {
          setTotalPages(res.meta.totalPages || 1);
          setTotalItems(res.meta.total || res.data.length || 0);
        }
      }
    } catch (err) {
      console.error("Failed to load products", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, subcategoryFilter]);

  useEffect(() => {
    loadVariants();
  }, [loadVariants]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadProducts();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate and remove "${name}" from catalog?`)) {
      return;
    }
    try {
      const res = await fetchApi(`/products/${id}`, { method: "DELETE" });
      if (res.success) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert(res.message || "Failed to delete product");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete product");
    }
  };

  const activeCategoryObj = categories.find((c) => c.id === categoryFilter);
  const availableSubcategories = activeCategoryObj ? activeCategoryObj.subcategories || [] : [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-1">
            <span>Inventory</span>
            <span>/</span>
            <span className="text-brand-primary">Product List</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Package className="h-7 w-7 text-brand-primary" />
            Product Catalog
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("inv_variants")}
            className="h-11 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold transition flex items-center gap-2"
          >
            <FolderTree className="h-4 w-4 text-brand-primary" />
            Manage Categories
          </button>
          <button
            onClick={() => onNavigate("inv_add_product")}
            className="h-11 px-5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by brand name, generic name, SKU, or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-11 pr-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-primary"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Main Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setSubcategoryFilter("");
              setPage(1);
            }}
            className="h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-brand-primary"
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Subcategory Filter */}
          {availableSubcategories.length > 0 && (
            <select
              value={subcategoryFilter}
              onChange={(e) => {
                setSubcategoryFilter(e.target.value);
                setPage(1);
              }}
              className="h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-brand-primary animate-in fade-in"
            >
              <option value="">All Subcategories ({availableSubcategories.length})</option>
              {availableSubcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          )}

          {(categoryFilter || subcategoryFilter || search) && (
            <button
              onClick={() => {
                setCategoryFilter("");
                setSubcategoryFilter("");
                setSearch("");
                setPage(1);
              }}
              className="h-12 w-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl transition"
              title="Clear Filters"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Product Catalog Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
            <p className="text-sm font-semibold">Loading central product catalog...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Package className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-base font-bold text-slate-700 dark:text-slate-300">No products found</p>
            <p className="text-xs mt-1">Try adjusting your category filters or click "Add Product" to register new items.</p>
          </div>
        ) : (
          <div className="table-responsive-container">
            <table className="w-full min-w-[850px] text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-black text-xs">
                  <th className="py-4 px-4">Product & Specs</th>
                  <th className="py-4 px-4">Category & Subcategory</th>
                  <th className="py-4 px-4">Packaging & Units</th>
                  <th className="py-4 px-4">Barcode</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {products.map((p) => {
                  const isMed =
                    p.category === "Medicine" ||
                    p.categoryRef?.name === "Medicine" ||
                    p.productType === "MEDICINE";
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-4 px-4">
                        <div className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                          {p.name}
                          {p.size && (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-2 py-0.5 rounded font-bold">
                              {p.size}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {p.genericName ? `Generic: ${p.genericName} • ` : ""}
                          {p.brandName || p.brandRef?.name || "Generic"}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-brand-primary/10 text-brand-primary">
                          {p.categoryRef?.name || p.category || "Medicine"}
                        </span>
                        {(p.subcategoryRef?.name || p.subcategory) && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 flex items-center gap-1">
                            <span>›</span>
                            <span>{p.subcategoryRef?.name || p.subcategory}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {isMed && p.stripsPerBox && p.tabletsPerStrip && p.tabletsPerStrip > 1 ? (
                          <span>
                            1 Box = {p.stripsPerBox} Strips ({p.stripsPerBox * p.tabletsPerStrip} Tabs)
                          </span>
                        ) : p.stripsPerBox && p.stripsPerBox > 1 ? (
                          <span>
                            1 Box = {p.stripsPerBox} {p.unit}s
                          </span>
                        ) : (
                          <span>Single {p.unit}</span>
                        )}
                      </td>

                      <td className="py-4 px-4 font-mono text-slate-600 dark:text-slate-400 text-xs font-bold">
                        {p.barcode ? (
                          <span className="flex items-center gap-1.5">
                            <Barcode className="h-4 w-4 text-slate-400" />
                            {p.barcode}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onEditProduct(p)}
                            className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition"
                            title="Edit Product"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 transition"
                            title="Deactivate Product"
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

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={10}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
