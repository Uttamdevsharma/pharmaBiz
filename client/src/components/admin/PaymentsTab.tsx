"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Search, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

export function PaymentsTab() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadPayments = async () => {
    try {
      setLoading(true);
      const res = await fetchApi("/super-admin/payments");
      if (res.success && res.data) {
        setPayments(res.data);
      }
    } catch (err) {
      console.error("Failed to load platform payments", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const filtered = payments.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const tid = (p.tranId || p.transactionId || "").toLowerCase();
    const tname = (p.tenant?.name || "").toLowerCase();
    const gw = (p.paymentMethod || p.cardType || "SSLCOMMERZ").toLowerCase();
    return tid.includes(s) || tname.includes(s) || gw.includes(s);
  });

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Platform Payments</h2>
          <p className="text-sm text-slate-500">SSLCOMMERZ Sandbox subscription transactions and validation logs</p>
        </div>

        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Tran ID, Pharmacy..."
            className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
            <span>Loading payment records...</span>
          </div>
        ) : filtered.length > 0 ? (
          <div className="table-responsive-container">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Transaction ID</th>
                  <th className="px-6 py-4 font-semibold">Pharmacy Tenant</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Gateway / Method</th>
                  <th className="px-6 py-4 font-semibold">Validation ID</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {p.tranId || p.transactionId}
                    </td>
                    <td className="px-6 py-4 font-medium">{p.tenant?.name || "N/A"}</td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      ৳{Number(p.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold">
                        {p.paymentMethod || p.cardType || "SSLCOMMERZ"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {p.valId || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          p.status === "VALIDATED"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : p.status === "FAILED"
                            ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {p.status === "VALIDATED" && <CheckCircle2 className="h-3 w-3" />}
                        {p.status === "FAILED" && <XCircle className="h-3 w-3" />}
                        {p.status === "PENDING" && <Clock className="h-3 w-3" />}
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-sm text-slate-400">No payment transactions recorded yet.</div>
        )}
      </div>
    </div>
  );
}
