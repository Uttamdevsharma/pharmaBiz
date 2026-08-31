"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Branch, Product } from "@/types";
import {
  ArrowLeftRight,
  Plus,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";

interface TransferModuleProps {
  subAction?: string;
}

export function TransferModule({ subAction }: TransferModuleProps = {}) {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fromBranchId: "",
    toBranchId: "",
    productId: "",
    quantity: 10,
    notes: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [tRes, bRes, pRes] = await Promise.all([
        fetchApi("/transfers"),
        fetchApi("/branches"),
        fetchApi("/products?limit=100"),
      ]);

      if (tRes.success && tRes.data) setTransfers(tRes.data);
      if (bRes.success && bRes.data) {
        setBranches(bRes.data);
        if (bRes.data.length >= 2) {
          setFormData((prev) => ({
            ...prev,
            fromBranchId: bRes.data[0].id,
            toBranchId: bRes.data[1].id,
          }));
        }
      }
      if (pRes.success && pRes.data) {
        setProducts(pRes.data);
        if (pRes.data.length > 0) {
          setFormData((prev) => ({ ...prev, productId: pRes.data[0].id }));
        }
      }
    } catch (err) {
      console.error("Failed to load transfers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle subAction from sidebar
  useEffect(() => {
    if (subAction === "stock:transfer_stock") {
      setModalOpen(true);
    } else if (subAction === "stock:transfer_history" || subAction === "stock:stock_receive") {
      setModalOpen(false);
    }
  }, [subAction]);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.fromBranchId === formData.toBranchId) {
      setError("Source and destination branches cannot be the same");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetchApi("/transfers", {
        method: "POST",
        body: JSON.stringify({
          fromBranchId: formData.fromBranchId,
          toBranchId: formData.toBranchId,
          notes: formData.notes || null,
          items: [
            {
              productId: formData.productId,
              quantity: Number(formData.quantity),
            },
          ],
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to create transfer request");

      setModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetchApi(`/transfers/${id}/approve`, { method: "PATCH" });
      if (res.success) loadData();
      else alert(res.message || "Failed to approve transfer");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const res = await fetchApi(`/transfers/${id}/complete`, { method: "PATCH" });
      if (res.success) loadData();
      else alert(res.message || "Failed to complete transfer");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowLeftRight className="h-6 w-6 text-brand-primary" />
              Inter-Branch Stock Transfers
            </h1>
            <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
              Multi-Branch Logistics
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Request, approve, and transfer medicines between branches with atomic stock deduction and destination crediting.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:opacity-95 transition"
        >
          <Plus className="h-4 w-4" />
          New Transfer Request
        </button>
      </div>

      {/* Transfer List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
            <p className="text-xs">Loading branch transfers...</p>
          </div>
        ) : transfers.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <ArrowLeftRight className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No stock transfers found</p>
            <p className="text-xs mt-1">Create a transfer request between branches when inventory is needed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3.5 px-4">Transfer ID & Date</th>
                  <th className="py-3.5 px-4">Source Branch (From)</th>
                  <th className="py-3.5 px-4">Destination Branch (To)</th>
                  <th className="py-3.5 px-4">Items & Quantity</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {transfers.map((t) => {
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          #{t.id.substring(0, 8)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {t.fromBranch?.name || "Source Branch"}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {t.toBranch?.name || "Destination Branch"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-brand-primary">
                          {t.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0} total units
                        </span>
                        <div className="text-[10px] text-slate-400">({t.items?.length || 0} line items)</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            t.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40"
                              : t.status === "APPROVED"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40"
                              : t.status === "PENDING"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/40"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {t.status === "PENDING" && (
                            <button
                              onClick={() => handleApprove(t.id)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold"
                            >
                              Approve
                            </button>
                          )}
                          {t.status === "APPROVED" && (
                            <button
                              onClick={() => handleComplete(t.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-sm"
                            >
                              Confirm Received
                            </button>
                          )}
                          {t.status === "COMPLETED" && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Settled
                            </span>
                          )}
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

      {/* CREATE TRANSFER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-brand-primary" />
                Create Inter-Branch Transfer Request
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateTransfer} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    From (Source Branch) *
                  </label>
                  <select
                    required
                    value={formData.fromBranchId}
                    onChange={(e) => setFormData({ ...formData, fromBranchId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none font-bold"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    To (Destination Branch) *
                  </label>
                  <select
                    required
                    value={formData.toBranchId}
                    onChange={(e) => setFormData({ ...formData, toBranchId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none font-bold"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Product to Transfer *
                </label>
                <select
                  required
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none font-bold"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.size ? `(${p.size})` : ""} {p.genericName ? `[${p.genericName}]` : ""} - {p.brandName || "Generic"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Transfer Quantity (Lowest Units) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Transfer Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Urgent restock for evening rush"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-brand-primary text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Submit Transfer Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
