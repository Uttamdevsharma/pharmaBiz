"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import {
  Pill,
  LogOut,
  Store,
  Sparkles,
  Clock,
  User as UserIcon,
  KeyRound,
  History,
  ChevronDown,
  ShieldCheck,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { getClientPlanConfig } from "@/lib/planLimits";
import { useBranchContext } from "@/context/BranchContext";
import { OwnerModule } from "./DashboardSidebar";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { ThemeToggle } from "@/components/common/ThemeToggle";

interface DashboardHeaderProps {
  tenantName?: string;
  logoUrl?: string;
  tier?: string;
  isTrial?: boolean;
  trialDaysRemaining?: number;
  branches?: any[];
  selectedBranchId?: string;
  onBranchChange?: (branchId: string) => void;
  onNavigate?: (module: OwnerModule) => void;
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
  isSidebarCollapsed?: boolean;
  onToggleDesktopSidebar?: () => void;
}

export function DashboardHeader({
  tenantName,
  logoUrl: propLogoUrl,
  tier = "TRIAL",
  isTrial = false,
  trialDaysRemaining,
  branches: propBranches,
  selectedBranchId: propSelectedBranchId,
  onBranchChange: propOnBranchChange,
  onNavigate,
  onToggleMobileSidebar,
  isMobileSidebarOpen,
  isSidebarCollapsed,
  onToggleDesktopSidebar,
}: DashboardHeaderProps) {
  const { user, logout } = useAuth();
  const { settings } = useSettings();

  const tenantLogoUrl = user?.tenant?.logoUrl || propLogoUrl || null;
  const displayTenantName = user?.tenant?.name || tenantName || "Pharmacy Chain";
  const {
    branches: contextBranches,
    selectedBranchId: contextSelectedBranchId,
    setSelectedBranchId: contextSetSelectedBranchId,
    canSwitchBranch,
    isBranchLocked,
    currentBranch,
  } = useBranchContext();

  const branches = propBranches && propBranches.length > 0 ? propBranches : contextBranches;
  const activeBranchId = propSelectedBranchId !== undefined ? propSelectedBranchId : contextSelectedBranchId;
  const handleBranchChange = propOnBranchChange || contextSetSelectedBranchId;
  const planConfig = getClientPlanConfig(tier);

  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isTrialTier = isTrial || tier === "TRIAL";

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute initials fallback
  const getInitials = () => {
    if (user?.name) {
      const parts = user.name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.name.slice(0, 2).toUpperCase();
    }
    if (user?.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    return "ST";
  };

  const roleDisplay = user?.pharmacyRoleName || user?.customRoleName || user?.role?.replace(/_/g, " ") || "Staff";

  return (
    <>
      <header className="h-16 2xl:h-20 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 sm:px-6 2xl:px-10 flex items-center justify-between sticky top-0 z-40 transition-all duration-200 shrink-0 gap-2 print:hidden">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile / Tablet Sidebar Hamburger Toggle */}
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition -ml-1 shrink-0 cursor-pointer"
              aria-label="Toggle Navigation Menu"
              title="Toggle Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          {/* Desktop Sidebar Collapse Toggle */}
          {onToggleDesktopSidebar && (
            <button
              type="button"
              onClick={onToggleDesktopSidebar}
              className="hidden lg:flex p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition -ml-1 shrink-0 cursor-pointer"
              aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              title={isSidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="h-5 w-5 text-brand-primary" />
              ) : (
                <PanelLeftClose className="h-5 w-5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200" />
              )}
            </button>
          )}

          <Link href="/dashboard" className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            {tenantLogoUrl ? (
              <div className="h-8 w-8 sm:h-9 sm:w-9 xl:h-10 xl:w-10 2xl:h-12 2xl:w-12 rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-0.5 shadow-sm shrink-0">
                <img
                  src={tenantLogoUrl}
                  alt={displayTenantName}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="h-8 w-8 sm:h-9 sm:w-9 xl:h-10 xl:w-10 2xl:h-12 2xl:w-12 rounded-xl bg-brand-primary flex items-center justify-center text-white shadow-sm font-bold text-xs xl:text-sm shrink-0">
                {displayTenantName.slice(0, 2).toUpperCase() || <Pill className="h-4 w-4 sm:h-5 sm:w-5 xl:h-6 xl:w-6 transform -rotate-45" />}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs sm:text-sm xl:text-base 2xl:text-lg text-slate-900 dark:text-white leading-tight truncate max-w-[110px] xs:max-w-[140px] sm:max-w-[200px] lg:max-w-xs">
                {displayTenantName}
              </span>
              <span className="text-[9px] sm:text-[10px] xl:text-xs text-slate-400 font-medium hidden xs:inline">Pharmacy Workspace</span>
            </div>
          </Link>

          <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 xl:px-3 xl:py-1 rounded-full text-[11px] xl:text-xs font-bold uppercase tracking-wider bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shrink-0">
            <Sparkles className="h-3 w-3 xl:h-3.5 xl:w-3.5" />
            {planConfig.name}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Global Branch Context Selector */}
          {canSwitchBranch ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4 xl:h-5 xl:w-5 text-brand-primary shrink-0" />
              <select
                value={activeBranchId || ""}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="px-2 py-1 sm:px-2.5 sm:py-1.5 xl:px-3.5 xl:py-2 rounded-xl text-[11px] sm:text-xs xl:text-sm font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary shadow-xs transition cursor-pointer max-w-[110px] xs:max-w-[140px] sm:max-w-[200px] md:max-w-[240px] truncate"
                title="Global Branch Context: Select branch or consolidated company-wide view"
              >
                <option value="">🏢 All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    📍 {b.name} {b.location ? `(${b.location})` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div
              className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 xl:py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[11px] sm:text-xs xl:text-sm font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-xs"
              title="Assigned Branch (Branch Confinement Active)"
            >
              <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-primary shrink-0" />
              <span className="truncate max-w-[90px] xs:max-w-[120px] sm:max-w-[180px]">
                {currentBranch?.name || branches.find((b) => b.id === (user?.branchId || activeBranchId))?.name || "Branch"}
              </span>
            </div>
          )}

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 hidden xs:block" />

          {/* Quick Theme Toggle Button */}
          <ThemeToggle />

          {/* Top-Right Staff Profile Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 sm:gap-3 p-1 sm:p-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition group text-left"
              title="Staff Profile Menu"
            >
              <div className="text-right hidden sm:block">
                <div className="text-xs xl:text-sm font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[120px]">
                  {user?.name || user?.username || "Staff User"}
                </div>
                <div className="text-[10px] xl:text-xs text-brand-primary font-semibold uppercase tracking-wider truncate max-w-[120px]">
                  {roleDisplay}
                </div>
              </div>

              {/* Avatar with fallback initials */}
              <div className="relative">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || "User Avatar"}
                    className="h-8 w-8 sm:h-9 sm:w-9 xl:h-10 xl:w-10 rounded-xl object-cover border-2 border-brand-primary/30 shadow-xs"
                  />
                ) : (
                  <div className="h-8 w-8 sm:h-9 sm:w-9 xl:h-10 xl:w-10 rounded-xl bg-gradient-to-br from-brand-primary to-teal-600 text-white font-black text-xs xl:text-sm flex items-center justify-center shadow-xs">
                    {getInitials()}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
              </div>

              <ChevronDown className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition duration-150 ${menuOpen ? "transform rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Profile Header Box */}
                <div className="p-3 mb-1 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name || "Avatar"}
                      className="h-10 w-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-brand-primary text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                      {getInitials()}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <div className="font-bold text-xs xl:text-sm text-slate-900 dark:text-white truncate">
                      {user?.name || user?.username}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {user?.email || `@${user?.username}`}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-brand-primary/10 text-brand-primary uppercase">
                        <ShieldCheck className="h-2.5 w-2.5" />
                        {roleDisplay}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="space-y-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      if (onNavigate) onNavigate("profile");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
                  >
                    <UserIcon className="h-4 w-4 text-slate-400" />
                    <span>Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setPasswordModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
                  >
                    <KeyRound className="h-4 w-4 text-slate-400" />
                    <span>Change Password</span>
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      if (onNavigate) onNavigate("staff_salary_history");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
                  >
                    <History className="h-4 w-4 text-slate-400" />
                    <span>Salary History</span>
                  </button>

                  {/* Dark / Light Mode Option */}
                  <ThemeToggle variant="dropdown-item" />
                </div>

                <div className="my-1.5 h-[1px] bg-slate-200 dark:bg-slate-800" />

                {/* Log Out */}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition text-left text-xs font-bold"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </>
  );
}
