"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import { CENTRAL_CLIENT_PLANS, calculateRemainingTrialDays } from "@/lib/planLimits";
import { useBranchContext } from "@/context/BranchContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar, OwnerModule } from "@/components/dashboard/DashboardSidebar";
import {
  getModuleFromPathname,
  getPathFromModule,
  getDefaultModuleForRole,
} from "@/lib/dashboardRoutes";
import { OverviewModule } from "@/components/dashboard/OverviewModule";
import { ProfileModule } from "@/components/dashboard/ProfileModule";
import { BranchModule } from "@/components/dashboard/BranchModule";
import { StaffModule } from "@/components/dashboard/StaffModule";
import { CreateStaffTab } from "@/components/dashboard/CreateStaffTab";
import { CreateRoleView } from "@/components/dashboard/CreateRoleView";
import { PermissionAssignmentView } from "@/components/dashboard/PermissionAssignmentView";
import { PosModule } from "@/components/dashboard/PosModule";
import { ReportsModule } from "@/components/dashboard/ReportsModule";
import { SubscriptionModule } from "@/components/dashboard/SubscriptionModule";
import { SettingsModule } from "@/components/dashboard/SettingsModule";

// Dedicated Domain Subpage Views
import { CreateCategoryView } from "@/components/dashboard/CreateCategoryView";
import { CategoryListView } from "@/components/dashboard/CategoryListView";
import { AddProductView } from "@/components/dashboard/AddProductView";
import { ProductListView } from "@/components/dashboard/ProductListView";
import { VariantsView } from "@/components/dashboard/VariantsView";
import { ExpiredProductsView } from "@/components/dashboard/ExpiredProductsView";
import { AddStockView } from "@/components/dashboard/AddStockView";
import { StockListView } from "@/components/dashboard/StockListView";
import { StockAllocationView } from "@/components/dashboard/StockAllocationView";
import { StockAllocationHistoryView } from "@/components/dashboard/StockAllocationHistoryView";
import { CreateRackView } from "@/components/dashboard/CreateRackView";
import { RackListView } from "@/components/dashboard/RackListView";
import { StockHistoryView } from "@/components/dashboard/StockHistoryView";
import { TransferStockView } from "@/components/dashboard/TransferStockView";
import { TransferHistoryView } from "@/components/dashboard/TransferHistoryView";
import { StockReceiveView } from "@/components/dashboard/StockReceiveView";
import { StockInspectionView } from "@/components/dashboard/StockInspectionView";
import { DamagedProductsView } from "@/components/dashboard/DamagedProductsView";
import { SuppliersView } from "@/components/dashboard/SuppliersView";
import { CreateSupplierView } from "@/components/dashboard/CreateSupplierView";
import { SupplierDetailsView } from "@/components/dashboard/SupplierDetailsView";
import { PurchaseHistoryView } from "@/components/dashboard/PurchaseHistoryView";
import { PaymentsDueView } from "@/components/dashboard/PaymentsDueView";
import { AccountsOverviewView } from "@/components/dashboard/AccountsOverviewView";
import { FinancialAccountsView } from "@/components/dashboard/FinancialAccountsView";
import { FundTransferView } from "@/components/dashboard/FundTransferView";
import { TransactionHistoryView } from "@/components/dashboard/TransactionHistoryView";
import { SalesHistoryView } from "@/components/dashboard/SalesHistoryView";
import { VatSettingsView } from "@/components/dashboard/VatSettingsView";
import { ExpensesManagementView } from "@/components/dashboard/ExpensesManagementView";
import { BillListView } from "@/components/dashboard/BillListView";
import { PayBillView } from "@/components/dashboard/PayBillView";
import { BillHistoryView } from "@/components/dashboard/BillHistoryView";
import { ExpensesRecurringView, RecurringConfig } from "@/components/dashboard/ExpensesRecurringView";
import { ExpensesMonthlyView } from "@/components/dashboard/ExpensesMonthlyView";
import { BillSettingsView } from "@/components/dashboard/BillSettingsView";
import { EmployeeListView } from "@/components/dashboard/EmployeeListView";
import { SalaryManagementView } from "@/components/dashboard/SalaryManagementView";
import { BranchSalaryHistoryView } from "@/components/dashboard/BranchSalaryHistoryView";
import { EmployeeDetailsView } from "@/components/dashboard/EmployeeDetailsView";
import { AttendanceView } from "@/components/dashboard/AttendanceView";
import { SalaryDeductionRules } from "@/components/dashboard/SalaryDeductionRules";
import { StaffSalaryHistoryView } from "@/components/dashboard/StaffSalaryHistoryView";
import { Product } from "@/types";
import {
  CreditCard,
  Loader2,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Building,
  Users,
} from "lucide-react";

