"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Building2,
  PackageCheck,
  CreditCard,
  Layers,
  Palette,
  ShieldCheck,
  Users,
  UserPlus,
  KeyRound,
  ShieldPlus,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export type AdminTab =
  | "overview"
  | "verifications"
  | "tenants"
  | "staff"
  | "staff-list"
  | "staff-create"
  | "create-role"
  | "permission-assignment"
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
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AdminSidebar({
  activeTab,
  onTabChange,
  mobileOpen = false,
  onCloseMobile,
  collapsed = false,
  onToggleCollapse,
}: AdminSidebarProps) {
  const { isSuperAdmin, hasPermission, user } = useAuth();
  const isCollapsed = collapsed && !mobileOpen;

  const handleTabClick = (tab: AdminTab) => {
    onTabChange(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  // Accordion state for Staff Management submenu
  const isStaffTabActive =
    activeTab === "staff" ||
    activeTab === "staff-list" ||
    activeTab === "staff-create" ||
    activeTab === "create-role" ||
    activeTab === "permission-assignment" ||
    activeTab === "roles-permissions";

  const isRoleTabActive =
    activeTab === "create-role" ||
    activeTab === "permission-assignment" ||
    activeTab === "roles-permissions";

  const [staffMenuOpen, setStaffMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  useEffect(() => {
    if (isStaffTabActive) {
      setStaffMenuOpen(true);
    }
    if (isRoleTabActive) {
      setRoleMenuOpen(true);
    }
  }, [isStaffTabActive, isRoleTabActive]);

  // Permission checks
  const canViewTenants = isSuperAdmin || hasPermission("pharmacies.manage");
  const canViewPlans = isSuperAdmin || hasPermission("plans.manage");
  const canViewSubscriptions = isSuperAdmin || hasPermission("subscriptions.manage");
  const canViewPayments = isSuperAdmin || hasPermission("payments.view");
  const canViewSettings = isSuperAdmin || hasPermission("settings.manage");

  // Staff sub-permissions
  const canViewStaffList = isSuperAdmin || hasPermission("staff.manage") || hasPermission("staff.create");
  const canCreateStaff = isSuperAdmin || hasPermission("staff.create");
  const canManageRoles = isSuperAdmin || hasPermission("roles.manage");
  const canViewAnyStaffMenu = canViewStaffList || canCreateStaff || canManageRoles;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 lg:hidden transition-opacity duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 h-full max-h-full min-h-0 overflow-hidden transition-all duration-300 z-50 lg:z-auto ${
          mobileOpen
            ? "fixed inset-y-0 left-0 w-72 sm:w-80 shadow-2xl animate-in slide-in-from-left duration-200"
            : isCollapsed
            ? "hidden lg:flex lg:w-20 xl:w-20 2xl:w-20 3xl:w-20"
            : "hidden lg:flex lg:w-64 xl:w-72 2xl:w-80 3xl:w-88 4xl:w-96"
        }`}
      >
        {/* Mobile Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between lg:hidden shrink-0">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
            <LayoutDashboard className="h-5 w-5 text-brand-primary" />
            <span>Platform Console</span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Collapsed Icon-Only Mode */}
        {isCollapsed ? (
          <div className="p-2.5 space-y-2.5 flex-1 sidebar-scrollbar flex flex-col items-center">
            {/* Overview */}
            <div className="relative group w-full flex justify-center">
              <button
                type="button"
                onClick={() => handleTabClick("overview")}
                className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  activeTab === "overview"
                    ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                }`}
                aria-label="Overview"
              >
                <LayoutDashboard className="h-5 w-5 shrink-0" />
              </button>
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 border border-slate-700">
                Overview
              </div>
            </div>

            {/* Pharmacy Verification */}
            {canViewTenants && (
              <div className="relative group w-full flex justify-center">
                <button
                  type="button"
                  onClick={() => handleTabClick("verifications")}
                  className={`h-11 w-11 rounded-xl flex items-center justify-center relative transition-all cursor-pointer ${
                    activeTab === "verifications"
                      ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  aria-label="Pharmacy Verification"
                >
                  <ShieldCheck className="h-5 w-5 shrink-0" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 border border-slate-700">
                  Pharmacy Verification
                </div>
              </div>
            )}

            {/* Pharmacies */}
            {canViewTenants && (
              <div className="relative group w-full flex justify-center">
                <button
                  type="button"
                  onClick={() => handleTabClick("tenants")}
                  className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    activeTab === "tenants"
                      ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  aria-label="Pharmacies"
                >
                  <Building2 className="h-5 w-5 shrink-0" />
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 border border-slate-700">
                  Pharmacies & Tenants
                </div>
              </div>
            )}

            {/* Staff */}
            {canViewAnyStaffMenu && (
              <div className="relative group w-full flex justify-center">
                <button
                  type="button"
                  onClick={() => handleTabClick("staff-list")}
                  className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    isStaffTabActive
                      ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  aria-label="Staff Management"
                >
                  <Users className="h-5 w-5 shrink-0" />
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 border border-slate-700">
                  Staff Management
                </div>
              </div>
            )}

            <div className="w-8 border-t border-slate-200 dark:border-slate-800 my-1" />

            {/* Subscription Plans */}
            {canViewPlans && (
              <div className="relative group w-full flex justify-center">
                <button
                  type="button"
                  onClick={() => handleTabClick("plans")}
                  className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    activeTab === "plans"
                      ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  aria-label="Subscription Plans"
                >
                  <PackageCheck className="h-5 w-5 shrink-0" />
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 border border-slate-700">
                  Subscription Plans
                </div>
              </div>
            )}

            {/* Subscriptions */}
            {canViewSubscriptions && (
              <div className="relative group w-full flex justify-center">
                <button
                  type="button"
                  onClick={() => handleTabClick("subscriptions")}
                  className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    activeTab === "subscriptions"
                      ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  aria-label="Subscriptions"
                >
                  <Layers className="h-5 w-5 shrink-0" />
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 border border-slate-700">
                  Subscriptions
                </div>
              </div>
            )}

            {/* Settings */}
            {canViewSettings && (
              <div className="relative group w-full flex justify-center">
                <button
                  type="button"
                  onClick={() => handleTabClick("settings")}
                  className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    activeTab === "settings"
                      ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  aria-label="Branding & Theme"
                >
                  <Palette className="h-5 w-5 shrink-0" />
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 border border-slate-700">
                  Branding & Theme
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Full Expanded Sidebar Content */
          <div className="p-4 space-y-1.5 flex-1 sidebar-scrollbar">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Platform Management
            </div>

            {/* Overview */}
            <button
              onClick={() => handleTabClick("overview")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
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
                onClick={() => handleTabClick("verifications")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
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
                onClick={() => handleTabClick("tenants")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    isStaffTabActive && !staffMenuOpen
                      ? "bg-brand-primary/10 text-brand-primary"
                      : isStaffTabActive && staffMenuOpen
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 shrink-0" />
                    <span>Staff Management</span>
                  </div>
                  {staffMenuOpen ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                </button>

                {staffMenuOpen && (
                  <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-slate-100 dark:border-slate-800 ml-5 mt-1">
                    {canViewStaffList && (
                      <button
                        onClick={() => handleTabClick("staff-list")}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          activeTab === "staff-list" || activeTab === "staff"
                            ? "bg-brand-primary text-white shadow-xs"
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        <span>Staff Directory</span>
                      </button>
                    )}

                    {canCreateStaff && (
                      <button
                        onClick={() => handleTabClick("staff-create")}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          activeTab === "staff-create"
                            ? "bg-brand-primary text-white shadow-xs"
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <UserPlus className="h-3.5 w-3.5 shrink-0" />
                        <span>Create Staff</span>
                      </button>
                    )}

                    {canManageRoles && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            isRoleTabActive && !roleMenuOpen
                              ? "bg-brand-primary/10 text-brand-primary font-semibold"
                              : isRoleTabActive && roleMenuOpen
                              ? "bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                              : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <KeyRound className="h-3.5 w-3.5 shrink-0" />
                            <span>Roles & RBAC</span>
                          </div>
                          {roleMenuOpen ? (
                            <ChevronDown className="h-3 w-3 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-slate-400" />
                          )}
                        </button>

                        {roleMenuOpen && (
                          <div className="pl-3 pr-1 py-1 space-y-1 border-l-2 border-slate-200 dark:border-slate-700 ml-4 mt-1">
                            <button
                              onClick={() => handleTabClick("create-role")}
                              className={`w-full flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                                activeTab === "create-role"
                                  ? "bg-brand-primary text-white shadow-xs"
                                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                              }`}
                            >
                              <ShieldPlus className="h-3 w-3 shrink-0" />
                              <span>Create Role</span>
                            </button>
                            <button
                              onClick={() => handleTabClick("permission-assignment")}
                              className={`w-full flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                                activeTab === "permission-assignment"
                                  ? "bg-brand-primary text-white shadow-xs"
                                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                              }`}
                            >
                              <CheckSquare className="h-3 w-3 shrink-0" />
                              <span>Assign Permissions</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              SaaS Billing & Config
            </div>

            {/* Plans */}
            {canViewPlans && (
              <button
                onClick={() => handleTabClick("plans")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
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
                onClick={() => handleTabClick("subscriptions")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === "subscriptions"
                    ? "bg-brand-primary text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Layers className="h-4 w-4 shrink-0" />
                <span>Subscriptions</span>
              </button>
            )}

            {/* Settings */}
            {canViewSettings && (
              <button
                onClick={() => handleTabClick("settings")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
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
        )}

        {/* User Role Card (Expanded only) */}
        {!isCollapsed && (
          <div className="mt-auto p-3.5 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 space-y-1">
              <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span className="truncate">{isSuperAdmin ? "Super Admin Root" : user?.customRoleName || user?.role || "Staff"}</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-primary/10 text-brand-primary shrink-0">
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
        )}

        {/* Desktop Collapse / Expand Toggle Footer */}
        {onToggleCollapse && (
          <div className="hidden lg:flex p-2.5 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`w-full flex items-center ${isCollapsed ? "justify-center" : "justify-between px-2.5"} py-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition duration-150 group relative cursor-pointer`}
              title={isCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
            >
              {isCollapsed ? (
                <>
                  <PanelLeftOpen className="h-5 w-5 text-brand-primary" />
                  <span className="absolute left-full ml-3 px-2.5 py-1 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 border border-slate-700">
                    Expand Sidebar (Ctrl+B)
                  </span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-xs 2xl:text-sm font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">
                    <PanelLeftClose className="h-4 w-4 text-slate-400 group-hover:text-brand-primary transition" />
                    <span>Collapse Sidebar</span>
                  </div>
                  <kbd className="hidden xl:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                    Ctrl+B
                  </kbd>
                </>
              )}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
