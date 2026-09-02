"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Building,
  Store,
  Users,
  Shield,
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
  | "sup_suppliers"
  | "sup_purchase_history"
  | "sup_payments_due"
  | "branches"
  | "staff"
  | "roles"
  | "reports"
  | "profile"
  | "subscription"
  | "settings";

interface SubMenuItem {
  id: OwnerModule;
  label: string;
  icon: React.ElementType;
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
  const isOwner = userRole === "COMPANY_OWNER";
  const isRegional = userRole === "REGIONAL_ADMIN";
  const isManager = userRole === "BRANCH_MANAGER" || userRole === "MANAGER";
  const isInventory = userRole === "INVENTORY_EXECUTIVE";
  const isCashier = userRole === "CASHIER";
  const isAccounts = userRole === "ACCOUNTS";
  const isAuditor = userRole === "AUDITOR";

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

  // Collapsible state for parent groups: "sales_pos", "inventory", "stock", "supplier", "accounts"
  const [openParents, setOpenParents] = useState<Record<string, boolean>>({
    sales_pos: isSalesPosActive,
    inventory: activeModule.startsWith("inv_"),
    stock: activeModule.startsWith("stock_"),
    supplier: activeModule.startsWith("sup_") && activeModule !== "sup_payments_due",
    accounts: isAccountsActive,
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
    }
  }, [activeModule]);

  const toggleParent = (parentId: string) => {
    setOpenParents((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }));
  };

  const collapsibleSections: ParentMenuItem[] = [
    {
      id: "sales_pos",
      label: "Sales & POS",
      icon: ShoppingCart,
      visible: isOwner || isRegional || isManager || isCashier || isAuditor,
      children: [
        {
          id: "pos",
          label: "Sales / POS",
          icon: ShoppingCart,
        },
        {
          id: "pos_history",
          label: "Sales History",
          icon: History,
        },
        ...(isCashier
          ? []
          : [
              {
                id: "pos_vat" as OwnerModule,
                label: "VAT Settings",
                icon: Percent,
              },
            ]),
      ],
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: Package,
      visible: isOwner || isRegional || isManager || isInventory || isAuditor,
      children: [
        {
          id: "inv_add_product",
          label: "Add Product",
          icon: PlusCircle,
        },
        {
          id: "inv_product_list",
          label: "Product List",
          icon: List,
        },
        {
          id: "inv_variants",
          label: "Categories",
          icon: FolderTree,
        },
        {
          id: "inv_expired_products",
          label: "Expired Products",
          icon: CalendarX2,
        },
      ],
    },
    {
      id: "stock",
      label: "Stock Management",
      icon: RefreshCw,
      visible: isOwner || isRegional || isManager || isInventory || isAuditor,
      children: [
        {
          id: "stock_add_stock",
          label: "Add Stock",
          icon: PackagePlus,
        },
        {
          id: "stock_stock_list",
          label: "Stock List",
          icon: PackageCheck,
        },
        {
          id: "stock_stock_history",
          label: "Stock History",
          icon: History,
        },
        {
          id: "stock_transfer_stock",
          label: "Transfer Stock",
          icon: ArrowLeftRight,
        },
        {
          id: "stock_transfer_history",
          label: "Transfer History",
          icon: FileSpreadsheet,
        },
        {
          id: "stock_stock_receive",
          label: "Stock Receive",
          icon: Inbox,
        },
      ],
    },
    {
      id: "supplier",
      label: "Supplier Management",
      icon: Factory,
      visible: isOwner || isRegional || isManager || isInventory || isAccounts || isAuditor,
      children: [
        {
          id: "sup_suppliers",
          label: "Suppliers",
          icon: Truck,
        },
        {
          id: "sup_purchase_history",
          label: "Purchase History",
          icon: Receipt,
        },
        {
          id: "sup_payments_due",
          label: "Payments / Due",
          icon: CreditCard,
        },
      ],
    },
    {
      id: "accounts",
      label: "Accounts & Finance",
      icon: Wallet,
      visible: isOwner || isRegional || isManager || isAccounts || isAuditor,
      children: [
        {
          id: "acc_overview",
          label: "Overview",
          icon: LayoutDashboard,
        },
        {
          id: "acc_financial_accounts",
          label: "Financial Accounts",
          icon: Wallet,
        },
        {
          id: "acc_fund_transfer",
          label: "Fund Transfer",
          icon: ArrowLeftRight,
        },
        {
          id: "acc_payment_sales",
          label: "Payment Method Sales",
          icon: CreditCard,
        },
        {
          id: "acc_product_sales",
          label: "Product-Wise Sales",
          icon: Package,
        },
        {
          id: "reports",
          label: "Sales Reports",
          icon: BarChart3,
        },
        {
          id: "sup_payments_due",
          label: "Supplier Payments / Due",
          icon: Receipt,
        },
        {
          id: "acc_transaction_history",
          label: "Transaction History",
          icon: History,
        },
      ],
    },
  ];

  // Preserved top-level menus
  const coreItems = [
    {
      id: "overview" as OwnerModule,
      label: isManager ? "Branch Overview" : isAccounts ? "Financial Overview" : isCashier ? "Cashier Hub" : "Dashboard",
      icon: LayoutDashboard,
      visible: !isCashier && !isInventory && !isAccounts,
    },
  ];

  const orgItems = [
    {
      id: "branches" as OwnerModule,
      label: "Branch Network",
      icon: Store,
      visible: isOwner || isRegional,
    },
    {
      id: "staff" as OwnerModule,
      label: isManager ? "Branch Staff" : "Staff Management",
      icon: Users,
      visible: isOwner || isRegional || isManager,
    },
  ];

  const enterpriseItems = [
    {
      id: "reports" as OwnerModule,
      label: "Daily Shift Sales",
      icon: BarChart3,
      visible: isCashier,
    },
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

  // Dedicated Accounts Manager menu items (8 separate pages)
  const accountsManagerItems = [
    {
      id: "acc_overview" as OwnerModule,
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "acc_financial_accounts" as OwnerModule,
      label: "Financial Accounts",
      icon: Wallet,
    },
    {
      id: "acc_fund_transfer" as OwnerModule,
      label: "Fund Transfer",
      icon: ArrowLeftRight,
    },
    {
      id: "acc_payment_sales" as OwnerModule,
      label: "Payment Method Sales",
      icon: CreditCard,
    },
    {
      id: "acc_product_sales" as OwnerModule,
      label: "Product-Wise Sales",
      icon: Package,
    },
    {
      id: "reports" as OwnerModule,
      label: "Sales Reports",
      icon: BarChart3,
    },
    {
      id: "sup_payments_due" as OwnerModule,
      label: "Supplier Payments / Due",
      icon: Receipt,
    },
    {
      id: "acc_transaction_history" as OwnerModule,
      label: "Transaction History",
      icon: History,
    },
  ];

  return (
    <aside className="w-64 xl:w-72 2xl:w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] 2xl:min-h-[calc(100vh-5rem)] transition-all duration-200">
      <div className="p-3.5 xl:p-4 2xl:p-5 space-y-4 xl:space-y-5 2xl:space-y-6 flex-1 overflow-y-auto">
        {/* If Accounts Role, render dedicated 8 top-level items */}
        {isAccounts ? (
          <div className="space-y-1 xl:space-y-1.5">
            <div className="px-3 xl:px-3.5 2xl:px-4 text-[10px] xl:text-[11px] 2xl:text-xs font-black uppercase tracking-wider text-slate-400">
              Accounts & Finance
            </div>
            {accountsManagerItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onModuleChange(item.id)}
                  className={`w-full flex items-center gap-2.5 xl:gap-3 px-3 py-2.5 xl:px-3.5 xl:py-2.5 2xl:px-4 2xl:py-3 rounded-xl xl:rounded-2xl text-xs xl:text-sm 2xl:text-base font-bold transition-all ${
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
        ) : (
          <>
            {/* Core Operations (Dashboard, POS, Accounts) */}
            <div className="space-y-1 xl:space-y-1.5">
              <div className="px-3 xl:px-3.5 2xl:px-4 text-[10px] xl:text-[11px] 2xl:text-xs font-black uppercase tracking-wider text-slate-400">
                Overview & Counter
              </div>
              {coreItems
                .filter((item) => item.visible)
                .map((item) => {
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

            {/* Collapsible Domain Sections */}
            <div className="space-y-2 xl:space-y-2.5">
              <div className="px-3 xl:px-3.5 2xl:px-4 text-[10px] xl:text-[11px] 2xl:text-xs font-black uppercase tracking-wider text-slate-400">
                Pharmacy Operations
              </div>

              {collapsibleSections
                .filter((sec) => sec.visible)
                .map((section) => {
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

            {/* Organization / Staff */}
            <div className="space-y-1 xl:space-y-1.5">
              <div className="px-3 xl:px-3.5 2xl:px-4 text-[10px] xl:text-[11px] 2xl:text-xs font-black uppercase tracking-wider text-slate-400">
                Administration
              </div>
              {orgItems
                .filter((item) => item.visible)
                .map((item) => {
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

            {/* System / Reports */}
            <div className="space-y-1 xl:space-y-1.5">
              <div className="px-3 xl:px-3.5 2xl:px-4 text-[10px] xl:text-[11px] 2xl:text-xs font-black uppercase tracking-wider text-slate-400">
                System & Analytics
              </div>
              {enterpriseItems
                .filter((item) => item.visible)
                .map((item) => {
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
          </>
        )}
      </div>
    </aside>
  );
}
