"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { BarChart3, TrendingUp, DollarSign, Store, Boxes, Loader2 } from "lucide-react";

export function ReportsModule() {
  const [daily, setDaily] = useState<any>(null);
  const [branchWise, setBranchWise] = useState<any[]>([]);
  const [inventoryVal, setInventoryVal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const [dRes, bRes, iRes] = await Promise.all([
          fetchApi("/reports/sales/daily"),
          fetchApi("/reports/sales/branch-wise"),
          fetchApi("/reports/inventory"),
        ]);

        if (dRes.success) setDaily(dRes.data);
        if (bRes.success) setBranchWise(bRes.data || []);
        if (iRes.success) setInventoryVal(iRes.data);
      } catch (err) {
        console.error("Failed to load reports", err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
        <span>Compiling financial and inventory reports...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Store Performance & Reports</h2>
        <p className="text-xs text-slate-500">Financial revenue breakdown, branch performance, and inventory valuation</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase">Gross Sales Revenue</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            ৳ {Number(daily?.summary?.totalSales || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>{daily?.summary?.transactionCount || 0} Transactions</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Inventory Valuation</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            ৳ {Number(inventoryVal?.totalValuation || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {inventoryVal?.totalStockUnits || 0} Total Medicine Units in Stock
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase">Active Branches Reporting</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {branchWise.length} Branches
          </div>
          <div className="text-[11px] text-blue-600 font-medium">Across all network locations</div>
        </div>
      </div>

      {/* Branch Performance Comparison */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Branch-Wise Revenue Breakdown</h3>
        {branchWise.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Store Branch</th>
                  <th className="px-4 py-3 font-semibold">Total Revenue</th>
                  <th className="px-4 py-3 font-semibold">Transactions</th>
                  <th className="px-4 py-3 font-semibold">Avg Ticket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {branchWise.map((b: any) => {
                  const avg = b.transactionCount > 0 ? Math.round(b.totalSales / b.transactionCount) : 0;
                  return (
                    <tr key={b.branchId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{b.branchName}</td>
                      <td className="px-4 py-3 font-bold text-emerald-600">৳ {Number(b.totalSales).toLocaleString()}</td>
                      <td className="px-4 py-3">{b.transactionCount}</td>
                      <td className="px-4 py-3">৳ {avg}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400">
            No sales recorded across branches for the reporting period.
          </div>
        )}
      </div>
    </div>
  );
}
