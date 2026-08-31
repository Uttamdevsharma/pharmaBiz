"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Supplier } from "@/types";
import {
  CreditCard,
  Search,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Building,
  X,
} from "lucide-react";

interface PaymentsDueViewProps {
  onNavigate?: (module: any) => void;
}

export function PaymentsDueView({ onNavigate: _onNavigate }: PaymentsDueViewProps = {}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Payment Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [payNotes, setPayNotes] = useState("");
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

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
      console.error("Failed to load suppliers due ledger", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const totalOutstandingDue = suppliers.reduce((acc, s) => acc + Number(s.totalDue || 0), 0);
  const totalPaid = suppliers.reduce((acc, s) => acc + Number(s.totalPaid || 0), 0);
  const dueSuppliers = suppliers.filter((s) => Number(s.totalDue || 0) > 0);

  const handleOpenPay = (sup: Supplier) => {
    setSelectedSupplier(sup);
    setPayAmount(Number(sup.totalDue || 0));
    setPayNotes(`Settlement payment for ${sup.name}`);
    setPayModalOpen(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || payAmount <= 0) return;
    try {
      setPaying(true);
      const res = await fetchApi(`/suppliers/${selectedSupplier.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(payAmount),
          paymentMethod,
          notes: payNotes || null,
        }),
      });

      if (!res.success) throw new Error(res.message || "Failed to record payment");

      setSuccess(`Payment of ৳${payAmount.toFixed(2)} recorded for ${selectedSupplier.name}!`);
      setPayModalOpen(false);
      setSelectedSupplier(null);
      loadSuppliers();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPaying(false);
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
            <span className="text-brand-primary font-bold">Payments / Due</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-brand-primary" />
            Accounts Payable & Supplier Dues Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track wholesale distributor credit balances, record installments and due settlements, and maintain clean supplier ledgers.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
            <span>Total Outstanding Payable Due</span>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono mt-2">
            ৳{totalOutstandingDue.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Across {dueSuppliers.length} distributor accounts</div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
            <span>Total Cumulative Payments</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-2">
            ৳{totalPaid.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Paid against procurement invoices</div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
            <span>Accounts with Outstanding Due</span>
            <Building className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {dueSuppliers.length} / {suppliers.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Registered suppliers with pending balance</div>
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
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter suppliers by name or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadSuppliers()}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none dark:text-white"
          />
        </div>
      </div>

      {/* Due Accounts Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-2" />
            <p className="text-xs">Loading dues ledger...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">All supplier balances are settled</p>
            <p className="text-xs mt-1 text-slate-400">No outstanding payables currently due.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3.5 px-4">Company / Supplier Name</th>
                  <th className="py-3.5 px-4">Contact Representative & Phone</th>
                  <th className="py-3.5 px-4">Total Purchases</th>
                  <th className="py-3.5 px-4">Total Paid</th>
                  <th className="py-3.5 px-4">Outstanding Due Balance</th>
                  <th className="py-3.5 px-4 text-right">Settlement Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {suppliers.map((s) => {
                  const total = Number(s.totalPurchased || 0);
                  const paid = Number(s.totalPaid || 0);
                  const due = Number(s.totalDue || 0);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{s.name}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{s.contactPerson || "Direct Company"}</div>
                        {s.phone && (
                          <div className="font-mono text-slate-400 text-[11px] mt-0.5">{s.phone}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-black font-mono text-slate-900 dark:text-white">
                        ৳{total.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-emerald-600 font-bold font-mono">
                        ৳{paid.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        {due > 0 ? (
                          <span className="text-rose-600 font-black text-sm">৳{due.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-400 text-xs">৳0.00 (Cleared)</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {due > 0 ? (
                          <button
                            onClick={() => handleOpenPay(s)}
                            className="px-3.5 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-[11px] font-bold shadow-xs transition flex items-center gap-1.5 ml-auto"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Pay Due
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-lg text-[10px] font-bold ml-auto"
                          >
                            Fully Settled
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pay Due Modal */}
      {payModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-brand-primary" />
                Record Payment / Settle Due
              </h3>
              <button onClick={() => setPayModalOpen(false)} className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">{selectedSupplier.name}</div>
              <div className="text-rose-600 font-bold font-mono">
                Current Due: ৳{Number(selectedSupplier.totalDue || 0).toFixed(2)}
              </div>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount (৳) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Channel / Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                >
                  <option value="CASH">Cash Payment</option>
                  <option value="BANK">Bank Wire / Transfer</option>
                  <option value="CHEQUE">Bank Cheque</option>
                  <option value="MOBILE">Mobile Banking (bKash / Nagad)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Receipt Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bank slip #98721"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {paying ? "Processing..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
