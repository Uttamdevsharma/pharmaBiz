"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import { loadingProgress } from "@/lib/loadingProgress";
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
import { BranchCreateView } from "@/components/dashboard/BranchCreateView";
import { StaffModule } from "@/components/dashboard/StaffModule";
import { CreateStaffTab } from "@/components/dashboard/CreateStaffTab";
import { CreateRoleView } from "@/components/dashboard/CreateRoleView";
import { PermissionAssignmentView } from "@/components/dashboard/PermissionAssignmentView";
import { PosModule } from "@/components/dashboard/PosModule";
import { ReportsModule } from "@/components/dashboard/ReportsModule";
import { SubscriptionModule } from "@/components/dashboard/SubscriptionModule";
import { SubscriptionHistoryView } from "@/components/dashboard/SubscriptionHistoryView";
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
import { CreateCustomLocationView } from "@/components/dashboard/CreateCustomLocationView";
import { CustomLocationListView } from "@/components/dashboard/CustomLocationListView";
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
import { DueSalesView } from "@/components/dashboard/DueSalesView";
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
  AlertTriangle,
  X,
  RefreshCw,
  History,
  Check,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

// Persistent in-memory cache across dashboard transitions to prevent full-screen loaders
let cachedTenantProfile: any = null;
let cachedCurrentSub: any = null;
let cachedAvailablePlans: any[] | null = null;

