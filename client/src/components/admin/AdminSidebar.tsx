"use client";

import React from "react";
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
} from "lucide-react";

export type AdminTab =
  | "overview"
  | "tenants"
  | "staff"
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
  const menuItems: Array<{ id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "tenants", label: "Pharmacies / Tenants", icon: Building2 },
    { id: "staff", label: "Platform Staff (CTO/PM)", icon: ShieldCheck },
    { id: "plans", label: "Subscription Plans", icon: PackageCheck },
    { id: "subscriptions", label: "Subscriptions", icon: Layers },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "analytics", label: "Platform Analytics", icon: BarChart3 },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "settings", label: "Branding & Theme", icon: Palette },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-1.5">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Platform Management Console
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? "bg-brand-primary text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto p-4 border-t border-slate-100 dark:border-slate-800/80">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 space-y-1">
          <div className="font-semibold text-slate-700 dark:text-slate-300">Platform Governance</div>
          <p className="text-[11px] leading-tight">Operating under delegated Super Admin authority with protected root invariants.</p>
        </div>
      </div>
    </aside>
  );
}
