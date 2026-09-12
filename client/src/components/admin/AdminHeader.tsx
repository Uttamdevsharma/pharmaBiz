"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { ChangePasswordModal } from "@/components/dashboard/ChangePasswordModal";
import {
  Pill,
  LogOut,
  Shield,
  Cpu,
  FolderKanban,
  Lock,
  Menu,
  KeyRound,
  ChevronDown,
  User as UserIcon,
} from "lucide-react";

interface AdminHeaderProps {
  activeTab: string;
  onToggleMobileSidebar?: () => void;
}

export function AdminHeader({ activeTab, onToggleMobileSidebar }: AdminHeaderProps) {
  const { user, logout } = useAuth();
  const { settings } = useSettings();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isCTO = user?.role === "CTO";
  const isPM = user?.role === "PROJECT_MANAGER";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const initials = (user?.name || user?.username || "A")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <>
      <header className="h-16 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition -ml-1 shrink-0 cursor-pointer"
              aria-label="Toggle Navigation Menu"
              title="Toggle Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {settings.logoUrl ? (
              <div className="h-9 w-9 rounded-lg overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-0.5 shadow-sm">
                <img
                  src={settings.logoUrl}
                  alt={settings.siteName || "Logo"}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="h-9 w-9 rounded-lg bg-brand-primary flex items-center justify-center text-white shadow-sm">
                <Pill className="h-5 w-5 transform -rotate-45" />
              </div>
            )}
            <span className="font-bold text-slate-900 dark:text-white hidden sm:inline">
              {settings.siteName || "PharmaBiz"}
            </span>
          </Link>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>

          {isSuperAdmin ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Lock className="h-3 w-3" />
              Super Admin (Root)
            </span>
          ) : isCTO ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Cpu className="h-3 w-3" />
              Platform CTO (Delegated Admin)
            </span>
          ) : isPM ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <FolderKanban className="h-3 w-3" />
              Project Manager (Delegated Admin)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
              <Shield className="h-3 w-3" />
              Platform Console
            </span>
          )}
        </div>

        {/* Right Nav: Profile Button with Simple Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition cursor-pointer"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className="h-8 w-8 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20 flex items-center justify-center font-bold text-xs shrink-0">
              {initials || <UserIcon className="h-4 w-4" />}
            </div>

            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {user?.name || user?.username || "Platform Staff"}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {user?.role || "Staff"}
              </div>
            </div>

            <ChevronDown
              className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                dropdownOpen ? "rotate-180 text-brand-primary" : ""
              }`}
            />
          </button>

          {/* Profile Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  setPasswordModalOpen(true);
                }}
                className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer"
              >
                <KeyRound className="h-4 w-4 text-slate-400" />
                <span>Change Password</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2.5 transition cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-red-500" />
                <span>Logout</span>
              </button>
            </div>
          )}
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
