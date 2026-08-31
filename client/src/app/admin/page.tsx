"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar, AdminTab } from "@/components/admin/AdminSidebar";
import { OverviewTab } from "@/components/admin/OverviewTab";
import { TenantsTab } from "@/components/admin/TenantsTab";
import { PlansTab } from "@/components/admin/PlansTab";
import { SubscriptionsTab } from "@/components/admin/SubscriptionsTab";
import { PaymentsTab } from "@/components/admin/PaymentsTab";
import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import { NotificationsTab } from "@/components/admin/NotificationsTab";
import { SettingsTab } from "@/components/admin/SettingsTab";
import { Loader2, ShieldAlert } from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated || !isSuperAdmin) {
        router.push("/login");
      }
    }
  }, [loading, isAuthenticated, isSuperAdmin, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 text-slate-500 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
        <span className="font-semibold text-sm">Verifying Super Admin Authorization...</span>
      </div>
    );
  }

  if (!isAuthenticated || !isSuperAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-100 dark:bg-slate-950 space-y-4">
        <ShieldAlert className="h-12 w-12 text-red-500" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-xs text-slate-500 max-w-sm">
          You do not have Super Admin privileges to view this platform console.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Super Admin Top Header */}
      <AdminHeader activeTab={activeTab} />

      {/* Main Admin Console Layout */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Navigation */}
        <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Dynamic Tab Content Area */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "tenants" && <TenantsTab />}
          {activeTab === "plans" && <PlansTab />}
          {activeTab === "subscriptions" && <SubscriptionsTab />}
          {activeTab === "payments" && <PaymentsTab />}
          {activeTab === "analytics" && <AnalyticsTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "settings" && <SettingsTab />}
        </main>
      </div>
    </div>
  );
}
