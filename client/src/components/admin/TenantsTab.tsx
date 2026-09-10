"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { Search, Loader2, AlertTriangle, Eye } from "lucide-react";
import { PharmacyDetailsView } from "./PharmacyDetailsView";

type DatePreset = "ALL" | "TODAY" | "YESTERDAY" | "THIS_MONTH" | "LAST_MONTH" | "THIS_YEAR" | "CUSTOM";

export function TenantsTab() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Date Filters
  const [dateFilter, setDateFilter] = useState<DatePreset>("ALL");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [toggleModalTenant, setToggleModalTenant] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadTenants = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (tierFilter) params.append("tier", tierFilter);
      if (statusFilter) params.append("isActive", statusFilter);
      if (dateFilter && dateFilter !== "ALL") params.append("datePreset", dateFilter);
      if (dateFilter === "CUSTOM") {
        if (customStartDate) params.append("startDate", customStartDate);
        if (customEndDate) params.append("endDate", customEndDate);
      }

      const res = await fetchApi(`/super-admin/tenants?${params.toString()}`);
      if (res.success && res.data) {
        setTenants(res.data);
      }
    } catch (err) {
      console.error("Failed to load tenants", err);
    } finally {
      setLoading(false);
    }
  }, [search, tierFilter, statusFilter, dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTenants();
  };

  const handleToggleStatus = async () => {
    if (!toggleModalTenant) return;
    try {
      setActionLoading(true);
      const newStatus = !toggleModalTenant.isActive;
      const res = await fetchApi(`/super-admin/tenants/${toggleModalTenant.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (res.success) {
        setToggleModalTenant(null);
        await loadTenants();
      }
    } catch (err) {
      console.error("Failed to toggle tenant status", err);
    } finally {
      setActionLoading(false);
    }
  };

  // If a pharmacy is selected for inspection, render dedicated full page PharmacyDetailsView
  if (selectedTenantId) {
    return (
      <PharmacyDetailsView
        tenantId={selectedTenantId}
        onBack={() => setSelectedTenantId(null)}
        onToggleStatusSuccess={loadTenants}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Pharmacy Tenants</h2>
        <p className="text-sm text-slate-500">Manage all registered pharmacy companies, branches, and subscription states</p>
      </div>

      {/* Filter Bar: Date Presets & Inputs + Attribute Filters */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
        {/* Date Presets Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            {[
              { id: "ALL", label: "All Time" },
              { id: "TODAY", label: "Today" },
              { id: "YESTERDAY", label: "Yesterday" },
              { id: "THIS_MONTH", label: "This Month" },
              { id: "LAST_MONTH", label: "Last Month" },
              { id: "THIS_YEAR", label: "This Year" },
              { id: "CUSTOM", label: "Custom Date" },
            ].map((df) => (
              <button
                key={df.id}
                type="button"
                onClick={() => setDateFilter(df.id as DatePreset)}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  dateFilter === df.id
                    ? "bg-brand-primary text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {df.label}
              </button>
            ))}
          </div>

          {dateFilter === "CUSTOM" && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          )}
        </div>

        {/* Attribute Filters Row: Search, Tier, Status */}
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pharmacy name or email..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="">All Tiers</option>
            <option value="STARTER">Starter</option>
            <option value="GROWTH">Growth</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Suspended</option>
          </select>
        </form>
      </div>

      {/* Tenants Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
            <span>Loading tenants...</span>
          </div>
        ) : tenants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Pharmacy Name</th>
                  <th className="px-6 py-4 font-semibold">Tier</th>
                  <th className="px-6 py-4 font-semibold">Branches</th>
                  <th className="px-6 py-4 font-semibold">Users</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Created</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      <div>{tenant.name}</div>
                      <div className="text-xs text-slate-400 font-normal">{tenant.email || "No email provided"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {tenant.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4">{tenant.branchCount || 0} Stores</td>
                    <td className="px-6 py-4">{tenant.userCount || 0} Staff</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          tenant.isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${tenant.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                        {tenant.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedTenantId(tenant.id)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Details</span>
                      </button>
                      <button
                        onClick={() => setToggleModalTenant(tenant)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                          tenant.isActive
                            ? "bg-red-50 dark:bg-red-950/40 text-red-600 hover:bg-red-100"
                            : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100"
                        }`}
                      >
                        {tenant.isActive ? "Suspend" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-sm text-slate-400">No pharmacy tenants found matching filters.</div>
        )}
      </div>

      {/* Confirmation Modal for Suspend/Activate */}
      {toggleModalTenant && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold">
                {toggleModalTenant.isActive ? "Suspend Pharmacy Tenant?" : "Activate Pharmacy Tenant?"}
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to {toggleModalTenant.isActive ? "suspend" : "activate"}{" "}
              <strong>{toggleModalTenant.name}</strong>?{" "}
              {toggleModalTenant.isActive
                ? "This will temporarily block all POS sales and dashboard logins for their staff."
                : "This will restore full access for all their pharmacy branches."}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setToggleModalTenant(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleStatus}
                disabled={actionLoading}
                className={`px-4 py-2 rounded-xl text-sm font-bold text-white shadow cursor-pointer ${
                  toggleModalTenant.isActive ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {actionLoading ? "Updating..." : toggleModalTenant.isActive ? "Confirm Suspension" : "Confirm Activation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

