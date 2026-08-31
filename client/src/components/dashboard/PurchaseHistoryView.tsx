"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Supplier } from "@/types";
import {
  Receipt,
  Truck,
  Plus,
  Loader2,
  CreditCard,
  FileText,
  X,
} from "lucide-react";

interface PurchaseHistoryViewProps {
  onNavigate: (module: any) => void;
}

export function PurchaseHistoryView({ onNavigate }: PurchaseHistoryViewProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Invoice Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);

  useEffect(() => {
    async function loadSuppliers() {
      try {
        const res = await fetchApi("/suppliers");
        if (res.success && res.data) {
          setSuppliers(res.data);
        }
      } catch (err) {
        console.error("Failed to load suppliers", err);
      }
    }
    loadSuppliers();
  }, []);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      const url = selectedSupplierId
        ? `/suppliers/${selectedSupplierId}/purchases`
        : "/suppliers";

      if (selectedSupplierId) {
        const res = await fetchApi(url);
        if (res.success && res.data) {
          setPurchases(res.data.purchases || res.data || []);
        }
      } else {
        // Load all supplier purchases from profile endpoints
        const res = await fetchApi("/suppliers");
        if (res.success && res.data) {
          // If all suppliers returned, fetch individual purchases or show supplier ledger
          const allPurchases: any[] = [];
          for (const s of res.data.slice(0, 5)) {
            const pRes = await fetchApi(`/suppliers/${s.id}/purchases`);
            if (pRes.success && pRes.data?.purchases) {
              allPurchases.push(...pRes.data.purchases.map((p: any) => ({ ...p, supplier: s })));
            }
          }
          setPurchases(allPurchases);
        }
      }
    } catch (err) {
      console.error("Failed to load purchase history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchases();
  }, [selectedSupplierId]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Supplier Management</span>
            <span>/</span>
            <span className="text-brand-primary font-bold">Purchase History</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="h-6 w-6 text-brand-primary" />
            Supplier Purchase History & Trade Invoices
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete billing ledger of pharmaceutical intake orders, wholesale rates, paid amounts, and supplier balances.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("sup_payments_due")}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <CreditCard className="h-4 w-4" />
            Due Settlements
          </button>
          <button
            onClick={() => onNavigate("stock_add_stock")}
            className="px-4 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Purchase Intake
          </button>
        </div>
      </div>

      {/* Filter and Supplier Selector */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Truck className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 outline-none font-bold"
          >
            <option value="">-- All Companies / Suppliers --</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.contactPerson ? ` (${s.contactPerson})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
            <p className="text-xs">Loading purchase history records...</p>
          </div>
        ) : purchases.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Receipt className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No purchase records found</p>
            <p className="text-xs mt-1">Purchases recorded during Stock Intake will automatically appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3.5 px-4">Invoice # & Date</th>
                  <th className="py-3.5 px-4">Company / Supplier</th>
                  <th className="py-3.5 px-4">Branch</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Paid Amount</th>
                  <th className="py-3.5 px-4">Due Balance</th>
                  <th className="py-3.5 px-4">Payment Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {purchases.map((p) => {
                  const total = Number(p.totalAmount || 0);
                  const paid = Number(p.paidAmount || 0);
                  const due = Number(p.dueAmount || 0);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {p.invoiceNumber || `PUR-${p.id.slice(-6)}`}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(p.purchaseDate || p.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {p.supplier?.name || "Supplier"}
                        </div>
                        {p.supplier?.contactPerson && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            Rep: {p.supplier.contactPerson}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {p.branch?.name || "Main Branch"}
                      </td>

                      <td className="py-3.5 px-4 font-black font-mono text-slate-900 dark:text-white">
                        ৳{total.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-emerald-600 font-bold font-mono">
                        ৳{paid.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        {due > 0 ? (
                          <span className="text-rose-600 font-bold">৳{due.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Cleared</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40"
                              : p.status === "PARTIAL"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/40"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedPurchase(p);
                            setDetailModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Purchase Details Modal */}
      {detailModalOpen && selectedPurchase && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-primary" />
                Purchase Invoice Details
              </h3>
              <button onClick={() => setDetailModalOpen(false)} className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400">Invoice: </span>
                <span className="font-bold font-mono text-slate-900 dark:text-white">
                  {selectedPurchase.invoiceNumber || selectedPurchase.id}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400">Date: </span>
                <span className="font-bold font-mono">
                  {new Date(selectedPurchase.purchaseDate || selectedPurchase.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Supplier: </span>
                <span className="font-bold">{selectedPurchase.supplier?.name}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400">Branch: </span>
                <span className="font-bold">{selectedPurchase.branch?.name || "Main Branch"}</span>
              </div>
            </div>

            {selectedPurchase.items && selectedPurchase.items.length > 0 && (
              <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-400">
                    <tr>
                      <th className="py-2 px-3">Product</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Cost</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedPurchase.items.map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-bold">{item.product?.name || "Item"}</td>
                        <td className="py-2 px-3 text-center font-mono">{item.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono">৳{Number(item.purchasePrice).toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-bold font-mono">
                          ৳{Number(item.totalPrice).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between text-xs font-bold">
              <div>
                Total: ৳{Number(selectedPurchase.totalAmount).toFixed(2)} • Paid: ৳{Number(selectedPurchase.paidAmount).toFixed(2)}
              </div>
              <div className="text-rose-600">
                Due: ৳{Number(selectedPurchase.dueAmount).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
