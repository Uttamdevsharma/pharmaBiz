"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Supplier } from "@/types";
import { showAlert } from "@/lib/swal";
import {
  Truck,
  Plus,
  Search,
  Receipt,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  CreditCard,
  CheckCircle2,
  MapPin,
  Mail,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  X,
  ArrowUpRight,
  PhoneCall,
} from "lucide-react";

interface SuppliersViewProps {
  onNavigate: (module: any, extra?: any) => void;
  onSelectSupplier?: (supplierId: string) => void;
}

export function SuppliersView({ onNavigate, onSelectSupplier }: SuppliersViewProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", pageSize.toString());
      if (debouncedSearch.trim()) {
        params.append("search", debouncedSearch.trim());
      }

      const res = await fetchApi(`/suppliers?${params.toString()}`);
      if (res.success && res.data) {
        setSuppliers(res.data);
        const meta = (res as any).pagination || res.meta;
        if (meta) {
          setTotalPages(meta.totalPages || Math.max(1, Math.ceil((meta.total || 0) / pageSize)));
          setTotalCount(meta.total ?? res.data.length ?? 0);
        } else {
          setTotalPages(Math.max(1, Math.ceil(res.data.length / pageSize)));
          setTotalCount(res.data.length);
        }
      }
    } catch (err) {
      console.error("Failed to load suppliers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [page, pageSize, debouncedSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(search);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const handleOpenCreate = () => {
    onNavigate("sup_create_supplier");
  };

  const handleOpenEdit = (sup: Supplier, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSupplier(sup);
    setFormData({
      name: sup.name,
      phone: sup.phone || "",
      email: sup.email || "",
      address: sup.address || "",
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const url = editingSupplier ? `/suppliers/${editingSupplier.id}` : "/suppliers";
      const method = editingSupplier ? "PATCH" : "POST";

      const res = await fetchApi(url, {
        method,
        body: JSON.stringify(formData),
      });

      if (!res.success) throw new Error(res.message || "Failed to save supplier");

      const successText = editingSupplier
        ? `Supplier "${formData.name}" updated successfully!`
        : `Supplier "${formData.name}" created successfully!`;

      setSuccess(successText);
      setModalOpen(false);
      showAlert.success(
        editingSupplier ? "Supplier Updated!" : "Supplier Created Successfully!",
        successText
      );
      loadSuppliers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const msg = err.message || "Failed to save supplier";
      setError(msg);
      showAlert.error("Operation Failed", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await showAlert.confirm(
      "Delete Supplier?",
      `Are you sure you want to remove supplier "${name}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      const res = await fetchApi(`/suppliers/${id}`, { method: "DELETE" });
      if (res.success) {
        setSuppliers((prev) => prev.filter((s) => s.id !== id));
        setTotalCount((c) => Math.max(0, c - 1));
        showAlert.success("Supplier Deleted", `Supplier "${name}" has been removed.`);
      } else {
        showAlert.error("Delete Failed", res.message || "Failed to delete supplier");
      }
    } catch (err: any) {
      showAlert.error("Error", err.message || "Delete error");
    }
  };

  // Pagination calculation
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  return (
    <div className="space-y-6">
      {/* Top Header - Matches Other Sections */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Supplier Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Suppliers</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="h-7 w-7 text-brand-primary" />
            Suppliers & Companies
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("sup_purchase_history")}
            className="h-11 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <Receipt className="h-4 w-4 text-slate-500" />
            Purchase History
          </button>

          <button
            onClick={() => onNavigate("sup_payments_due")}
            className="h-11 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <CreditCard className="h-4 w-4 text-slate-500" />
            Payments / Due
          </button>

          <button
            onClick={handleOpenCreate}
            className="h-11 px-5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-sm font-black transition flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Supplier
          </button>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2.5 font-bold animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Clean Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search suppliers by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-11 pr-10 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none dark:text-white focus:ring-2 focus:ring-brand-primary/20"
          />
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-500 font-semibold hidden sm:block">
            Total Suppliers: <span className="font-bold text-slate-900 dark:text-white text-base">{totalCount}</span>
          </div>
          <button
            type="button"
            onClick={() => loadSuppliers()}
            className="h-11 w-11 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center transition cursor-pointer"
            title="Refresh directory"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-brand-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* Clean Directory Table (Only Essential Columns: Company, Phone, Location & Email, Actions) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
            <p className="text-sm font-semibold">Loading supplier directory...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Truck className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-base font-bold text-slate-700 dark:text-slate-300">
              {search ? "No matching suppliers found" : "No suppliers registered"}
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 h-11 px-5 bg-brand-primary text-white rounded-xl text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Supplier
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-xs">
                    <th className="py-4 px-4">Supplier / Company</th>
                    <th className="py-4 px-4">Phone Number</th>
                    <th className="py-4 px-4">Location & Address</th>
                    <th className="py-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                  {suppliers.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => onSelectSupplier?.(s.id)}
                      className="hover:bg-slate-50/75 dark:hover:bg-slate-800/50 transition cursor-pointer group"
                    >
                      {/* 1. Supplier / Company */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-3 group-hover:text-brand-primary transition">
                          <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-black text-sm shrink-0">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-black text-sm text-slate-900 dark:text-white group-hover:text-brand-primary transition">
                              {s.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              ID: {s.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Phone */}
                      <td className="py-3.5 px-4">
                        {s.phone ? (
                          <a
                            href={`tel:${s.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-brand-primary transition"
                          >
                            <PhoneCall className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>{s.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* 3. Location & Address */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 max-w-md">
                          {s.address ? (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 truncate">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{s.address}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                          {s.email && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                              <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{s.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 4. Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectSupplier?.(s.id)}
                            className="px-3 py-1.5 bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="View Supplier Profile & Purchases"
                          >
                            <span>Details</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => handleOpenEdit(s, e)}
                            className="p-1.5 text-slate-400 hover:text-brand-primary rounded-lg transition"
                            title="Edit Supplier"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(s.id, s.name, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                            title="Delete Supplier"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {suppliers.map((s) => (
                <div
                  key={s.id}
                  onClick={() => onSelectSupplier?.(s.id)}
                  className="p-4 space-y-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          {s.name}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-400">#{s.id.slice(0, 8)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleOpenEdit(s, e)}
                        className="p-1 text-slate-400 hover:text-brand-primary rounded"
                        title="Edit"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(s.id, s.name, e)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Phone & Address */}
                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    {s.phone && (
                      <a
                        href={`tel:${s.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 font-mono text-slate-800 dark:text-slate-200"
                      >
                        <PhoneCall className="h-3 w-3 text-emerald-500" />
                        <span>{s.phone}</span>
                      </a>
                    )}
                    {s.address && (
                      <div className="flex items-center gap-1 text-slate-400 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{s.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => onSelectSupplier?.(s.id)}
                      className="px-3 py-1 bg-brand-primary text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <span>Details</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Clean Pagination Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Record Status */}
          <div className="text-slate-600 dark:text-slate-400 font-medium">
            Showing <strong className="text-slate-900 dark:text-white font-bold">{startItem}</strong> to{" "}
            <strong className="text-slate-900 dark:text-white font-bold">{endItem}</strong> of{" "}
            <strong className="text-slate-900 dark:text-white font-bold">{totalCount}</strong> records
          </div>

          {/* Controls: Rows per page & Page navigation */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-brand-primary cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Page Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              <div className="px-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="text-slate-900 dark:text-white font-black">{page}</span> / {totalPages}
              </div>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                title="Next Page"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-7 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                <Truck className="h-6 w-6 text-brand-primary" />
                {editingSupplier ? "Edit Supplier" : "Register Supplier"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 text-rose-600 text-sm font-bold rounded-xl flex items-center gap-2 border border-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Square Pharmaceuticals Ltd"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold outline-none focus:ring-2 focus:ring-brand-primary/20 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Phone *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 01711223344"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-brand-primary/20 dark:text-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. orders@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-primary/20 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tejgaon, Dhaka"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-primary/20 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-11 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 px-6 bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-black rounded-xl shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{saving ? "Saving..." : "Save Supplier"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
