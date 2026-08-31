"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { Pill, LogOut, Shield, ExternalLink } from "lucide-react";

interface AdminHeaderProps {
  activeTab: string;
}

export function AdminHeader({ activeTab }: AdminHeaderProps) {
  const { user, logout } = useAuth();
  const { settings } = useSettings();

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5">
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
            {settings.siteName || "PharmaFlow"}
          </span>
        </Link>
        <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          <Shield className="h-3 w-3" />
          Super Admin
        </span>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/"
          target="_blank"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-brand-primary transition"
        >
          <span>Live Site</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>

        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-900 dark:text-white">{user?.username || "Super Admin"}</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Platform HQ</div>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
