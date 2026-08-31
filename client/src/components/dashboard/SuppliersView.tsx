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
}

export function SuppliersView({ onNavigate }: SuppliersViewProps) {
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
    setEditingSupplier(null);
    setFormData({
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
    });
    setError(null);
    setModalOpen(true);
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
            Distributor & Supplier Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage pharmaceutical companies, wholesale distributors, contact representatives, and trade terms.
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
            Add Supplier
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
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
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
            <p className="text-xs mt-1">Click "Add Supplier" above to record company and distributor information.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3.5 px-4">Company / Supplier Name</th>
                  <th className="py-3.5 px-4">Contact Representative & Phone</th>
                  <th className="py-3.5 px-4">Address & Email</th>
                  <th className="py-3.5 px-4">Total Purchases</th>
                  <th className="py-3.5 px-4">Paid / Due Balance</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {suppliers.map((s) => {
                  const total = Number(s.totalPurchased || 0);
                  const paid = Number(s.totalPaid || 0);
                  const due = Number(s.totalDue || 0);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-brand-primary shrink-0" />
                          {s.name}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400" />
                          {s.contactPerson || "Direct Company / General"}
                        </div>
                        {s.phone && (
                          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500 mt-0.5">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {s.phone}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {s.address ? (
                          <div className="text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[200px]">{s.address}</span>
                          </div>
                        ) : (
                          <div className="text-slate-400 text-[11px]">—</div>
                        )}
                        {s.email && (
                          <div className="flex items-center gap-1 text-slate-400 text-[10px] mt-0.5">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[200px]">{s.email}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-black font-mono text-slate-900 dark:text-white">
                        ৳{total.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-emerald-600 font-bold font-mono">Paid: ৳{paid.toFixed(2)}</div>
                        {due > 0 ? (
                          <div className="text-rose-600 font-bold font-mono text-[11px]">
                            Due: ৳{due.toFixed(2)}
                          </div>
                        ) : (
                          <div className="text-slate-400 text-[10px]">Cleared</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onNavigate("sup_purchase_history")}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold"
                          >
                            Invoices
                          </button>
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1 text-slate-400 hover:text-brand-primary rounded-lg"
                            title="Edit Supplier"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id, s.name)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
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
