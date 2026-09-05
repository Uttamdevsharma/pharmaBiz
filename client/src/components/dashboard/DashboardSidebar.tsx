"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Building,
  Store,
  Users,
  UserPlus,
  Shield,
  KeyRound,
  Package,
  ShoppingCart,
  BarChart3,
  CreditCard,
  Settings,
  Truck,
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  List,
  FolderTree,
  History,
  Receipt,
  Inbox,
  FileSpreadsheet,
  Factory,
  RefreshCw,
  PackagePlus,
  PackageCheck,
  CalendarX2,
  Wallet,
  Percent,
  AlertTriangle,
} from "lucide-react";

export type OwnerModule =
  | "overview"
  | "pos"
  | "pos_sale"
  | "pos_history"
  | "pos_vat"
  | "accounts"
  | "acc_overview"
  | "acc_financial_accounts"
  | "acc_fund_transfer"
  | "acc_payment_sales"
  | "acc_product_sales"
  | "acc_transaction_history"
  | "inv_add_product"
  | "inv_product_list"
  | "inv_variants"
  | "inv_expired_products"
  | "stock_add_stock"
  | "stock_stock_list"
  | "stock_stock_history"
  | "stock_transfer_stock"
  | "stock_transfer_history"
  | "stock_stock_receive"
  | "stock_inspection"
  | "stock_damaged_products"
  | "sup_suppliers"
  | "sup_purchase_history"
  | "sup_payments_due"
  | "branches"
  | "staff"
  | "staff_create"
  | "roles"
  | "reports"
  | "profile"
  | "subscription"
  | "settings";

interface SubMenuItem {
  id: OwnerModule;
  label: string;
  icon: React.ElementType;
  visible?: boolean;
}

interface ParentMenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  children: SubMenuItem[];
  visible: boolean;
}

interface DashboardSidebarProps {
  activeModule: OwnerModule;
  userRole?: string;
  onModuleChange: (module: OwnerModule) => void;
}

