"use client";

import React, { useEffect, useState, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import {
  Search,
  Loader2,
  AlertTriangle,
  Eye,
  Building2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { PharmacyDetailsView } from "./PharmacyDetailsView";

type DatePreset = "ALL" | "TODAY" | "YESTERDAY" | "THIS_MONTH" | "LAST_MONTH" | "THIS_YEAR" | "CUSTOM";

export function TenantsTab() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [subStatusFilter, setSubStatusFilter] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

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
      if (search.trim()) params.append("search", search.trim());
      if (tierFilter) params.append("tier", tierFilter);
      if (statusFilter) params.append("isActive", statusFilter);
      if (subStatusFilter) params.append("subscriptionStatus", subStatusFilter);
      if (dateFilter && dateFilter !== "ALL") params.append("datePreset", dateFilter);
      if (dateFilter === "CUSTOM") {
        if (customStartDate) params.append("startDate", customStartDate);
        if (customEndDate) params.append("endDate", customEndDate);
      }
      params.append("page", String(page));
      params.append("limit", String(pageSize));

      const res = await fetchApi<any>(`/super-admin/tenants?${params.toString()}`);
      if (res.success && res.data) {
        setTenants(res.data);
        const totalCount = res.meta?.total ?? res.data.length ?? 0;
        const calculatedTotalPages = res.meta?.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));
        setTotal(totalCount);
        setTotalPages(calculatedTotalPages);
      }
    } catch (err) {
      console.error("Failed to load tenants", err);
    } finally {
      setLoading(false);
    }
  }, [search, tierFilter, statusFilter, subStatusFilter, dateFilter, customStartDate, customEndDate, page, pageSize]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
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
      {/* Clean, Minimal Top Header without short description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="h-6 w-6 text-brand-primary shrink-0" />
            <span>Pharmacies</span>
            {total > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                {total} Registered
              </span>
            )}
          </h1>
        </div>

        <button
          type="button"
          onClick={loadTenants}
          disabled={loading}
          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2 cursor-pointer shadow-xs self-start sm:self-auto active:scale-95"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-brand-primary" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar: Date Presets & Inputs + Attribute Filters */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs space-y-3">
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
                onClick={() => {
                  setDateFilter(df.id as DatePreset);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  dateFilter === df.id
                    ? "bg-brand-primary text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
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
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          )}
        </div>

        {/* Attribute Filters Row: Search, Tier, Status */}
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search pharmacy name, email, phone..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={tierFilter}
            onChange={(e) => {
              setTierFilter(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="">All Tiers</option>
            <option value="TRIAL">Trial</option>
            <option value="STARTER">Starter</option>
            <option value="GROWTH">Growth</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>

          {/* Subscription Status Filter Dropdown matching user's design */}
          <select
            value={subStatusFilter}
            onChange={(e) => {
              setSubStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="">All Accounts</option>
            <option value="true">Account: Normal</option>
            <option value="false">Account: Suspended</option>
          </select>
        </form>
      </div>

      {/* Tenants Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary mx-auto" />
            <p className="text-xs font-bold text-slate-500">Loading pharmacies...</p>
          </div>
        ) : tenants.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-xs font-black uppercase tracking-wider text-slate-500 select-none">
                  <tr>
                    <th className="py-4 px-6">Pharmacy</th>
                    <th className="py-4 px-6">Tier</th>
                    <th className="py-4 px-6">Subscription</th>
                    <th className="py-4 px-6">Branches</th>
                    <th className="py-4 px-6">Staff</th>
                    <th className="py-4 px-6">Account</th>
                    <th className="py-4 px-6">Created</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {tenants.map((tenant) => {
                    const latestSub = tenant.subscriptions?.[0];
                    return (
                    <tr
                      key={tenant.id}
                      onClick={() => setSelectedTenantId(tenant.id)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer group"
                    >
                      {/* Pharmacy Name & Contact */}
                      <td className="py-4 px-6">
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white text-base">
                            {tenant.name}
                          </div>
                          <div className="text-xs text-slate-400 font-medium truncate max-w-[260px] mt-0.5">
                            {tenant.email || tenant.phone || "No contact info"}
                          </div>
                        </div>
                      </td>

                      {/* Tier Badge */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-xl text-xs font-black tracking-wide border ${
                            tenant.tier === "ENTERPRISE"
                              ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                              : tenant.tier === "GROWTH"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                              : "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20"
                          }`}
                        >
                          {tenant.tier}
                        </span>
                      </td>

                      {/* Subscription Status Badge */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        {latestSub ? (
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                              latestSub.status === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                : latestSub.status === "PENDING"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                                : latestSub.status === "EXPIRED"
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                                : "bg-slate-100 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                latestSub.status === "ACTIVE"
                                  ? "bg-emerald-500"
                                  : latestSub.status === "PENDING"
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                            />
                            {latestSub.status}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-semibold italic">No Sub</span>
                        )}
                      </td>

                      {/* Branches Count */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                          {tenant.branchCount || 0}{" "}
                          <span className="text-xs text-slate-400 font-normal">
                            {tenant.branchCount === 1 ? "Branch" : "Branches"}
                          </span>
                        </div>
                      </td>

                      {/* Staff Count */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                          {tenant.userCount || 0}{" "}
                          <span className="text-xs text-slate-400 font-normal">Staff</span>
                        </div>
                      </td>

                      {/* Account Status */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                            tenant.isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              tenant.isActive ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          />
                          {tenant.isActive ? "Normal" : "Suspended"}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="text-slate-800 dark:text-slate-200 font-semibold text-sm">
                          {new Date(tenant.createdAt).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-4 px-6 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedTenantId(tenant.id)}
                            className="group/btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-brand-primary/10 hover:bg-brand-primary border border-brand-primary/25 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                          >
                            <Eye className="h-4 w-4 text-brand-primary group-hover/btn:!text-white transition-colors" />
                            <span className="text-brand-primary group-hover/btn:!text-white transition-colors">Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setToggleModalTenant(tenant)}
                            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shadow-xs active:scale-95 ${
                              tenant.isActive
                                ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-200 dark:border-rose-900/50"
                                : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-200 dark:border-emerald-900/50"
                            }`}
                          >
                            {tenant.isActive ? "Suspend" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Pagination Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="text-slate-500 font-medium">
                Showing{" "}
                <strong className="text-slate-800 dark:text-slate-200 font-bold">
                  {total === 0 ? 0 : (page - 1) * pageSize + 1}
                </strong>{" "}
                to{" "}
                <strong className="text-slate-800 dark:text-slate-200 font-bold">
                  {Math.min(page * pageSize, total)}
                </strong>{" "}
                of{" "}
                <strong className="text-slate-800 dark:text-slate-200 font-bold">
                  {total}
                </strong>{" "}
                pharmacies
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                  <span>Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition shadow-xs"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="px-3 py-1 font-bold text-slate-700 dark:text-slate-300 text-xs">
                    {page} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition shadow-xs"
                    title="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="py-20 text-center space-y-3 text-slate-500 p-6">
            <Building2 className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700" />
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
              No Pharmacies Found
            </h3>
            <p className="text-xs max-w-sm mx-auto text-slate-400">
              No pharmacy records found matching the active filter criteria.
            </p>
          </div>
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
                type="button"
                onClick={() => setToggleModalTenant(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
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
