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
}

export function AdminSidebar({
  activeTab,
  onTabChange,
  mobileOpen = false,
  onCloseMobile,
}: AdminSidebarProps) {
  const { isSuperAdmin, hasPermission, user } = useAuth();

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
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 md:hidden transition-opacity duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 h-full max-h-full min-h-0 overflow-hidden transition-all duration-300 z-50 md:z-auto ${
          mobileOpen
            ? "fixed inset-y-0 left-0 w-72 sm:w-80 shadow-2xl animate-in slide-in-from-left duration-200"
            : "hidden md:flex md:w-64"
        }`}
      >
        {/* Mobile Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between md:hidden shrink-0">
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

        <div className="p-4 space-y-1.5 flex-1 sidebar-scrollbar">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Platform Management
          </div>

          {/* Overview */}
          <button
            onClick={() => handleTabClick("overview")}
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
            onClick={() => handleTabClick("verifications")}
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
            onClick={() => handleTabClick("tenants")}
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
                    onClick={() => handleTabClick("staff-list")}
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
                    onClick={() => handleTabClick("staff-create")}
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
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isRoleTabActive
                          ? "bg-slate-100 dark:bg-slate-800 text-brand-primary font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <KeyRound className="h-3.5 w-3.5 shrink-0" />
                        <span>Role Management</span>
                      </div>
                      {roleMenuOpen ? (
                        <ChevronDown className="h-3 w-3 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-slate-400" />
                      )}
                    </button>

                    {roleMenuOpen && (
                      <div className="mt-1 ml-3 pl-2.5 border-l border-slate-200 dark:border-slate-800 space-y-1">
                        <button
                          onClick={() => handleTabClick("create-role")}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                            activeTab === "create-role" || activeTab === "roles-permissions"
                              ? "bg-brand-primary text-white font-semibold shadow-xs"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          <ShieldPlus className="h-3 w-3 shrink-0" />
                          <span>Create Role</span>
                        </button>

                        <button
                          onClick={() => handleTabClick("permission-assignment")}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                            activeTab === "permission-assignment"
                              ? "bg-brand-primary text-white font-semibold shadow-xs"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          <CheckSquare className="h-3 w-3 shrink-0" />
                          <span>Permission Assignment</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Subscription Plans */}
        {canViewPlans && (
          <button
            onClick={() => handleTabClick("plans")}
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
            onClick={() => handleTabClick("subscriptions")}
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

        {/* Settings */}
        {canViewSettings && (
          <button
            onClick={() => handleTabClick("settings")}
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

      <div className="mt-auto p-4 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
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
  </>
);
}

