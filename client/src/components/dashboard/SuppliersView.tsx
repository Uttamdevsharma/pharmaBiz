"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Supplier } from "@/types";
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  Receipt,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  Building,
  CreditCard,
  CheckCircle2,
  User,
  MapPin,
} from "lucide-react";

interface SuppliersViewProps {
  onNavigate: (module: any) => void;
  onSelectSupplier?: (supplierId: string) => void;
}

export function SuppliersView({ onNavigate, onSelectSupplier }: SuppliersViewProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
  });

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      const res = await fetchApi(`/suppliers?${params.toString()}`);
      if (res.success && res.data) {
        setSuppliers(res.data);
      }
    } catch (err) {
      console.error("Failed to load suppliers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadSuppliers();
  };

  const handleOpenCreate = () => {
    onNavigate("sup_create_supplier");
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name,
      contactPerson: sup.contactPerson || "",
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
      const method = editingSupplier ? "PUT" : "POST";

      const res = await fetchApi(url, {
        method,
        body: JSON.stringify(formData),
      });

      if (!res.success) throw new Error(res.message || "Failed to save supplier");

      setSuccess(`Supplier "${formData.name}" saved successfully!`);
      setModalOpen(false);
      loadSuppliers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove supplier "${name}"?`)) return;
    try {
      const res = await fetchApi(`/suppliers/${id}`, { method: "DELETE" });
      if (res.success) {
        setSuppliers((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert(res.message || "Failed to delete supplier");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Supplier Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Suppliers</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="h-6 w-6 text-brand-primary" />
            Suppliers & Companies
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Directory of medicine companies and distributors. Click any supplier to view contacts and purchase history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("sup_purchase_history")}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Receipt className="h-4 w-4" />
            Purchase History
          </button>
          <button
            onClick={() => onNavigate("sup_payments_due")}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <CreditCard className="h-4 w-4" />
            Payments / Due
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Create Supplier
          </button>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-bold animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search suppliers by company name, representative, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
          />
        </form>
        <div className="text-xs text-slate-500 font-semibold">
          Total Suppliers: <span className="font-bold text-slate-900 dark:text-white">{suppliers.length}</span>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
            <p className="text-xs">Loading supplier directory...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Truck className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No suppliers registered</p>
            <p className="text-xs mt-1">Click "Create Supplier" above to record company and distributor information.</p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Create Supplier
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3.5 px-4">Supplier / Company</th>
                  <th className="py-3.5 px-4">Contacts / SRs</th>
                  <th className="py-3.5 px-4">Phone & Address</th>
                  <th className="py-3.5 px-4">Total Purchased</th>
                  <th className="py-3.5 px-4">Total Paid</th>
                  <th className="py-3.5 px-4">Current Due</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {suppliers.map((s) => {
                  const total = Number(s.totalPurchased || 0);
                  const paid = Number(s.totalPaid || 0);
                  const due = Number(s.totalDue || 0);
                  const contactsCount = (s as any).contacts?.length || (s as any)._count?.contacts || 0;

                  return (
                    <tr
                      key={s.id}
                      onClick={() => onSelectSupplier?.(s.id)}
                      className="hover:bg-slate-50/75 dark:hover:bg-slate-800/50 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 group-hover:text-brand-primary transition">
                          <div className="w-8 h-8 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-black shrink-0">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-black text-xs text-slate-900 dark:text-white group-hover:text-brand-primary transition flex items-center gap-1.5">
                              {s.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              ID: {s.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-bold text-[11px] flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {contactsCount > 0 ? `${contactsCount} Contact${contactsCount > 1 ? "s" : ""}` : "1 Contact"}
                          </span>
                        </div>
                        {s.contactPerson && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5 truncate max-w-[150px]">
                            {s.contactPerson}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {s.phone ? (
                          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {s.phone}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                        {s.address && (
                          <div className="text-slate-400 text-[10px] truncate max-w-[180px] mt-0.5">
                            {s.address}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-black font-mono text-slate-900 dark:text-white">
                        ৳{total.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ৳{paid.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold">
                        {due > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-900/50">
                            ৳{due.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Cleared</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectSupplier?.(s.id)}
                            className="px-2.5 py-1 bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white rounded-lg text-[10px] font-bold transition"
                          >
                            View Details →
                          </button>
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1 text-slate-400 hover:text-brand-primary rounded-lg transition"
                            title="Edit Supplier"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id, s.name)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition"
                            title="Delete Supplier"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
      </div>

      {/* Add / Edit Supplier Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="h-5 w-5 text-brand-primary" />
              {editingSupplier ? "Edit Supplier Details" : "Register New Supplier"}
            </h3>

            {error && (
              <div className="p-3 bg-rose-50 text-rose-600 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Company / Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Square Pharmaceuticals Ltd, Beximco Pharma, Incepta"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Representative
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Md. Karim (Sales Rep / SR)"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 01711223344"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. orders@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Warehouse / Office Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tejgaon Industrial Area, Dhaka"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
