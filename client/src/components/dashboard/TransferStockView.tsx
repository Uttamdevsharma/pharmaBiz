"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Branch, Product } from "@/types";
import {
  ArrowLeftRight,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Store,
} from "lucide-react";

interface TransferStockViewProps {
  onNavigate: (module: any) => void;
}

export function TransferStockView({ onNavigate }: TransferStockViewProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    fromBranchId: "",
    toBranchId: "",
    productId: "",
    quantity: 10,
    notes: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [bRes, pRes] = await Promise.all([
          fetchApi("/branches"),
          fetchApi("/products?limit=150"),
        ]);

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
        console.error("Failed to load transfer setup data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.fromBranchId === formData.toBranchId) {
      setError("Source branch and destination branch cannot be the same");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(false);

      const res = await fetchApi("/transfers", {
        method: "POST",
        body: JSON.stringify({
          fromBranchId: formData.fromBranchId,
          toBranchId: formData.toBranchId,
          productId: formData.productId,
          quantity: Number(formData.quantity),
          notes: formData.notes || null,
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to create transfer request");

      setSuccess(true);
      setTimeout(() => {
        onNavigate("stock_transfer_history");
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to initiate transfer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Stock Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Transfer Stock</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-brand-primary" />
            Create Inter-Branch Stock Transfer Request
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Transfer medications between pharmacy branch locations with automated stock balance transfers and audit logs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("stock_transfer_history")}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Transfer History
        </button>
      </div>

      {/* Success / Error alerts */}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <div className="font-bold text-xs text-emerald-900 dark:text-emerald-200">
              Transfer Request Initiated!
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
              Dispatched to recipient branch. Redirecting to Transfer History...
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-300 text-xs">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleCreateTransfer} className="space-y-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Store className="h-4 w-4 text-brand-primary" />
            Branch Routing & Product Selection
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                From (Source Branch) *
              </label>
              <select
                required
                value={formData.fromBranchId}
                onChange={(e) => setFormData({ ...formData, fromBranchId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none font-bold"
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
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none font-bold"
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
              Select Product to Transfer *
            </label>
            <select
              required
              value={formData.productId}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none font-bold"
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
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Transfer Notes / Dispatch Reason
            </label>
            <input
              type="text"
              placeholder="e.g. Urgent stock requisition for outpatient counter"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => onNavigate("stock_transfer_history")}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Dispatching...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Submit Transfer Request
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
