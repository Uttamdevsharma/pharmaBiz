"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  Building2,
  PackageCheck,
  CreditCard,
  Layers,
  BarChart3,
  Bell,
  Palette,
  ShieldCheck,
  Users,
  UserPlus,
  KeyRound,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export type AdminTab =
  | "overview"
  | "verifications"
  | "tenants"
  | "staff"
  | "staff-list"
  | "staff-create"
  | "roles-permissions"
  | "plans"
  | "subscriptions"
  | "payments"
  | "analytics"
  | "notifications"
  | "settings";

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const { isSuperAdmin, hasPermission, user } = useAuth();

  // Accordion state for Staff Management submenu
  const isStaffTabActive =
    activeTab === "staff" ||
    activeTab === "staff-list" ||
    activeTab === "staff-create" ||
    activeTab === "roles-permissions";

  const [staffMenuOpen, setStaffMenuOpen] = useState(true);

  // Permission checks
  const canViewTenants = isSuperAdmin || hasPermission("pharmacies.manage");
  const canViewPlans = isSuperAdmin || hasPermission("plans.manage");
  const canViewSubscriptions = isSuperAdmin || hasPermission("subscriptions.manage");
  const canViewPayments = isSuperAdmin || hasPermission("payments.view");
  const canViewAnalytics = isSuperAdmin || hasPermission("reports.view");
  const canViewSettings = isSuperAdmin || hasPermission("settings.manage");

  // Staff sub-permissions
  const canViewStaffList = isSuperAdmin || hasPermission("staff.manage") || hasPermission("staff.create");
  const canCreateStaff = isSuperAdmin || hasPermission("staff.create");
  const canManageRoles = isSuperAdmin || hasPermission("roles.manage");
  const canViewAnyStaffMenu = canViewStaffList || canCreateStaff || canManageRoles;

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-1.5">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Platform Management
        </div>

        {/* Overview */}
        <button
          onClick={() => onTabChange("overview")}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "overview"
              ? "bg-brand-primary text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          <span>Overview</span>
        </button>

        {/* Pharmacy Verification & Compliance */}
        {canViewTenants && (
          <button
            onClick={() => onTabChange("verifications")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "verifications"
                ? "bg-brand-primary text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>Pharmacy Verification</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold">
              Review
            </span>
          </button>
        )}

        {/* Pharmacies / Tenants */}
        {canViewTenants && (
          <button
            onClick={() => onTabChange("tenants")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "tenants"
                ? "bg-brand-primary text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Building2 className="h-4 w-4 shrink-0" />
            <span>Pharmacies</span>
          </button>
        )}

        {/* ==================== STAFF MANAGEMENT GROUP ==================== */}
        {canViewAnyStaffMenu && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setStaffMenuOpen(!staffMenuOpen)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isStaffTabActive
                  ? "bg-slate-100 dark:bg-slate-800 text-brand-primary dark:text-brand-primary"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 shrink-0 text-brand-primary" />
                <span>Staff Management</span>
              </div>
              {staffMenuOpen ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </button>

            {/* Submenus */}
            {staffMenuOpen && (
              <div className="mt-1 ml-4 pl-3 border-l-2 border-slate-200 dark:border-slate-800 space-y-1">
                {canViewStaffList && (
                  <button
                    onClick={() => onTabChange("staff-list")}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      activeTab === "staff-list" || activeTab === "staff"
                        ? "bg-brand-primary text-white font-semibold shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                    <span>Staff List</span>
                  </button>
                )}

                {canCreateStaff && (
                  <button
                    onClick={() => onTabChange("staff-create")}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      activeTab === "staff-create"
                        ? "bg-brand-primary text-white font-semibold shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <UserPlus className="h-3.5 w-3.5 shrink-0" />
                    <span>Create Staff</span>
                  </button>
                )}

                {canManageRoles && (
                  <button
                    onClick={() => onTabChange("roles-permissions")}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      activeTab === "roles-permissions"
                        ? "bg-brand-primary text-white font-semibold shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <KeyRound className="h-3.5 w-3.5 shrink-0" />
                    <span>Roles & Permissions</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Subscription Plans */}
        {canViewPlans && (
          <button
            onClick={() => onTabChange("plans")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "plans"
                ? "bg-brand-primary text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <PackageCheck className="h-4 w-4 shrink-0" />
            <span>Subscription Plans</span>
          </button>
        )}

        {/* Subscriptions */}
        {canViewSubscriptions && (
          <button
            onClick={() => onTabChange("subscriptions")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "subscriptions"
                ? "bg-brand-primary text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers className="h-4 w-4 shrink-0" />
            <span>Subscriptions</span>
          </button>
        )}

        {/* Payments */}
        {canViewPayments && (
          <button
            onClick={() => onTabChange("payments")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "payments"
                ? "bg-brand-primary text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <CreditCard className="h-4 w-4 shrink-0" />
            <span>Payments</span>
          </button>
        )}

        {/* Analytics / Reports */}
        {canViewAnalytics && (
          <button
            onClick={() => onTabChange("analytics")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "analytics"
                ? "bg-brand-primary text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span>Platform Analytics</span>
          </button>
        )}

        {/* Notifications */}
        <button
          onClick={() => onTabChange("notifications")}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "notifications"
              ? "bg-brand-primary text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Bell className="h-4 w-4 shrink-0" />
          <span>Notifications</span>
        </button>

        {/* Settings */}
        {canViewSettings && (
          <button
            onClick={() => onTabChange("settings")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "settings"
                ? "bg-brand-primary text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Palette className="h-4 w-4 shrink-0" />
            <span>Branding & Theme</span>
          </button>
        )}
      </div>

      <div className="mt-auto p-4 border-t border-slate-100 dark:border-slate-800/80">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 space-y-1">
          <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
            <span>{isSuperAdmin ? "Super Admin Root" : user?.customRoleName || user?.role || "Staff"}</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-primary/10 text-brand-primary">
              {isSuperAdmin ? "Full Root" : "RBAC Gated"}
            </span>
          </div>
          <p className="text-[11px] leading-tight text-slate-400">
            {isSuperAdmin
              ? "Operating with unrestricted Super Admin authority."
              : `Active permissions: ${user?.permissions?.length || 0} module(s)`}
          </p>
        </div>
      </div>
    </aside>
  );
}

