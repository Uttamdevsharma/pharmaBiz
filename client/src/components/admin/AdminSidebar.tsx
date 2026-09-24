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
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { loadingProgress } from "@/lib/loadingProgress";

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
    loadingProgress.triggerQuick(240);
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

        {/* Collapsed Icon-Only View */}
        {isCollapsed ? (
          <div className="py-5 flex flex-col items-center gap-3.5 flex-1 sidebar-scrollbar overflow-y-auto w-full px-2">
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
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 border border-slate-700">
                Overview
              </div>
            </div>

            {/* Pending Approvals */}
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
                  aria-label="Pending Approvals"
                >
                  <ShieldCheck className="h-5 w-5 shrink-0" />
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 border border-slate-700">
                  Pending Approvals
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
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 border border-slate-700">
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
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 border border-slate-700">
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
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 border border-slate-700">
                  Subscription Plans
                </div>
              </div>
            )}

            {/* Payments */}
            {canViewPayments && (
              <div className="relative group w-full flex justify-center">
                <button
                  type="button"
                  onClick={() => handleTabClick("payments")}
                  className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    activeTab === "payments"
                      ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  aria-label="Payments & Invoices"
                >
                  <CreditCard className="h-5 w-5 shrink-0" />
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 border border-slate-700">
                  Payments & Invoices
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
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 border border-slate-700">
                  Branding & Theme
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Full Expanded Sidebar Content with larger, readable fonts */
          <div className="p-3.5 xl:p-4 space-y-2 flex-1 sidebar-scrollbar overflow-y-auto">
            <div className="px-3.5 py-2 text-xs font-black uppercase tracking-wider text-slate-400">
              Platform Management
            </div>

            {/* Overview */}
            <button
              onClick={() => handleTabClick("overview")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm sm:text-base font-bold transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-brand-primary text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" />
              <span>Overview</span>
            </button>

            {/* Pending Approvals */}
            {canViewTenants && (
              <button
                onClick={() => handleTabClick("verifications")}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm sm:text-base font-bold transition-all cursor-pointer ${
                  activeTab === "verifications"
                    ? "bg-brand-primary text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <ShieldCheck className="h-5 w-5 shrink-0" />
                <span>Pending Approvals</span>
              </button>
            )}

            {/* Pharmacies / Tenants */}
            {canViewTenants && (
              <button
                onClick={() => handleTabClick("tenants")}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm sm:text-base font-bold transition-all cursor-pointer ${
                  activeTab === "tenants"
                    ? "bg-brand-primary text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Building2 className="h-5 w-5 shrink-0" />
                <span>Pharmacies</span>
              </button>
            )}

            {/* ==================== STAFF MANAGEMENT GROUP ==================== */}
            {canViewAnyStaffMenu && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setStaffMenuOpen(!staffMenuOpen)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm sm:text-base font-bold transition-all cursor-pointer ${
                    isStaffTabActive && !staffMenuOpen
                      ? "bg-brand-primary/10 text-brand-primary"
                      : isStaffTabActive && staffMenuOpen
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Users className="h-5 w-5 shrink-0" />
                    <span>Staff Management</span>
                  </div>
                  {staffMenuOpen ? (
                    <ChevronDown className="h-4.5 w-4.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4.5 w-4.5 text-slate-400" />
                  )}
                </button>

                {staffMenuOpen && (
                  <div className="pl-4 pr-1 py-1 space-y-1.5 border-l-2 border-slate-100 dark:border-slate-800 ml-6 mt-1.5">
                    {canViewStaffList && (
                      <button
                        onClick={() => handleTabClick("staff-list")}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                          activeTab === "staff-list" || activeTab === "staff"
                            ? "bg-brand-primary text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Users className="h-4 w-4 shrink-0" />
                        <span>Staff Directory</span>
                      </button>
                    )}

                    {canCreateStaff && (
                      <button
                        onClick={() => handleTabClick("staff-create")}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                          activeTab === "staff-create"
                            ? "bg-brand-primary text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <UserPlus className="h-4 w-4 shrink-0" />
                        <span>Create Staff</span>
                      </button>
                    )}

                    {canManageRoles && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                            isRoleTabActive && !roleMenuOpen
                              ? "bg-brand-primary/10 text-brand-primary font-bold"
                              : isRoleTabActive && roleMenuOpen
                              ? "bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <KeyRound className="h-4 w-4 shrink-0" />
                            <span>Roles & RBAC</span>
                          </div>
                          {roleMenuOpen ? (
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                          )}
                        </button>

                        {roleMenuOpen && (
                          <div className="pl-3.5 pr-1 py-1 space-y-1 border-l-2 border-slate-200 dark:border-slate-700 ml-4 mt-1">
                            <button
                              onClick={() => handleTabClick("create-role")}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                                activeTab === "create-role"
                                  ? "bg-brand-primary text-white shadow-xs"
                                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                              }`}
                            >
                              <ShieldPlus className="h-3.5 w-3.5 shrink-0" />
                              <span>Create Role</span>
                            </button>
                            <button
                              onClick={() => handleTabClick("permission-assignment")}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                                activeTab === "permission-assignment"
                                  ? "bg-brand-primary text-white shadow-xs"
                                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                              }`}
                            >
                              <CheckSquare className="h-3.5 w-3.5 shrink-0" />
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

            <div className="px-3.5 pt-5 pb-2 text-xs font-black uppercase tracking-wider text-slate-400">
              SaaS Billing & Config
            </div>

            {/* Plans */}
            {canViewPlans && (
              <button
                onClick={() => handleTabClick("plans")}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm sm:text-base font-bold transition-all cursor-pointer ${
                  activeTab === "plans"
                    ? "bg-brand-primary text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <PackageCheck className="h-5 w-5 shrink-0" />
                <span>Subscription Plans</span>
              </button>
            )}

            {/* Payments & Invoices */}
            {canViewPayments && (
              <button
                onClick={() => handleTabClick("payments")}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm sm:text-base font-bold transition-all cursor-pointer ${
                  activeTab === "payments"
                    ? "bg-brand-primary text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <CreditCard className="h-5 w-5 shrink-0" />
                <span>Payments & Invoices</span>
              </button>
            )}

            {/* Settings */}
            {canViewSettings && (
              <button
                onClick={() => handleTabClick("settings")}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm sm:text-base font-bold transition-all cursor-pointer ${
                  activeTab === "settings"
                    ? "bg-brand-primary text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Palette className="h-5 w-5 shrink-0" />
                <span>Branding & Theme</span>
              </button>
            )}
          </div>
        )}

        {/* User Role Card (Expanded only) */}
        {!isCollapsed && (
          <div className="mt-auto p-3.5 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 text-sm">
                <span className="truncate">{isSuperAdmin ? "Super Admin Root" : user?.customRoleName || user?.role || "Staff"}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black bg-brand-primary/10 text-brand-primary shrink-0">
                  {isSuperAdmin ? "Full Root" : "RBAC Gated"}
                </span>
              </div>
              <p className="text-xs leading-tight text-slate-400">
                {isSuperAdmin
                  ? "Operating with unrestricted Super Admin authority."
                  : `Active permissions: ${user?.permissions?.length || 0} module(s)`}
              </p>
            </div>
          </div>
        )}

        {/* Desktop Collapse / Expand Toggle Footer */}
        <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
          {/* Theme Switcher */}
          {isCollapsed ? (
            <div className="flex justify-center">
              <ThemeToggle className="h-9 w-9" />
            </div>
          ) : (
            <ThemeToggle variant="sidebar" />
          )}

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`w-full hidden lg:flex items-center ${isCollapsed ? "justify-center" : "justify-between px-3"} py-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition duration-150 group relative cursor-pointer`}
              title={isCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
            >
              {isCollapsed ? (
                <>
                  <PanelLeftOpen className="h-5 w-5 text-brand-primary" />
                  <span className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 border border-slate-700">
                    Expand Sidebar (Ctrl+B)
                  </span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">
                    <PanelLeftClose className="h-4.5 w-4.5 text-slate-400 group-hover:text-brand-primary transition" />
                    <span>Collapse Sidebar</span>
                  </div>
                  <kbd className="hidden xl:inline-block px-2 py-0.5 text-xs font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                    Ctrl+B
                  </kbd>
                </>
              )}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
