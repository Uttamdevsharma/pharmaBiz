"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api";
import { CENTRAL_CLIENT_PLANS, calculateRemainingTrialDays } from "@/lib/planLimits";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar, OwnerModule } from "@/components/dashboard/DashboardSidebar";
import { OverviewModule } from "@/components/dashboard/OverviewModule";
import { ProfileModule } from "@/components/dashboard/ProfileModule";
import { BranchModule } from "@/components/dashboard/BranchModule";
import { StaffModule } from "@/components/dashboard/StaffModule";
import { CreateStaffTab } from "@/components/dashboard/CreateStaffTab";
import { RolesModule } from "@/components/dashboard/RolesModule";
import { PosModule } from "@/components/dashboard/PosModule";
import { ReportsModule } from "@/components/dashboard/ReportsModule";
import { SubscriptionModule } from "@/components/dashboard/SubscriptionModule";
import { SettingsModule } from "@/components/dashboard/SettingsModule";

// Dedicated Domain Subpage Views
import { AddProductView } from "@/components/dashboard/AddProductView";
import { ProductListView } from "@/components/dashboard/ProductListView";
import { VariantsView } from "@/components/dashboard/VariantsView";
import { ExpiredProductsView } from "@/components/dashboard/ExpiredProductsView";
import { AddStockView } from "@/components/dashboard/AddStockView";
import { StockListView } from "@/components/dashboard/StockListView";
import { StockHistoryView } from "@/components/dashboard/StockHistoryView";
import { TransferStockView } from "@/components/dashboard/TransferStockView";
import { TransferHistoryView } from "@/components/dashboard/TransferHistoryView";
import { StockReceiveView } from "@/components/dashboard/StockReceiveView";
import { DamagedProductsView } from "@/components/dashboard/DamagedProductsView";
import { SuppliersView } from "@/components/dashboard/SuppliersView";
import { PurchaseHistoryView } from "@/components/dashboard/PurchaseHistoryView";
import { PaymentsDueView } from "@/components/dashboard/PaymentsDueView";
import { PaymentMethodSalesView } from "@/components/dashboard/PaymentMethodSalesView";
import { ProductWiseSalesView } from "@/components/dashboard/ProductWiseSalesView";
import { AccountsOverviewView } from "@/components/dashboard/AccountsOverviewView";
import { FinancialAccountsView } from "@/components/dashboard/FinancialAccountsView";
import { FundTransferView } from "@/components/dashboard/FundTransferView";
import { TransactionHistoryView } from "@/components/dashboard/TransactionHistoryView";
import { SalesHistoryView } from "@/components/dashboard/SalesHistoryView";
import { VatSettingsView } from "@/components/dashboard/VatSettingsView";
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

function getDefaultModuleForRole(role?: string): OwnerModule {
  switch (role) {
    case "ACCOUNTS":
      return "acc_overview";
    case "CASHIER":
      return "pos";
    case "INVENTORY_EXECUTIVE":
      return "stock_stock_list";
    case "BRANCH_MANAGER":
    case "MANAGER":
    case "COMPANY_OWNER":
    case "REGIONAL_ADMIN":
    case "AUDITOR":
    default:
      return "overview";
  }
}

