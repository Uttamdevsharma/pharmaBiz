"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Loader2, CheckCircle2 } from "lucide-react";

export function SubscriptionsTab() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSubs() {
      try {
        setLoading(true);
        const res = await fetchApi("/super-admin/subscriptions");
        if (res.success && res.data) {
          setSubscriptions(res.data);
        }
      } catch (err) {
        console.error("Failed to load platform subscriptions", err);
      } finally {
        setLoading(false);
      }
    }
    loadSubs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Tenant Subscriptions</h2>
        <p className="text-sm text-slate-500">Live ledger of all active, renewing, and expired pharmacy subscriptions</p>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
            <span>Loading subscriptions...</span>
          </div>
        ) : subscriptions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Pharmacy Tenant</th>
                  <th className="px-6 py-4 font-semibold">Plan Name</th>
                  <th className="px-6 py-4 font-semibold">Tier</th>
                  <th className="px-6 py-4 font-semibold">Start Date</th>
                  <th className="px-6 py-4 font-semibold">End Date</th>
                  <th className="px-6 py-4 font-semibold">Auto-Renew</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      <div>{sub.tenant?.name || sub.tenantName || "Unknown Tenant"}</div>
                      <div className="text-xs text-slate-400 font-normal">{sub.tenant?.email || ""}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{sub.plan?.name || "Standard Plan"}</div>
                      <div className="text-xs text-brand-primary font-bold">৳{Number(sub.plan?.price || 0).toLocaleString()} / {sub.plan?.billingCycle?.toLowerCase() || "mo"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {sub.tenant?.tier || sub.tenantTier || sub.plan?.tier || "STARTER"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(sub.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(sub.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {sub.autoRenew ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Yes
                        </span>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          sub.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-sm text-slate-400">No subscription records found.</div>
        )}
      </div>
    </div>
  );
}