export default function RoleBasedDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isSuperAdmin, isPlatformStaff, hasPermission, loading: authLoading, logout } = useAuth();

  const [activeModule, setActiveModule] = useState<OwnerModule>(() => {
    const currentPath = typeof window !== "undefined" ? window.location.pathname : pathname;
    return getModuleFromPathname(currentPath, user?.role);
  });
  const [displayedModule, setDisplayedModule] = useState<OwnerModule>(() => {
    const currentPath = typeof window !== "undefined" ? window.location.pathname : pathname;
    return getModuleFromPathname(currentPath, user?.role);
  });
  const navTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [preselectedBatchId, setPreselectedBatchId] = useState<string>("");
  const [preselectedProductId, setPreselectedProductId] = useState<string>("");
  const [inspectionTransferId, setInspectionTransferId] = useState<string>("");
  const [tenantProfile, setTenantProfile] = useState<any>(() => cachedTenantProfile);
  const [currentSub, setCurrentSub] = useState<any>(() => cachedCurrentSub);
  const [showOwnerExpiryModal, setShowOwnerExpiryModal] = useState<boolean>(false);
  const [showStaffExpiryModal, setShowStaffExpiryModal] = useState<boolean>(false);

  const subEndDate = currentSub?.endDate ? new Date(currentSub.endDate) : null;
  const isExpired = subEndDate ? subEndDate.getTime() <= Date.now() : false;
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pharma_sidebar_collapsed");
      if (saved !== null) {
        setSidebarCollapsed(saved === "true");
      }
    } catch {}
  }, []);

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

  // Deferred seamless page transition: keeps previous page visible while top progress bar animates
  const handleNavigate = (mod: OwnerModule) => {
    if (mod === activeModule && mod === displayedModule) return;

    loadingProgress.start();
    if (mod !== "inv_add_product") {
      setEditingProduct(null);
    }
    if (mod === "sup_suppliers") {
      setSelectedSupplierDetailId(null);
    }

    if (isExpired) {
      if (user?.role === "COMPANY_OWNER") {
        if (mod === "subscription" || mod === "subscription_plans" || mod === "subscription_history") {
          setShowOwnerExpiryModal(false);
          setActiveModule(mod);
          const targetPath = getPathFromModule(mod);
          if (navTimerRef.current) clearTimeout(navTimerRef.current);
          navTimerRef.current = setTimeout(() => {
            React.startTransition(() => {
              setDisplayedModule(mod);
            });
            if (typeof window !== "undefined" && window.location.pathname !== targetPath) {
              window.history.pushState({ module: mod }, "", targetPath);
            }
            loadingProgress.done();
          }, 180);
          return;
        } else {
          setShowOwnerExpiryModal(true);
          loadingProgress.done();
          return;
        }
      } else {
        setShowStaffExpiryModal(true);
        loadingProgress.done();
        return;
      }
    }

    // Immediately reflect active menu in sidebar
    setActiveModule(mod);
    const targetPath = getPathFromModule(mod);

    // Keep previous page visible while top loader crawls, then mount destination cleanly
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => {
      React.startTransition(() => {
        setDisplayedModule(mod);
      });
      if (typeof window !== "undefined" && window.location.pathname !== targetPath) {
        window.history.pushState({ module: mod }, "", targetPath);
      }
      loadingProgress.done();
    }, 180);
  };

  // Handle browser Back / Forward buttons instantly without full page reload or unmount
  useEffect(() => {
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      const resolved = getModuleFromPathname(currentPath, user?.role);
      loadingProgress.start();
      setActiveModule(resolved);
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      navTimerRef.current = setTimeout(() => {
        setDisplayedModule(resolved);
        loadingProgress.done();
      }, 200);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
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
    const subEnd = currentSub?.endDate ? new Date(currentSub.endDate) : null;
    const calcDaysExpired = subEnd && isExpired ? Math.max(0, Math.floor((Date.now() - subEnd.getTime()) / (1000 * 3600 * 24))) : 0;
    
    if (isExpired && calcDaysExpired > 90) {
      if (
        confirm(
          "Your subscription has been expired for over 90 days. Per our data retention policy, previous store records have been purged. Please register as a new pharmacy to continue using the platform. Would you like to proceed to the registration page?"
        )
      ) {
        window.location.href = "/register";
      }
      return;
    }

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

  useEffect(() => {
    if (!dataLoading && isExpired) {
      if (user?.role === "COMPANY_OWNER") {
        if (activeModule !== "subscription" && activeModule !== "subscription_plans" && activeModule !== "subscription_history") {
          setShowOwnerExpiryModal(true);
        }
      } else {
        setShowStaffExpiryModal(true);
      }
    }
  }, [dataLoading, isExpired, user?.role, activeModule]);

  if (authLoading || dataLoading || !isAuthenticated) {
    if (!isAuthenticated) return null;
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-brand-primary" />
        <span className="font-semibold text-sm">Opening Workspace...</span>
      </div>
    );
  }

  const effectiveTier = (tenantProfile?.tier || currentSub?.plan?.tier || "STARTER").toUpperCase();
  const endDate = currentSub?.endDate ? new Date(currentSub.endDate) : null;
  const paidDaysRemaining = endDate ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 3600 * 24)) : null;
  const isExpiringSoon = !isExpired && paidDaysRemaining !== null && paidDaysRemaining <= 5 && paidDaysRemaining >= 0;
  const daysExpired = endDate && isExpired ? Math.max(0, Math.floor((Date.now() - endDate.getTime()) / (1000 * 3600 * 24))) : 0;
  const isFreeGrace = isExpired && daysExpired <= 30;
  const isWithinRetentionGrace = isExpired && daysExpired > 30 && daysExpired <= 90;
  const isPastRetentionLimit = isExpired && daysExpired > 90;

  return (
    <div className="h-screen max-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Subscription Expired Warning Banner */}
      {isExpired && (
        <div className="shrink-0 bg-gradient-to-r from-red-600 via-amber-600 to-red-700 text-white px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-md z-50 text-xs font-semibold">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
            <span>
              <strong>Subscription Expired:</strong> Your pharmacy subscription has expired. Please renew or upgrade to restore full operations.
            </span>
          </div>

          {user?.role === "COMPANY_OWNER" ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowOwnerExpiryModal(true)}
                className="px-3.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold backdrop-blur-sm transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>Renew or Upgrade Plan</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <span className="text-[11px] text-amber-100 font-bold">
              Please contact your Pharmacy Owner to renew the subscription.
            </span>
          )}
        </div>
      )}

      {/* Paid Subscription Expiring Soon Warning Banner (5 days or less) */}
      {isExpiringSoon && (
        <div className="shrink-0 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-sm z-50 text-xs font-semibold">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
            <span>
              <strong>Subscription Expiring Soon:</strong> {paidDaysRemaining} day{paidDaysRemaining === 1 ? "" : "s"} remaining (Expires on {endDate?.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}). Renew now to maintain uninterrupted POS, sales, and branch operations.
            </span>
          </div>

          {user?.role === "COMPANY_OWNER" && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleNavigate("subscription")}
                className="px-3.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold backdrop-blur-sm transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>Renew / Upgrade Plan</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <DashboardHeader
        tenantName={tenantProfile?.name}
        tier={effectiveTier}
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
          const isPosActive = displayedModule === "pos" || displayedModule === "pos_sale";
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

      {/* 🚀 Pharmacy Owner Expiry Popup Modal with 3 Plans */}
      {showOwnerExpiryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="max-w-4xl w-full bg-white dark:bg-slate-900 rounded-3xl border-2 border-brand-primary shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowOwnerExpiryModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
                <Clock className="h-7 w-7 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                  Subscription Expired
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Subscription Expired!
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Your pharmacy <strong className="text-slate-800 dark:text-slate-200">{tenantProfile?.name || "Your Pharmacy"}</strong> subscription has expired. Select a plan below to renew or upgrade and restore counter sales and dashboard access.
                </p>
              </div>
            </div>

            {/* 90-Day Retention Notice Banner */}
            {isPastRetentionLimit && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-800 text-rose-900 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-sm text-rose-950 dark:text-rose-100 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>Subscription Expired Over 90 Days ({daysExpired} days)</span>
                  </div>
                  <p className="text-xs text-rose-800 dark:text-rose-300">
                    Under our data retention policy, store data is held for up to 90 days following expiration. Because 90 days have elapsed, historical data has been permanently deleted. To use the software again, please register a new pharmacy account (one-time ৳5,000 Software License Fee + subscription plan).
                  </p>
                </div>
                <a
                  href="/register"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition shrink-0 text-center"
                >
                  Register New Pharmacy &rarr;
                </a>
              </div>
            )}

            {isWithinRetentionGrace && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-700 text-amber-950 dark:text-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-sm text-amber-950 dark:text-amber-100 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>Data Retention Period Active (Expired {daysExpired} days ago)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                      {Math.max(0, 90 - daysExpired)} days remaining
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    Your store records (medicines, inventory, customers, and sales) are securely kept on our cloud servers. A ৳2,000 cloud maintenance and data retention fee applies to restore your records upon renewal.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300 block">Data Retention Fee</span>
                  <span className="text-base font-black font-mono text-amber-900 dark:text-amber-200">+৳2,000</span>
                </div>
              </div>
            )}

            {isFreeGrace && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-sm text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>Standard Renewal Grace Period (Expired {daysExpired} days ago)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">
                      {Math.max(0, 30 - daysExpired)} days left for ৳0 extra fee
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">
                    You are within the 30-day renewal grace period. Renew now at the standard plan price with ৳0 extra fee.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300 block">Extra Fee</span>
                  <span className="text-base font-black font-mono text-emerald-900 dark:text-emerald-200">৳0</span>
                </div>
              </div>
            )}

            {/* 3 Plans Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {availablePlans.map((plan: any) => {
                const currentRank = (CENTRAL_CLIENT_PLANS as any)[effectiveTier]?.planNumber || (effectiveTier === "GROWTH" ? 2 : effectiveTier === "ENTERPRISE" ? 3 : 1);
                const planRank = (CENTRAL_CLIENT_PLANS as any)[plan.tier]?.planNumber || (plan.tier === "GROWTH" ? 2 : plan.tier === "ENTERPRISE" ? 3 : 1);
                const isCurrent = plan.tier === currentSub?.plan?.tier || plan.tier === tenantProfile?.tier;
                const isHigher = planRank > currentRank;
                const isGrowth = plan.tier === "GROWTH";
                const basePlanPrice = Number(plan.price);
                const totalCost = isWithinRetentionGrace ? basePlanPrice + 2000 : basePlanPrice;

                return (
                  <div
                    key={plan.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 relative ${
                      isCurrent
                        ? "bg-amber-500/5 dark:bg-amber-950/20 border-amber-500 shadow-md ring-1 ring-amber-500/30"
                        : isGrowth
                        ? "bg-brand-primary/5 dark:bg-brand-primary/10 border-brand-primary shadow-md"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    {isCurrent ? (
                      <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-extrabold uppercase shadow-xs">
                        Current Plan
                      </span>
                    ) : isGrowth ? (
                      <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-brand-primary text-white text-[10px] font-extrabold uppercase shadow-xs">
                        Recommended
                      </span>
                    ) : null}

                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-400 uppercase">{plan.tier} Tier</div>
                      <div className="text-base font-black text-slate-900 dark:text-white">{plan.name}</div>
                      <div className="text-2xl font-black text-brand-primary">
                        ৳{basePlanPrice.toLocaleString()}
                        <span className="text-xs text-slate-400 font-normal ml-1">/ month</span>
                      </div>
                      {isWithinRetentionGrace && (
                        <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                          + ৳2,000 Data Retention Fee (Total ৳{totalCost.toLocaleString()})
                        </div>
                      )}
                      {isFreeGrace && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          ৳0 Extra Fee (Regular Plan Price)
                        </div>
                      )}

                      <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <li className="flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-brand-primary shrink-0" />
                          <span>{plan.maxBranches >= 999 ? "Unlimited" : `${plan.maxBranches}`} Branches</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span>
                            {plan.tier === "STARTER"
                              ? "1 Staff / Branch (2 Total)"
                              : plan.tier === "GROWTH"
                              ? "3 Staff / Branch (9 Total)"
                              : "Unlimited Staff"}
                          </span>
                        </li>
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (isPastRetentionLimit) {
                          window.location.href = "/register";
                          return;
                        }
                        handleInitiateUpgrade(plan.id);
                      }}
                      disabled={initiatingPay}
                      className={`w-full py-3 px-3 rounded-xl font-bold text-xs sm:text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                        isPastRetentionLimit
                          ? "bg-rose-600 hover:bg-rose-700 text-white"
                          : isCurrent
                          ? "bg-amber-600 hover:bg-amber-500 text-white"
                          : isHigher
                          ? "bg-brand-primary hover:opacity-90 text-white"
                          : "bg-slate-800 hover:bg-slate-700 text-white"
                      }`}
                    >
                      {initiatingPay ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isPastRetentionLimit ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : isCurrent ? (
                        <RefreshCw className="h-4 w-4" />
                      ) : isHigher ? (
                        <Sparkles className="h-4 w-4" />
                      ) : (
                        <ArrowRight className="h-4 w-4" />
                      )}
                      <span>
                        {isPastRetentionLimit
                          ? "Expired >90 Days (Register New)"
                          : isCurrent
                          ? `Renew Plan (৳${totalCost.toLocaleString()})`
                          : isHigher
                          ? `Upgrade Plan (৳${totalCost.toLocaleString()})`
                          : `Switch Plan (৳${totalCost.toLocaleString()})`}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer Quick Links */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Your dashboard will unlock immediately upon successful SSLCOMMERZ checkout.</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowOwnerExpiryModal(false);
                    handleNavigate("subscription_history");
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <History className="h-3.5 w-3.5 text-brand-primary" />
                  <span>View Payment History</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowOwnerExpiryModal(false);
                    handleNavigate("subscription_plans");
                  }}
                  className="px-3.5 py-2 rounded-xl bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>View All Plans</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔒 Branch Staff Expiry Popup Modal (For Cashiers, Managers, Executives) */}
      {showStaffExpiryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-amber-500/30 shadow-2xl p-6 sm:p-8 text-center space-y-6 relative">
            <button
              type="button"
              onClick={() => setShowStaffExpiryModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="h-16 w-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-500 mx-auto flex items-center justify-center shadow-lg">
              <Clock className="h-8 w-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Subscription Expired
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Subscription Expired
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Your pharmacy <strong>{tenantProfile?.name || "your pharmacy"}</strong> subscription billing period has expired.
              </p>
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-800 dark:text-amber-300">
                Please contact your Pharmacy Owner to renew the subscription so system access can be restored.
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition cursor-pointer shadow-md"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );

  function renderModuleContent() {
    const isOwner = user?.role === "COMPANY_OWNER" || user?.role === "SUPER_ADMIN";
    const isBranchManager = user?.role === "BRANCH_MANAGER" || user?.pharmacyRoleName?.toLowerCase().includes("branch manager");

    // Subscription Expired Restriction View
    if (isExpired) {
      if (user?.role === "COMPANY_OWNER") {
        if (displayedModule === "subscription" || displayedModule === "subscription_plans") {
          return <SubscriptionModule onNavigate={handleNavigate} />;
        }
        if (displayedModule === "subscription_history") {
          return <SubscriptionHistoryView onNavigate={handleNavigate} />;
        }
        return (
          <div className="p-8 sm:p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border-2 border-amber-500/40 shadow-xl max-w-2xl mx-auto my-12 space-y-6">
            <div className="h-20 w-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-500 mx-auto flex items-center justify-center shadow-lg">
              <Clock className="h-10 w-10 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Subscription Expired
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                আপনার সাবস্ক্রিপশনের মেয়াদ শেষ হয়ে গেছে!
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                আপনার ফার্মেসি <strong>{tenantProfile?.name || "Your Pharmacy"}</strong>-এর সাবস্ক্রিপশনের মেয়াদ শেষ হয়ে গেছে। সেলস, ইনভেন্টরি ও পিওএস কার্যক্রম পরিচালনা করতে অনুগ্রহ করে প্ল্যান রিনিউ অথবা আপগ্রেড করুন।
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowOwnerExpiryModal(true)}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-brand-primary hover:opacity-90 text-white font-bold text-sm shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>রিনিউ অথবা আপগ্রেড করুন</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavigate("subscription_history")}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <History className="h-4 w-4 text-brand-primary" />
                <span>সাবস্ক্রিপশন হিস্ট্রি দেখুন</span>
              </button>
            </div>
          </div>
        );
      } else {
        return (
          <div className="p-8 sm:p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-amber-500/30 shadow-xl max-w-lg mx-auto my-12 space-y-6">
            <div className="h-16 w-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-500 mx-auto flex items-center justify-center shadow-lg">
              <Clock className="h-8 w-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Subscription Expired
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                সাবস্ক্রিপশনের মেয়াদ শেষ হয়ে গেছে
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                আপনার ফার্মেসির সাবস্ক্রিপশন বিলিং মেয়াদ শেষ হয়ে গেছে। সিস্টেমের সমস্ত কার্যক্রম সাময়িকভাবে স্থগিত রয়েছে।
              </p>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                অনুগ্রহ করে আপনার ফার্মেসি ওনার (Pharmacy Owner) এর সাথে যোগাযোগ করুন যাতে তিনি সাবস্ক্রিপশন প্ল্যান রিনিউ করেন।
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition cursor-pointer"
            >
              সাইন আউট করুন
            </button>
          </div>
        );
      }
    }

    switch (displayedModule) {
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

      case "pos_due_sales":
        if (!isOwner && !hasPermission("pos.history")) {
          return <TenantAccessRestricted moduleName="Due Sales & Collections" requiredPerm="pos.history" />;
        }
        return <DueSalesView onNavigate={handleNavigate} />;

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
          return <TenantAccessRestricted moduleName="Category List" requiredPerm="category.subcategories" />;
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

      case "loc_create_custom":
        if (!isOwner && !hasPermission("location.create_custom") && !hasPermission("location.create_rack")) {
          return <TenantAccessRestricted moduleName="Create Location" requiredPerm="location.create_custom" />;
        }
        return (
          <CreateCustomLocationView
            selectedBranchId={selectedBranchId}
            onNavigate={handleNavigate}
          />
        );

      case "loc_custom_list":
        if (!isOwner && !hasPermission("location.custom_list") && !hasPermission("location.rack_list")) {
          return <TenantAccessRestricted moduleName="Location List" requiredPerm="location.custom_list" />;
        }
        return (
          <CustomLocationListView
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
        return <BranchModule onNavigate={handleNavigate} />;

      case "branch_create":
        if (!isOwner && !hasPermission("branches.manage")) {
          return <TenantAccessRestricted moduleName="Create Branch" requiredPerm="branches.manage" />;
        }
        return <BranchCreateView onNavigate={handleNavigate} />;

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
      case "subscription_plans":
        if (!isOwner) {
          return <TenantAccessRestricted moduleName="Subscription Plan" requiredPerm="Owner Only" />;
        }
        return <SubscriptionModule onNavigate={handleNavigate} />;

      case "subscription_history":
        if (!isOwner) {
          return <TenantAccessRestricted moduleName="Payment History" requiredPerm="Owner Only" />;
        }
        return <SubscriptionHistoryView onNavigate={handleNavigate} />;

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