// Persistent in-memory cache across dashboard transitions to prevent full-screen loaders
let cachedTenantProfile: any = null;
let cachedCurrentSub: any = null;
let cachedAvailablePlans: any[] | null = null;

export default function RoleBasedDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isSuperAdmin, isPlatformStaff, hasPermission, loading: authLoading } = useAuth();

  const [activeModule, setActiveModule] = useState<OwnerModule>(() => {
    const currentPath = typeof window !== "undefined" ? window.location.pathname : pathname;
    return getModuleFromPathname(currentPath, user?.role);
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [preselectedBatchId, setPreselectedBatchId] = useState<string>("");
  const [preselectedProductId, setPreselectedProductId] = useState<string>("");
  const [inspectionTransferId, setInspectionTransferId] = useState<string>("");
  const [tenantProfile, setTenantProfile] = useState<any>(() => cachedTenantProfile);
  const [currentSub, setCurrentSub] = useState<any>(() => cachedCurrentSub);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pharma_sidebar_collapsed") === "true";
    }
    return false;
  });

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("pharma_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebarCollapse();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Instant seamless navigation: update state directly and push URL without unmounting layout
  const handleNavigate = (mod: OwnerModule) => {
    if (mod !== "inv_add_product") {
      setEditingProduct(null);
    }
    if (mod === "sup_suppliers") {
      setSelectedSupplierDetailId(null);
    }
    setActiveModule(mod);
    const targetPath = getPathFromModule(mod);
    if (typeof window !== "undefined" && window.location.pathname !== targetPath) {
      window.history.pushState({ module: mod }, "", targetPath);
    }
  };

  // Handle browser Back / Forward buttons instantly without full page reload or unmount
  useEffect(() => {
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      const resolved = getModuleFromPathname(currentPath, user?.role);
      setActiveModule(resolved);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [user?.role]);

  // Global Branch Context
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
  } = useBranchContext();

  const [selectedSupplierDetailId, setSelectedSupplierDetailId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedRecurringForPay, setSelectedRecurringForPay] = useState<any | null>(null);
  const [dataLoading, setDataLoading] = useState(() => !cachedTenantProfile);
  const [initiatingPay, setInitiatingPay] = useState(false);
  const [upgradePlanId, setUpgradePlanId] = useState<string>("");
  const [upgradeBilling, setUpgradeBilling] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [availablePlans, setAvailablePlans] = useState<any[]>(() => cachedAvailablePlans || []);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (isPlatformStaff) {
      router.push("/admin");
      return;
    }

    if (user?.role === "COMPANY_OWNER" && user.verificationStatus && user.verificationStatus !== "ACTIVE") {
      router.push(`/verification-status?tenantId=${user.tenantId}&email=${encodeURIComponent(user.email || "")}`);
      return;
    }

    const currentPath = typeof window !== "undefined" ? window.location.pathname : pathname;
    if (user?.role && (currentPath === "/dashboard" || currentPath === "/dashboard/")) {
      setActiveModule(getDefaultModuleForRole(user.role));
    }

    async function loadTenantData() {
      if (cachedTenantProfile && cachedCurrentSub && cachedAvailablePlans) {
        setDataLoading(false);
        return;
      }
      try {
        setDataLoading(true);
        const [profileRes, subRes, plansRes] = await Promise.all([
          fetchApi("/tenant/profile"),
          fetchApi("/subscriptions/current"),
          fetchApi("/subscriptions/plans"),
        ]);

        if (profileRes.success) {
          cachedTenantProfile = profileRes.data;
          setTenantProfile(profileRes.data);
        }
        if (subRes.success) {
          const sub = subRes.data?.subscription || subRes.data;
          cachedCurrentSub = sub;
          setCurrentSub(sub);
        }
        if (plansRes.success && plansRes.data) {
          const paidOnly = plansRes.data.filter((p: any) => p.tier !== "TRIAL");
          cachedAvailablePlans = paidOnly;
          setAvailablePlans(paidOnly);
          if (paidOnly.length > 0 && !upgradePlanId) {
            setUpgradePlanId(paidOnly[0].id);
          }
        }
      } catch (err) {
        console.error("Error loading tenant workspace data", err);
      } finally {
        setDataLoading(false);
      }
    }

    loadTenantData();
  }, [isAuthenticated, isSuperAdmin, isPlatformStaff, authLoading, user?.role, user?.branchId, router]);

  const handleInitiateUpgrade = async (targetPlanId: string) => {
    try {
      setInitiatingPay(true);
      // 1. Change plan / create subscription
      const planRes = await fetchApi<any>("/subscriptions/change-plan", {
        method: "POST",
        body: JSON.stringify({
          newPlanId: targetPlanId,
        }),
      });

      const subId = planRes.data?.id || currentSub?.id;

      // 2. Initiate SSLCOMMERZ checkout
      const res = await fetchApi<any>("/payments/initiate", {
        method: "POST",
        body: JSON.stringify({
          subscriptionId: subId,
        }),
      });

      if (res.success && res.data?.gatewayUrl) {
        window.location.href = res.data.gatewayUrl;
      } else {
        alert(res.message || "Failed to initialize SSLCOMMERZ checkout session.");
      }
    } catch (err: any) {
      alert(err.message || "Error processing payment request");
    } finally {
      setInitiatingPay(false);
    }
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-brand-primary" />
        <span className="font-semibold text-sm">Opening Workspace...</span>
      </div>
    );
  }

  const effectiveTier = (tenantProfile?.tier || currentSub?.plan?.tier || "TRIAL").toUpperCase();
  const isTrial = effectiveTier === "TRIAL";
  const endDate = currentSub?.endDate ? new Date(currentSub.endDate) : null;
  const isExpired = endDate ? endDate.getTime() <= Date.now() : false;
  const trialDaysRemaining = isTrial ? calculateRemainingTrialDays(currentSub?.endDate) : 0;
  const isTrialExpired = isTrial && isExpired;

  // Barrier 1: Expired Trial or Expired Paid Subscription (Blocks Management)
  if (isExpired && user?.role === "COMPANY_OWNER") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-2xl w-full rounded-3xl bg-slate-950 border border-red-500/30 shadow-2xl p-6 sm:p-10 text-center space-y-8 relative overflow-hidden">
          {/* Background Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="h-20 w-20 rounded-3xl bg-red-500/10 border border-red-500/30 text-red-500 mx-auto flex items-center justify-center shadow-lg">
            <Clock className="h-10 w-10 animate-pulse" />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
              {isTrial ? "7-Day Free Trial Expired" : "Subscription Expired"}
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              {isTrial ? "Upgrade to Continue Managing Your Pharmacy" : "Renew Your Subscription Plan"}
            </h1>
            <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
              Your organization account <strong>{tenantProfile?.name || "Your Pharmacy"}</strong> has reached the end of its {isTrial ? "7-day Free Trial" : "active subscription period"}. Choose a paid plan below to instantly re-activate your counter POS, catalog, branch network, and staff access.
            </p>
          </div>

          {/* Plan Selector Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            {availablePlans.map((plan: any) => {
              const isSelected = upgradePlanId === plan.id;
              const isGrowth = plan.tier === "GROWTH";
              return (
                <div
                  key={plan.id}
                  onClick={() => setUpgradePlanId(plan.id)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 space-y-3 relative ${
                    isSelected
                      ? "bg-brand-primary/10 border-brand-primary ring-2 ring-brand-primary shadow-lg scale-102"
                      : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {isGrowth && (
                    <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-brand-primary text-white text-[10px] font-extrabold uppercase">
                      Recommended
                    </span>
                  )}
                  <div className="text-xs font-bold text-slate-400 uppercase">{plan.tier}</div>
                  <div className="text-lg font-black text-white">{plan.name}</div>
                  <div className="text-2xl font-extrabold text-brand-primary">
                    ৳{Number(plan.price).toLocaleString()}
                    <span className="text-xs text-slate-400 font-normal">/mo</span>
                  </div>
                  <ul className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800">
                    <li className="flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-slate-500" />
                      <span>{plan.maxBranches >= 999 ? "Unlimited" : `${plan.maxBranches}`} Branches</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-slate-500" />
                      <span>
                        {plan.tier === "STARTER"
                          ? "1 Staff / Branch"
                          : plan.tier === "GROWTH"
                          ? "3 Staff / Branch"
                          : "Unlimited Staff"}
                      </span>
                    </li>
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => handleInitiateUpgrade(upgradePlanId || availablePlans[0]?.id)}
              disabled={initiatingPay || !upgradePlanId}
              className="w-full py-4 rounded-2xl bg-brand-primary text-white font-bold text-base shadow-xl hover:opacity-90 transition active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {initiatingPay ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connecting to SSLCOMMERZ Sandbox...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  Upgrade & Pay via SSLCOMMERZ Sandbox Gateway
                </>
              )}
            </button>
            <div className="text-xs text-slate-500 flex items-center justify-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Instant activation & restriction removal upon payment</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Free Trial Active Banner */}
      {isTrial && !isTrialExpired && (
        <div className="shrink-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-sm z-50 text-xs font-semibold">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
            <span>
              <strong>Plan 0 - Free Trial Active:</strong> {trialDaysRemaining} day(s) remaining (Expires {endDate?.toLocaleDateString() || "in 7 days"} • 1 Branch & 1 Staff limit)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveModule("subscription")}
              className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold backdrop-blur-sm transition flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Upgrade to Paid Plan
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <DashboardHeader
        tenantName={tenantProfile?.name}
        tier={effectiveTier}
        trialDaysRemaining={isTrial ? trialDaysRemaining : undefined}
        isTrial={isTrial}
        onNavigate={handleNavigate}
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        isMobileSidebarOpen={mobileSidebarOpen}
        isSidebarCollapsed={sidebarCollapsed}
        onToggleDesktopSidebar={toggleSidebarCollapse}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Role-Aware Sidebar */}
        <DashboardSidebar
          activeModule={activeModule}
          userRole={user?.role}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onModuleChange={handleNavigate}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />

        {/* Content Area */}
        {(() => {
          const isPosActive = activeModule === "pos" || activeModule === "pos_sale";
          return (
            <main className={`flex-1 h-full min-h-0 w-full min-w-0 ${
              isPosActive
                ? "p-1.5 sm:p-2.5 overflow-hidden"
                : "p-3 sm:p-4 md:p-6 lg:p-7 xl:p-8 2xl:p-10 content-scrollbar"
            }`}>
              <div className={`w-full min-w-0 ${
                isPosActive
                  ? "h-full flex flex-col min-h-0"
                  : "max-w-[1920px] 3xl:max-w-[2400px] 4xl:max-w-[3000px] mx-auto"
              }`}>
                {renderModuleContent()}
              </div>
            </main>
          );
        })()}
      </div>
    </div>
  );

  function renderModuleContent() {
    const isOwner = user?.role === "COMPANY_OWNER" || user?.role === "SUPER_ADMIN";
    const isBranchManager = user?.role === "BRANCH_MANAGER" || user?.pharmacyRoleName?.toLowerCase().includes("branch manager");

    switch (activeModule) {
      // 📊 Overview & Dashboard
      case "overview":
        if (!isOwner && !hasPermission("dashboard.view")) {
          return <TenantAccessRestricted moduleName="Dashboard" requiredPerm="dashboard.view" />;
        }
        return <OverviewModule onNavigate={handleNavigate} />;

      // 🛒 Sales & POS Subpages
      case "pos":
      case "pos_sale":
        if (!isOwner && !hasPermission("pos.manage")) {
          return <TenantAccessRestricted moduleName="Sales & POS" requiredPerm="pos.manage" />;
        }
        return <PosModule />;

      case "pos_history":
        if (!isOwner && !hasPermission("pos.history")) {
          return <TenantAccessRestricted moduleName="Sales History" requiredPerm="pos.history" />;
        }
        return <SalesHistoryView onNavigate={handleNavigate} />;

      case "pos_vat":
        if (!isOwner && !hasPermission("pos.vat")) {
          return <TenantAccessRestricted moduleName="VAT Settings" requiredPerm="pos.vat" />;
        }
        return <VatSettingsView onNavigate={handleNavigate} />;

      // 💳 Accounts & Finance Subpages
      case "acc_overview":
      case "accounts":
        if (!isOwner && !hasPermission("accounts.manage")) {
          return <TenantAccessRestricted moduleName="Accounts & Finance Overview" requiredPerm="accounts.manage" />;
        }
        return <AccountsOverviewView onNavigate={handleNavigate} />;

      case "acc_financial_accounts":
        if (!isOwner && !hasPermission("accounts.financial_accounts")) {
          return <TenantAccessRestricted moduleName="Financial Accounts" requiredPerm="accounts.financial_accounts" />;
        }
        return <FinancialAccountsView onNavigate={handleNavigate} />;

      case "acc_fund_transfer":
        if (!isOwner && !hasPermission("accounts.fund_transfer")) {
          return <TenantAccessRestricted moduleName="Fund Transfer" requiredPerm="accounts.fund_transfer" />;
        }
        return <FundTransferView onNavigate={handleNavigate} />;

      case "acc_transaction_history":
        if (!isOwner && !hasPermission("accounts.transaction_history")) {
          return <TenantAccessRestricted moduleName="Transaction History" requiredPerm="accounts.transaction_history" />;
        }
        return <TransactionHistoryView onNavigate={handleNavigate} />;

      // 💸 Expenses & Bills (Redesigned 3-Submenu Structure)
      case "exp_list":
      case "exp_recurring":
      case "exp_settings":
        if (!isOwner && !hasPermission("expenses.list")) {
          return <TenantAccessRestricted moduleName="Bill List" requiredPerm="expenses.list" />;
        }
        return (
          <BillListView
            selectedBranchId={selectedBranchId}
            onNavigate={handleNavigate}
            onSelectForPayment={(bill) => {
              setSelectedRecurringForPay(bill);
              handleNavigate("exp_pay");
            }}
          />
        );

      case "exp_pay":
        if (!isOwner && !hasPermission("expenses.pay")) {
          return <TenantAccessRestricted moduleName="Pay Bill" requiredPerm="expenses.pay" />;
        }
        return (
          <PayBillView
            selectedBranchId={selectedBranchId}
            onNavigate={handleNavigate}
            preSelectedBill={selectedRecurringForPay}
          />
        );

      case "exp_history":
      case "exp_monthly":
      case "acc_expenses":
        if (!isOwner && !hasPermission("expenses.history")) {
          return <TenantAccessRestricted moduleName="Bill History" requiredPerm="expenses.history" />;
        }
        return (
          <BillHistoryView
            selectedBranchId={selectedBranchId}
            onNavigate={handleNavigate}
          />
        );

      // 👥 Employee & Salary
      case "sal_employees":
        if (!isOwner && !hasPermission("employee.view")) {
          return <TenantAccessRestricted moduleName="Employee List" requiredPerm="employee.view" />;
        }
        return (
          <EmployeeListView
            selectedBranchId={selectedBranchId}
            onSelectEmployee={(empId) => {
              setSelectedEmployeeId(empId);
              handleNavigate("employee_details");
            }}
            onNavigate={handleNavigate}
          />
        );

      case "sal_attendance":
        if (!isOwner && !hasPermission("attendance.manage")) {
          return <TenantAccessRestricted moduleName="Attendance Management" requiredPerm="attendance.manage" />;
        }
        return (
          <AttendanceView
            selectedBranchId={selectedBranchId}
            onNavigate={handleNavigate}
            initialTab="daily"
            onSelectEmployee={(empId) => {
              setSelectedEmployeeId(empId);
              handleNavigate("employee_details");
            }}
          />
        );

      case "sal_offdays":
        if (!isOwner && !hasPermission("attendance.offdays")) {
          return <TenantAccessRestricted moduleName="Off-Day Settings" requiredPerm="attendance.offdays" />;
        }
        return (
          <AttendanceView
            selectedBranchId={selectedBranchId}
            onNavigate={handleNavigate}
            initialTab="offdays"
            onSelectEmployee={(empId) => {
              setSelectedEmployeeId(empId);
              handleNavigate("employee_details");
            }}
          />
        );

      case "sal_deduction_rules":
        if (!isOwner && !hasPermission("salary.deductions")) {
          return <TenantAccessRestricted moduleName="Salary Deduction Rules" requiredPerm="salary.deductions" />;
        }
        return (
          <SalaryDeductionRules selectedBranchId={selectedBranchId} />
        );

      case "sal_management":
      case "acc_salaries":
        if (!isOwner && !hasPermission("salary.manage")) {
          return <TenantAccessRestricted moduleName="Salary Management" requiredPerm="salary.manage" />;
        }
        return (
          <SalaryManagementView
            selectedBranchId={selectedBranchId}
            onSelectEmployee={(empId) => {
              setSelectedEmployeeId(empId);
              handleNavigate("employee_details");
            }}
            onNavigate={handleNavigate}
          />
        );

      case "sal_history":
        if (!isOwner && !hasPermission("salary.history")) {
          return <TenantAccessRestricted moduleName="Salary History" requiredPerm="salary.history" />;
        }
        return (
          <BranchSalaryHistoryView
            selectedBranchId={selectedBranchId}
            onNavigate={handleNavigate}
            onSelectEmployee={(empId) => {
              setSelectedEmployeeId(empId);
              handleNavigate("employee_details");
            }}
          />
        );

      case "employee_details":
        if (!isOwner && !hasPermission("employee.view")) {
          return <TenantAccessRestricted moduleName="Employee Details & Salary History" requiredPerm="employee.view" />;
        }
        return (
          <EmployeeDetailsView
            employeeId={selectedEmployeeId}
            selectedBranchId={selectedBranchId}
            onBack={() => handleNavigate("sal_management")}
          />
        );

      case "staff_salary_history":
        return (
          <StaffSalaryHistoryView
            onBack={() => handleNavigate("overview")}
          />
        );

      // 📁 Category Management Subpages
      case "cat_create":
        if (!isOwner && !hasPermission("category.manage")) {
          return <TenantAccessRestricted moduleName="Manage Categories" requiredPerm="category.manage" />;
        }
        return <CreateCategoryView onNavigate={handleNavigate} />;

      case "cat_list":
        if (!isOwner && !hasPermission("category.subcategories") && !hasPermission("category.manage")) {
          return <TenantAccessRestricted moduleName="Manage Subcategories" requiredPerm="category.subcategories" />;
        }
        return <CategoryListView onNavigate={handleNavigate} />;

      // 📦 Inventory Subpages
      case "inv_add_product":
        if (!isOwner && !hasPermission("inventory.add_product")) {
          return <TenantAccessRestricted moduleName="Add Product" requiredPerm="inventory.add_product" />;
        }
        return (
          <AddProductView
            editingProduct={editingProduct}
            onNavigate={handleNavigate}
            onClearEditing={() => setEditingProduct(null)}
          />
        );

      case "inv_product_list":
        if (!isOwner && !hasPermission("inventory.product_list")) {
          return <TenantAccessRestricted moduleName="Product List" requiredPerm="inventory.product_list" />;
        }
        return (
          <ProductListView
            onNavigate={handleNavigate}
            onEditProduct={(p) => {
              setEditingProduct(p);
              handleNavigate("inv_add_product");
            }}
          />
        );

      case "inv_variants":
        if (!isOwner && !hasPermission("inventory.product_list")) {
          return <TenantAccessRestricted moduleName="Categories & Variants" requiredPerm="inventory.product_list" />;
        }
        return <VariantsView />;

      case "inv_expired_products":
        if (!isOwner && !hasPermission("inventory.product_list")) {
          return <TenantAccessRestricted moduleName="Expired Products" requiredPerm="inventory.product_list" />;
        }
        return <ExpiredProductsView />;

      // 🔄 Stock Management Subpages
      case "stock_add_stock":
        if (!isOwner && !hasPermission("stock.add_stock")) {
          return <TenantAccessRestricted moduleName="Add Stock" requiredPerm="stock.add_stock" />;
        }
        return <AddStockView onNavigate={handleNavigate} />;

      case "stock_stock_list":
        if (!isOwner && !hasPermission("stock.stock_list")) {
          return <TenantAccessRestricted moduleName="Stock List" requiredPerm="stock.stock_list" />;
        }
        return (
          <StockListView
            onNavigate={(module, extra) => {
              if (extra && module === "stock_stock_allocation") {
                if (typeof extra === "object") {
                  setPreselectedBatchId(extra.batchId || "");
                  setPreselectedProductId(extra.productId || "");
                } else {
                  setPreselectedBatchId(extra);
                  setPreselectedProductId("");
                }
              }
              handleNavigate(module);
            }}
          />
        );

      case "stock_stock_allocation":
        if (!isOwner && !hasPermission("stock.allocation")) {
          return <TenantAccessRestricted moduleName="Stock Allocation" requiredPerm="stock.allocation" />;
        }
        return (
          <StockAllocationView
            selectedBranchId={selectedBranchId}
            preselectedProductId={preselectedProductId}
            preselectedBatchId={preselectedBatchId}
            onClearPreselectedBatch={() => {
              setPreselectedBatchId("");
              setPreselectedProductId("");
            }}
            onNavigate={handleNavigate}
          />
        );

      case "stock_allocation_history":
        if (!isOwner && !hasPermission("stock.allocation_history")) {
          return <TenantAccessRestricted moduleName="Allocation History" requiredPerm="stock.allocation_history" />;
        }
        return (
          <StockAllocationHistoryView
            selectedBranchId={selectedBranchId}
            onNavigate={handleNavigate}
          />
        );

      case "stock_stock_history":
        if (!isOwner && !hasPermission("stock.stock_history")) {
          return <TenantAccessRestricted moduleName="Stock History" requiredPerm="stock.stock_history" />;
        }
        return <StockHistoryView />;

      case "stock_transfer_stock":
        if (!isOwner && !hasPermission("stock.transfer")) {
          return <TenantAccessRestricted moduleName="Transfer Stock" requiredPerm="stock.transfer" />;
        }
        return <TransferStockView onNavigate={handleNavigate} />;

      case "stock_transfer_history":
        if (!isOwner && !hasPermission("stock.transfer_history")) {
          return <TenantAccessRestricted moduleName="Transfer History" requiredPerm="stock.transfer_history" />;
        }
        return <TransferHistoryView onNavigate={handleNavigate} />;

      case "stock_stock_receive":
        if (!isOwner && !hasPermission("stock.receive")) {
          return <TenantAccessRestricted moduleName="Stock Receive" requiredPerm="stock.receive" />;
        }
        return (
          <StockReceiveView
            onNavigate={handleNavigate}
            onInspectTransfer={(transferId) => {
              setInspectionTransferId(transferId);
              handleNavigate("stock_inspection");
            }}
          />
        );

      case "stock_inspection":
        if (!isOwner && !hasPermission("stock.receive")) {
          return <TenantAccessRestricted moduleName="Stock Receiving & Inspection" requiredPerm="stock.receive" />;
        }
        return (
          <StockInspectionView
            transferId={inspectionTransferId}
            onNavigate={handleNavigate}
          />
        );

      case "stock_damaged_products":
        if (!isOwner && !hasPermission("stock.damaged")) {
          return <TenantAccessRestricted moduleName="Damaged Products" requiredPerm="stock.damaged" />;
        }
        return <DamagedProductsView onNavigate={handleNavigate} />;

      // 📍 Location Management Subpages
      case "loc_create_rack":
        if (!isOwner && !hasPermission("location.create_rack")) {
          return <TenantAccessRestricted moduleName="Create Rack" requiredPerm="location.create_rack" />;
        }
        return (
          <CreateRackView
            selectedBranchId={selectedBranchId}
            onNavigate={handleNavigate}
          />
        );

      case "loc_rack_list":
        if (!isOwner && !hasPermission("location.rack_list")) {
          return <TenantAccessRestricted moduleName="Rack List" requiredPerm="location.rack_list" />;
        }
        return (
          <RackListView
            selectedBranchId={selectedBranchId}
            onNavigate={handleNavigate}
          />
        );

      // 🏭 Supplier Management Subpages
      case "sup_create_supplier":
        if (!isOwner && !hasPermission("supplier.manage")) {
          return <TenantAccessRestricted moduleName="Create Supplier" requiredPerm="supplier.manage" />;
        }
        return <CreateSupplierView onNavigate={handleNavigate} />;

      case "sup_suppliers":
        if (!isOwner && !hasPermission("supplier.view")) {
          return <TenantAccessRestricted moduleName="Suppliers" requiredPerm="supplier.view" />;
        }
        if (selectedSupplierDetailId) {
          return (
            <SupplierDetailsView
              supplierId={selectedSupplierDetailId}
              onBack={() => setSelectedSupplierDetailId(null)}
              onNavigate={handleNavigate}
            />
          );
        }
        return (
          <SuppliersView
            onNavigate={handleNavigate}
            onSelectSupplier={(id) => setSelectedSupplierDetailId(id)}
          />
        );

      case "sup_purchase_history":
        if (!isOwner && !hasPermission("supplier.purchase_history")) {
          return <TenantAccessRestricted moduleName="Purchase History" requiredPerm="supplier.purchase_history" />;
        }
        return <PurchaseHistoryView onNavigate={handleNavigate} />;

      case "sup_payments_due":
        if (!isOwner && !hasPermission("supplier.payments_due")) {
          return <TenantAccessRestricted moduleName="Payments / Due" requiredPerm="supplier.payments_due" />;
        }
        return <PaymentsDueView onNavigate={handleNavigate} />;

      // 👥 Staff & Roles Administration
      case "branches":
        if (!isOwner && !hasPermission("branches.manage")) {
          return <TenantAccessRestricted moduleName="Branch Network" requiredPerm="branches.manage" />;
        }
        return <BranchModule />;

      case "staff":
        if (!isOwner && !hasPermission("staff.view")) {
          return <TenantAccessRestricted moduleName="Staff List" requiredPerm="staff.view" />;
        }
        return <StaffModule onNavigate={handleNavigate} />;

      case "staff_create":
        if (!isOwner && !hasPermission("staff.create")) {
          return <TenantAccessRestricted moduleName="Create Staff" requiredPerm="staff.create" />;
        }
        return <CreateStaffTab onNavigate={handleNavigate} />;

      case "create_role":
      case "roles":
        if (!isOwner && !hasPermission("roles.manage")) {
          return <TenantAccessRestricted moduleName="Create Role" requiredPerm="roles.manage" />;
        }
        return <CreateRoleView />;

      case "permission_assignment":
        if (!isOwner && !hasPermission("roles.manage")) {
          return <TenantAccessRestricted moduleName="Permission Assignment" requiredPerm="roles.manage" />;
        }
        return <PermissionAssignmentView />;

      case "reports":
        if (!isOwner && !hasPermission("accounts.reports")) {
          return <TenantAccessRestricted moduleName="Sales Reports" requiredPerm="accounts.reports" />;
        }
        return <ReportsModule />;

      // ⚙️ Pharmacy Owner Settings
      case "profile":
        if (!isOwner && !hasPermission("settings.manage")) {
          return <TenantAccessRestricted moduleName="Pharmacy Profile" requiredPerm="settings.manage" />;
        }
        return <ProfileModule />;

      case "subscription":
        if (!isOwner) {
          return <TenantAccessRestricted moduleName="Subscription Plan" requiredPerm="Owner Only" />;
        }
        return <SubscriptionModule />;

      case "settings":
        if (!isOwner && !hasPermission("settings.manage")) {
          return <TenantAccessRestricted moduleName="Settings" requiredPerm="settings.manage" />;
        }
        return <SettingsModule />;

      default:
        return <OverviewModule onNavigate={handleNavigate} />;
    }
  }
}

function TenantAccessRestricted({ moduleName, requiredPerm }: { moduleName: string; requiredPerm: string }) {
  return (
    <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-w-lg mx-auto my-12 shadow-xs">
      <div className="h-14 w-14 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-500 flex items-center justify-center mx-auto">
        <Users className="h-8 w-8" />
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
        Please contact your Pharmacy Owner to adjust your role permissions.
      </p>
    </div>
  );
}