export default function RoleBasedDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isSuperAdmin, isPlatformStaff, hasPermission, loading: authLoading } = useAuth();

  const [activeModule, setActiveModule] = useState<OwnerModule>(getDefaultModuleForRole(user?.role));
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [tenantProfile, setTenantProfile] = useState<any>(null);
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || "");
  const [dataLoading, setDataLoading] = useState(true);
  const [initiatingPay, setInitiatingPay] = useState(false);
  const [upgradePlanId, setUpgradePlanId] = useState<string>("");
  const [upgradeBilling, setUpgradeBilling] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);

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

    if (user?.role) {
      setActiveModule(getDefaultModuleForRole(user.role));
    }

    async function loadTenantData() {
      try {
        setDataLoading(true);
        const [profileRes, subRes, branchRes, plansRes] = await Promise.all([
          fetchApi("/tenant/profile"),
          fetchApi("/subscriptions/current"),
          fetchApi("/branches"),
          fetchApi("/subscriptions/plans"),
        ]);

        if (profileRes.success) setTenantProfile(profileRes.data);
        if (subRes.success) setCurrentSub(subRes.data?.subscription || subRes.data);
        if (plansRes.success && plansRes.data) {
          // Filter to paid plans for upgrade options
          const paidOnly = plansRes.data.filter((p: any) => p.tier !== "TRIAL");
          setAvailablePlans(paidOnly);
          if (paidOnly.length > 0 && !upgradePlanId) {
            setUpgradePlanId(paidOnly[0].id);
          }
        }
        if (branchRes.success && branchRes.data && branchRes.data.length > 0) {
          setBranches(branchRes.data);
          if (user?.branchId) {
            setSelectedBranchId(user.branchId);
          } else {
            setSelectedBranchId(branchRes.data[0].id);
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

  // Branch Selector visibility
  const isBranchSwitcherAllowed = user?.role === "COMPANY_OWNER" || user?.role === "REGIONAL_ADMIN";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
      {/* Free Trial Active Banner */}
      {isTrial && !isTrialExpired && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-sm z-50 text-xs font-semibold">
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
        branches={isBranchSwitcherAllowed ? branches : []}
        selectedBranchId={selectedBranchId}
        onBranchChange={isBranchSwitcherAllowed ? setSelectedBranchId : undefined}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Role-Aware Sidebar */}
        <DashboardSidebar
          activeModule={activeModule}
          userRole={user?.role}
          onModuleChange={(mod) => {
            if (mod !== "inv_add_product") {
              setEditingProduct(null);
            }
            setActiveModule(mod);
          }}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 2xl:p-10 overflow-y-auto w-full min-w-0">
          {renderModuleContent()}
        </main>
      </div>
    </div>
  );

  function renderModuleContent() {
    const isOwner = user?.role === "COMPANY_OWNER" || user?.role === "SUPER_ADMIN";

    switch (activeModule) {
      // 📊 Overview & Dashboard
      case "overview":
        if (!isOwner && !hasPermission("dashboard.view")) {
          return <TenantAccessRestricted moduleName="Dashboard" requiredPerm="dashboard.view" />;
        }
        return <OverviewModule onNavigate={setActiveModule} />;

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
        return <SalesHistoryView onNavigate={setActiveModule} />;

      case "pos_vat":
        if (!isOwner && !hasPermission("pos.vat")) {
          return <TenantAccessRestricted moduleName="VAT Settings" requiredPerm="pos.vat" />;
        }
        return <VatSettingsView onNavigate={setActiveModule} />;

      // 💳 Accounts & Finance Subpages
      case "acc_overview":
      case "accounts":
        if (!isOwner && !hasPermission("accounts.manage")) {
          return <TenantAccessRestricted moduleName="Accounts & Finance Overview" requiredPerm="accounts.manage" />;
        }
        return <AccountsOverviewView onNavigate={setActiveModule} />;

      case "acc_financial_accounts":
        if (!isOwner && !hasPermission("accounts.financial_accounts")) {
          return <TenantAccessRestricted moduleName="Financial Accounts" requiredPerm="accounts.financial_accounts" />;
        }
        return <FinancialAccountsView onNavigate={setActiveModule} />;

      case "acc_fund_transfer":
        if (!isOwner && !hasPermission("accounts.fund_transfer")) {
          return <TenantAccessRestricted moduleName="Fund Transfer" requiredPerm="accounts.fund_transfer" />;
        }
        return <FundTransferView onNavigate={setActiveModule} />;

      case "acc_payment_sales":
        if (!isOwner && !hasPermission("accounts.payment_sales")) {
          return <TenantAccessRestricted moduleName="Payment Method Sales" requiredPerm="accounts.payment_sales" />;
        }
        return <PaymentMethodSalesView onNavigate={setActiveModule} />;

      case "acc_product_sales":
        if (!isOwner && !hasPermission("accounts.product_sales")) {
          return <TenantAccessRestricted moduleName="Product-Wise Sales" requiredPerm="accounts.product_sales" />;
        }
        return <ProductWiseSalesView onNavigate={setActiveModule} />;

      case "acc_transaction_history":
        if (!isOwner && !hasPermission("accounts.transaction_history")) {
          return <TenantAccessRestricted moduleName="Transaction History" requiredPerm="accounts.transaction_history" />;
        }
        return <TransactionHistoryView onNavigate={setActiveModule} />;

      // 📦 Inventory Subpages
      case "inv_add_product":
        if (!isOwner && !hasPermission("inventory.manage")) {
          return <TenantAccessRestricted moduleName="Add Product" requiredPerm="inventory.manage" />;
        }
        return (
          <AddProductView
            editingProduct={editingProduct}
            onNavigate={setActiveModule}
            onClearEditing={() => setEditingProduct(null)}
          />
        );

      case "inv_product_list":
        if (!isOwner && !hasPermission("inventory.manage")) {
          return <TenantAccessRestricted moduleName="Product List" requiredPerm="inventory.manage" />;
        }
        return (
          <ProductListView
            onNavigate={setActiveModule}
            onEditProduct={(p) => {
              setEditingProduct(p);
              setActiveModule("inv_add_product");
            }}
          />
        );

      case "inv_variants":
        if (!isOwner && !hasPermission("inventory.manage")) {
          return <TenantAccessRestricted moduleName="Categories & Variants" requiredPerm="inventory.manage" />;
        }
        return <VariantsView />;

      case "inv_expired_products":
        if (!isOwner && !hasPermission("inventory.manage")) {
          return <TenantAccessRestricted moduleName="Expired Products" requiredPerm="inventory.manage" />;
        }
        return <ExpiredProductsView />;

      // 🔄 Stock Management Subpages
      case "stock_add_stock":
        if (!isOwner && !hasPermission("stock.manage")) {
          return <TenantAccessRestricted moduleName="Add Stock" requiredPerm="stock.manage" />;
        }
        return <AddStockView onNavigate={setActiveModule} />;

      case "stock_stock_list":
        if (!isOwner && !hasPermission("stock.manage")) {
          return <TenantAccessRestricted moduleName="Stock List" requiredPerm="stock.manage" />;
        }
        return <StockListView onNavigate={setActiveModule} />;

      case "stock_stock_history":
        if (!isOwner && !hasPermission("stock.manage")) {
          return <TenantAccessRestricted moduleName="Stock History" requiredPerm="stock.manage" />;
        }
        return <StockHistoryView />;

      case "stock_transfer_stock":
        if (!isOwner && !hasPermission("stock.manage")) {
          return <TenantAccessRestricted moduleName="Transfer Stock" requiredPerm="stock.manage" />;
        }
        return <TransferStockView onNavigate={setActiveModule} />;

      case "stock_transfer_history":
        if (!isOwner && !hasPermission("stock.manage")) {
          return <TenantAccessRestricted moduleName="Transfer History" requiredPerm="stock.manage" />;
        }
        return <TransferHistoryView onNavigate={setActiveModule} />;

      case "stock_stock_receive":
        if (!isOwner && !hasPermission("stock.manage")) {
          return <TenantAccessRestricted moduleName="Stock Receive" requiredPerm="stock.manage" />;
        }
        return <StockReceiveView onNavigate={setActiveModule} />;

      case "stock_damaged_products":
        if (!isOwner && !hasPermission("stock.manage")) {
          return <TenantAccessRestricted moduleName="Damaged Products" requiredPerm="stock.manage" />;
        }
        return <DamagedProductsView onNavigate={setActiveModule} />;

      // 🏭 Supplier Management Subpages
      case "sup_suppliers":
        if (!isOwner && !hasPermission("suppliers.manage")) {
          return <TenantAccessRestricted moduleName="Suppliers" requiredPerm="suppliers.manage" />;
        }
        return <SuppliersView onNavigate={setActiveModule} />;

      case "sup_purchase_history":
        if (!isOwner && !hasPermission("suppliers.manage")) {
          return <TenantAccessRestricted moduleName="Purchase History" requiredPerm="suppliers.manage" />;
        }
        return <PurchaseHistoryView onNavigate={setActiveModule} />;

      case "sup_payments_due":
        if (!isOwner && !hasPermission("suppliers.manage") && !hasPermission("accounts.supplier_due")) {
          return <TenantAccessRestricted moduleName="Payments / Due" requiredPerm="suppliers.manage" />;
        }
        return <PaymentsDueView onNavigate={setActiveModule} />;

      // 👥 Staff & Roles Administration
      case "branches":
        if (!isOwner && !hasPermission("branches.manage")) {
          return <TenantAccessRestricted moduleName="Branch Network" requiredPerm="branches.manage" />;
        }
        return <BranchModule />;

      case "staff":
        if (!isOwner && !hasPermission("staff.manage")) {
          return <TenantAccessRestricted moduleName="Staff List" requiredPerm="staff.manage" />;
        }
        return <StaffModule onNavigate={setActiveModule} />;

      case "staff_create":
        if (!isOwner && !hasPermission("staff.manage")) {
          return <TenantAccessRestricted moduleName="Create Staff" requiredPerm="staff.manage" />;
        }
        return <CreateStaffTab onNavigate={setActiveModule} />;

      case "roles":
        if (!isOwner && !hasPermission("roles.manage")) {
          return <TenantAccessRestricted moduleName="Roles & Permissions" requiredPerm="roles.manage" />;
        }
        return <RolesModule />;

      case "reports":
        if (!isOwner && !hasPermission("accounts.reports")) {
          return <TenantAccessRestricted moduleName="Sales Reports" requiredPerm="accounts.reports" />;
        }
        return <ReportsModule />;

      // ⚙️ Pharmacy Owner Settings
      case "profile":
        if (!isOwner) {
          return <TenantAccessRestricted moduleName="Pharmacy Profile" requiredPerm="Owner Only" />;
        }
        return <ProfileModule />;

      case "subscription":
        if (!isOwner) {
          return <TenantAccessRestricted moduleName="Subscription Plan" requiredPerm="Owner Only" />;
        }
        return <SubscriptionModule />;

      case "settings":
        if (!isOwner) {
          return <TenantAccessRestricted moduleName="Settings" requiredPerm="Owner Only" />;
        }
        return <SettingsModule />;

      default:
        return <OverviewModule onNavigate={setActiveModule} />;
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

