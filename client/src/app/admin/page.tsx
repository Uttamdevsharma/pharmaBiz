"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar, AdminTab } from "@/components/admin/AdminSidebar";
import { OverviewTab } from "@/components/admin/OverviewTab";
import { TenantsTab } from "@/components/admin/TenantsTab";
import { StaffListTab } from "@/components/admin/StaffListTab";
import { CreateStaffTab } from "@/components/admin/CreateStaffTab";
import { RolesPermissionsTab } from "@/components/admin/RolesPermissionsTab";
import { PlansTab } from "@/components/admin/PlansTab";
import { SubscriptionsTab } from "@/components/admin/SubscriptionsTab";
import { PaymentsTab } from "@/components/admin/PaymentsTab";
import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import { NotificationsTab } from "@/components/admin/NotificationsTab";
import { SettingsTab } from "@/components/admin/SettingsTab";
import { Loader2, ShieldAlert } from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated, isSuperAdmin, isPlatformStaff, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (!isPlatformStaff) {
        router.push("/dashboard");
      }
    }
  }, [loading, isAuthenticated, isPlatformStaff, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 text-slate-500 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
        <span className="font-semibold text-sm">Verifying Platform Authorization...</span>
      </div>
    );
  }

  if (!isAuthenticated || !isPlatformStaff) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-100 dark:bg-slate-950 space-y-4">
        <ShieldAlert className="h-12 w-12 text-red-500" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-xs text-slate-500 max-w-sm">
          You do not have platform privileges to view this management console.
        </p>
      </div>
    );
  }

  // Permission Checks per View
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab />;

      case "tenants":
        if (!isSuperAdmin && !hasPermission("pharmacies.manage")) {
          return <AccessRestrictedView moduleName="Pharmacies & Tenants" requiredPerm="pharmacies.manage" />;
        }
        return <TenantsTab />;

      case "staff":
      case "staff-list":
        if (!isSuperAdmin && !hasPermission("staff.manage") && !hasPermission("staff.create")) {
          return <AccessRestrictedView moduleName="Staff Management" requiredPerm="staff.manage" />;
        }
        return <StaffListTab onNavigateToCreate={() => setActiveTab("staff-create")} />;

      case "staff-create":
        if (!isSuperAdmin && !hasPermission("staff.create")) {
          return <AccessRestrictedView moduleName="Create Staff" requiredPerm="staff.create" />;
        }
        return (
          <CreateStaffTab
            onSuccess={() => setActiveTab("staff-list")}
            onNavigateToList={() => setActiveTab("staff-list")}
            onNavigateToRoles={() => setActiveTab("roles-permissions")}
          />
        );

      case "roles-permissions":
        if (!isSuperAdmin && !hasPermission("roles.manage")) {
          return <AccessRestrictedView moduleName="Roles & Permissions" requiredPerm="roles.manage" />;
        }
        return <RolesPermissionsTab onNavigateToCreateStaff={() => setActiveTab("staff-create")} />;

      case "plans":
        if (!isSuperAdmin && !hasPermission("plans.manage")) {
          return <AccessRestrictedView moduleName="Subscription Plans" requiredPerm="plans.manage" />;
        }
        return <PlansTab />;

      case "subscriptions":
        if (!isSuperAdmin && !hasPermission("subscriptions.manage")) {
          return <AccessRestrictedView moduleName="Subscriptions" requiredPerm="subscriptions.manage" />;
        }
        return <SubscriptionsTab />;

      case "payments":
        if (!isSuperAdmin && !hasPermission("payments.view")) {
          return <AccessRestrictedView moduleName="Payments & Transactions" requiredPerm="payments.view" />;
        }
        return <PaymentsTab />;

      case "analytics":
        if (!isSuperAdmin && !hasPermission("reports.view")) {
          return <AccessRestrictedView moduleName="Platform Analytics" requiredPerm="reports.view" />;
        }
        return <AnalyticsTab />;

      case "notifications":
        return <NotificationsTab />;

      case "settings":
        if (!isSuperAdmin && !hasPermission("settings.manage")) {
          return <AccessRestrictedView moduleName="Branding & System Settings" requiredPerm="settings.manage" />;
        }
        return <SettingsTab />;

      default:
        return <OverviewTab />;
    }
  };

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
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
}

function AccessRestrictedView({ moduleName, requiredPerm }: { moduleName: string; requiredPerm: string }) {
  return (
    <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-w-lg mx-auto my-12 shadow-xs">
      <div className="h-14 w-14 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-500 flex items-center justify-center mx-auto">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Module Access Restricted</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
          You do not have permission to access <span className="font-semibold text-slate-700 dark:text-slate-300">{moduleName}</span>.
        </p>
      </div>
      <div className="inline-block px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-400">
        Required permission: <span className="text-brand-primary font-bold">{requiredPerm}</span>
      </div>
      <p className="text-[11px] text-slate-400">
        Please contact your Platform Super Admin to grant you access to this capability.
      </p>
    </div>
  );
}