export function DashboardSidebar({
  activeModule,
  userRole = "COMPANY_OWNER",
  onModuleChange,
}: DashboardSidebarProps) {
  const { user, hasPermission } = useAuth();

  const isOwner = user?.role === "COMPANY_OWNER" || userRole === "COMPANY_OWNER" || user?.role === "SUPER_ADMIN";

  const isSalesPosActive =
    activeModule === "pos" ||
    activeModule === "pos_sale" ||
    activeModule === "pos_history" ||
    activeModule === "pos_vat";

  const isAccountsActive =
    activeModule === "acc_overview" ||
    activeModule === "accounts" ||
    activeModule.startsWith("acc_") ||
    activeModule === "reports" ||
    activeModule === "sup_payments_due";

  const isStaffActive =
    activeModule === "staff" ||
    activeModule === "staff_create" ||
    activeModule === "roles";

  // Collapsible state for parent groups
  const [openParents, setOpenParents] = useState<Record<string, boolean>>({
    sales_pos: isSalesPosActive,
    inventory: activeModule.startsWith("inv_"),
    stock: activeModule.startsWith("stock_"),
    supplier: activeModule.startsWith("sup_") && activeModule !== "sup_payments_due",
    accounts: isAccountsActive,
    staff_mgmt: isStaffActive,
  });

  // Auto-expand parent when activeModule changes
  useEffect(() => {
    if (
      activeModule === "pos" ||
      activeModule === "pos_sale" ||
      activeModule === "pos_history" ||
      activeModule === "pos_vat"
    ) {
      setOpenParents((prev) => ({ ...prev, sales_pos: true }));
    } else if (
      activeModule === "acc_overview" ||
      activeModule === "accounts" ||
      activeModule.startsWith("acc_") ||
      activeModule === "reports" ||
      activeModule === "sup_payments_due"
    ) {
      setOpenParents((prev) => ({ ...prev, accounts: true }));
    } else if (activeModule.startsWith("inv_")) {
      setOpenParents((prev) => ({ ...prev, inventory: true }));
    } else if (activeModule.startsWith("stock_")) {
      setOpenParents((prev) => ({ ...prev, stock: true }));
    } else if (activeModule.startsWith("sup_")) {
      setOpenParents((prev) => ({ ...prev, supplier: true }));
    } else if (
      activeModule === "staff" ||
      activeModule === "staff_create" ||
      activeModule === "roles"
    ) {
      setOpenParents((prev) => ({ ...prev, staff_mgmt: true }));
    }
  }, [activeModule]);

  const toggleParent = (parentId: string) => {
    setOpenParents((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }));
  };

  // 1. Sales & POS Section
  const salesChildren: SubMenuItem[] = [
    {
      id: "pos" as OwnerModule,
      label: "Sales / POS",
      icon: ShoppingCart,
      visible: isOwner || hasPermission("pos.manage"),
    },
    {
      id: "pos_history" as OwnerModule,
      label: "Sales History",
      icon: History,
      visible: isOwner || hasPermission("pos.history"),
    },
    {
      id: "pos_vat" as OwnerModule,
      label: "VAT Settings",
      icon: Percent,
      visible: isOwner || hasPermission("pos.vat"),
    },
  ].filter((item) => item.visible);

  // 2. Inventory Section
  const hasInventoryPerm = isOwner || hasPermission("inventory.manage");
  const inventoryChildren: SubMenuItem[] = [
    {
      id: "inv_add_product" as OwnerModule,
      label: "Add Product",
      icon: PlusCircle,
      visible: hasInventoryPerm,
    },
    {
      id: "inv_product_list" as OwnerModule,
      label: "Product List",
      icon: List,
      visible: hasInventoryPerm,
    },
    {
      id: "inv_variants" as OwnerModule,
      label: "Categories",
      icon: FolderTree,
      visible: hasInventoryPerm,
    },
    {
      id: "inv_expired_products" as OwnerModule,
      label: "Expired Products",
      icon: CalendarX2,
      visible: hasInventoryPerm,
    },
  ].filter((item) => item.visible);

  // 3. Stock Management Section
  const hasStockPerm = isOwner || hasPermission("stock.manage");
  const stockChildren: SubMenuItem[] = [
    {
      id: "stock_add_stock" as OwnerModule,
      label: "Add Stock",
      icon: PackagePlus,
      visible: hasStockPerm,
    },
    {
      id: "stock_stock_list" as OwnerModule,
      label: "Stock List",
      icon: PackageCheck,
      visible: hasStockPerm,
    },
    {
      id: "stock_stock_history" as OwnerModule,
      label: "Stock History",
      icon: History,
      visible: hasStockPerm,
    },
    {
      id: "stock_transfer_stock" as OwnerModule,
      label: "Transfer Stock",
      icon: ArrowLeftRight,
      visible: hasStockPerm,
    },
    {
      id: "stock_transfer_history" as OwnerModule,
      label: "Transfer History",
      icon: FileSpreadsheet,
      visible: hasStockPerm,
    },
    {
      id: "stock_stock_receive" as OwnerModule,
      label: "Stock Receive",
      icon: Inbox,
      visible: hasStockPerm,
    },
    {
      id: "stock_damaged_products" as OwnerModule,
      label: "Damaged Products",
      icon: AlertTriangle,
      visible: hasStockPerm,
    },
  ].filter((item) => item.visible);

  // 4. Supplier Management Section
  const hasSupplierPerm = isOwner || hasPermission("suppliers.manage");
  const supplierChildren: SubMenuItem[] = [
    {
      id: "sup_suppliers" as OwnerModule,
      label: "Suppliers",
      icon: Truck,
      visible: hasSupplierPerm,
    },
    {
      id: "sup_purchase_history" as OwnerModule,
      label: "Purchase History",
      icon: Receipt,
      visible: hasSupplierPerm,
    },
    {
      id: "sup_payments_due" as OwnerModule,
      label: "Payments / Due",
      icon: CreditCard,
      visible: hasSupplierPerm,
    },
  ].filter((item) => item.visible);

  // 5. Accounts & Finance Section
  const accountsChildren: SubMenuItem[] = [
    {
      id: "acc_overview" as OwnerModule,
      label: "Overview",
      icon: LayoutDashboard,
      visible: isOwner || hasPermission("accounts.manage"),
    },
    {
      id: "acc_financial_accounts" as OwnerModule,
      label: "Financial Accounts",
      icon: Wallet,
      visible: isOwner || hasPermission("accounts.financial_accounts"),
    },
    {
      id: "acc_fund_transfer" as OwnerModule,
      label: "Fund Transfer",
      icon: ArrowLeftRight,
      visible: isOwner || hasPermission("accounts.fund_transfer"),
    },
    {
      id: "acc_payment_sales" as OwnerModule,
      label: "Payment Method Sales",
      icon: CreditCard,
      visible: isOwner || hasPermission("accounts.payment_sales"),
    },
    {
      id: "acc_product_sales" as OwnerModule,
      label: "Product-Wise Sales",
      icon: Package,
      visible: isOwner || hasPermission("accounts.product_sales"),
    },
    {
      id: "reports" as OwnerModule,
      label: "Sales Reports",
      icon: BarChart3,
      visible: isOwner || hasPermission("accounts.reports"),
    },
    {
      id: "sup_payments_due" as OwnerModule,
      label: "Supplier Payments / Due",
      icon: Receipt,
      visible: isOwner || hasPermission("accounts.supplier_due"),
    },
    {
      id: "acc_transaction_history" as OwnerModule,
      label: "Transaction History",
      icon: History,
      visible: isOwner || hasPermission("accounts.transaction_history"),
    },
  ].filter((item) => item.visible);

  // 6. Staff Management Section (Staff List, Create Staff, Roles & Permissions)
  const hasStaffPerm = isOwner || hasPermission("staff.manage");
  const hasRolesPerm = isOwner || hasPermission("roles.manage");
  const staffChildren: SubMenuItem[] = [
    {
      id: "staff" as OwnerModule,
      label: "Staff List",
      icon: Users,
      visible: hasStaffPerm,
    },
    {
      id: "staff_create" as OwnerModule,
      label: "Create Staff",
      icon: UserPlus,
      visible: hasStaffPerm,
    },
    {
      id: "roles" as OwnerModule,
      label: "Roles & Permissions",
      icon: KeyRound,
      visible: hasRolesPerm,
    },
  ].filter((item) => item.visible);

  // Collapsible domain groups list
  const collapsibleSections: ParentMenuItem[] = [
    {
      id: "sales_pos",
      label: "Sales & POS",
      icon: ShoppingCart,
      visible: salesChildren.length > 0,
      children: salesChildren,
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: Package,
      visible: inventoryChildren.length > 0,
      children: inventoryChildren,
    },
    {
      id: "stock",
      label: "Stock Management",
      icon: RefreshCw,
      visible: stockChildren.length > 0,
      children: stockChildren,
    },
    {
      id: "supplier",
      label: "Supplier Management",
      icon: Factory,
      visible: supplierChildren.length > 0,
      children: supplierChildren,
    },
    {
      id: "accounts",
      label: "Accounts & Finance",
      icon: Wallet,
      visible: accountsChildren.length > 0,
      children: accountsChildren,
    },
    {
      id: "staff_mgmt",
      label: "Staff Management",
      icon: Users,
      visible: staffChildren.length > 0,
      children: staffChildren,
    },
  ];

  // Core Overview
  const coreItems = [
    {
      id: "overview" as OwnerModule,
      label: "Dashboard",
      icon: LayoutDashboard,
      visible: isOwner || hasPermission("dashboard.view"),
    },
  ];

  // Organization / Branch Network
  const orgItems = [
    {
      id: "branches" as OwnerModule,
      label: "Branch Network",
      icon: Store,
      visible: isOwner || hasPermission("branches.manage"),
    },
  ];

  // Pharmacy Owner Enterprise Settings
  const enterpriseItems = [
    {
      id: "profile" as OwnerModule,
      label: "Pharmacy Profile",
      icon: Building,
      visible: isOwner,
    },
    {
      id: "subscription" as OwnerModule,
      label: "Subscription Plan",
      icon: CreditCard,
      visible: isOwner,
    },
    {
      id: "settings" as OwnerModule,
      label: "Settings",
      icon: Settings,
      visible: isOwner,
    },
  ];

  const visibleCore = coreItems.filter((item) => item.visible);
  const visibleOrg = orgItems.filter((item) => item.visible);
  const visibleEnterprise = enterpriseItems.filter((item) => item.visible);
  const visibleCollapsible = collapsibleSections.filter((sec) => sec.visible);

  return (
    <aside className="w-64 xl:w-72 2xl:w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] 2xl:min-h-[calc(100vh-5rem)] transition-all duration-200">
      <div className="p-3.5 xl:p-4 2xl:p-5 space-y-4 xl:space-y-5 2xl:space-y-6 flex-1 overflow-y-auto">
        {/* Core Overview & Dashboard */}
        {visibleCore.length > 0 && (
          <div className="space-y-1 xl:space-y-1.5">
            <div className="px-3 xl:px-3.5 2xl:px-4 text-[10px] xl:text-[11px] 2xl:text-xs font-black uppercase tracking-wider text-slate-400">
              Overview
            </div>
            {visibleCore.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onModuleChange(item.id)}
                  className={`w-full flex items-center gap-2.5 xl:gap-3 px-3 py-2 xl:px-3.5 xl:py-2.5 2xl:px-4 2xl:py-3 rounded-xl xl:rounded-2xl text-xs xl:text-sm 2xl:text-base font-bold transition-all ${
                    isActive
                      ? "bg-brand-primary text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 xl:h-4.5 xl:w-4.5 2xl:h-5 2xl:w-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Collapsible Domain Sections */}
        {visibleCollapsible.length > 0 && (
          <div className="space-y-2 xl:space-y-2.5">
            <div className="px-3 xl:px-3.5 2xl:px-4 text-[10px] xl:text-[11px] 2xl:text-xs font-black uppercase tracking-wider text-slate-400">
              Pharmacy Operations
            </div>

            {visibleCollapsible.map((section) => {
              const ParentIcon = section.icon;
              const isParentActive = section.children.some(
                (child) => activeModule === child.id
              );
              const isOpen = openParents[section.id] ?? isParentActive;

              return (
                <div key={section.id} className="rounded-xl xl:rounded-2xl overflow-hidden">
                  <button
                    onClick={() => toggleParent(section.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 xl:px-3.5 xl:py-2.5 2xl:px-4 2xl:py-3 rounded-xl xl:rounded-2xl text-xs xl:text-sm 2xl:text-base font-black transition-all ${
                      isParentActive && !isOpen
                        ? "bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/20"
                        : isParentActive && isOpen
                        ? "bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-white"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 xl:gap-3">
                      <ParentIcon
                        className={`h-4 w-4 xl:h-4.5 xl:w-4.5 2xl:h-5 2xl:w-5 shrink-0 ${
                          isParentActive ? "text-brand-primary" : "text-slate-500 dark:text-slate-400"
                        }`}
                      />
                      <span className="truncate">{section.label}</span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="h-3.5 w-3.5 xl:h-4 xl:w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 xl:h-4 xl:w-4 text-slate-400" />
                    )}
                  </button>

                  {/* Sub-items */}
                  {isOpen && (
                    <div className="pl-3 xl:pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-slate-100 dark:border-slate-800 ml-3.5 xl:ml-4 mt-1">
                      {section.children.map((child) => {
                        const ChildIcon = child.icon;
                        const isChildActive = activeModule === child.id;
                        return (
                          <button
                            key={child.id}
                            onClick={() => onModuleChange(child.id)}
                            className={`w-full flex items-center gap-2 xl:gap-2.5 px-2.5 py-1.5 xl:px-3 xl:py-2 2xl:px-3.5 2xl:py-2.5 rounded-lg xl:rounded-xl text-[11px] xl:text-xs 2xl:text-sm font-bold transition-all ${
                              isChildActive
                                ? "bg-brand-primary text-white shadow-xs"
                                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            <ChildIcon className="h-3.5 w-3.5 xl:h-4 xl:w-4 shrink-0" />
                            <span className="truncate">{child.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Administration / Branches */}
        {visibleOrg.length > 0 && (
          <div className="space-y-1 xl:space-y-1.5">
            <div className="px-3 xl:px-3.5 2xl:px-4 text-[10px] xl:text-[11px] 2xl:text-xs font-black uppercase tracking-wider text-slate-400">
              Branch Network
            </div>
            {visibleOrg.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onModuleChange(item.id)}
                  className={`w-full flex items-center gap-2.5 xl:gap-3 px-3 py-2 xl:px-3.5 xl:py-2.5 2xl:px-4 2xl:py-3 rounded-xl xl:rounded-2xl text-xs xl:text-sm 2xl:text-base font-bold transition-all ${
                    isActive
                      ? "bg-brand-primary text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 xl:h-4.5 xl:w-4.5 2xl:h-5 2xl:w-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Pharmacy Owner Settings & Analytics */}
        {visibleEnterprise.length > 0 && (
          <div className="space-y-1 xl:space-y-1.5">
            <div className="px-3 xl:px-3.5 2xl:px-4 text-[10px] xl:text-[11px] 2xl:text-xs font-black uppercase tracking-wider text-slate-400">
              System Settings
            </div>
            {visibleEnterprise.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onModuleChange(item.id)}
                  className={`w-full flex items-center gap-2.5 xl:gap-3 px-3 py-2 xl:px-3.5 xl:py-2.5 2xl:px-4 2xl:py-3 rounded-xl xl:rounded-2xl text-xs xl:text-sm 2xl:text-base font-bold transition-all ${
                    isActive
                      ? "bg-brand-primary text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 xl:h-4.5 xl:w-4.5 2xl:h-5 2xl:w-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
