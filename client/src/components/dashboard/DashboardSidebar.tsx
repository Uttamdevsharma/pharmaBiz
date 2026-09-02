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
} from "lucide-react";

export type OwnerModule =
  | "overview"
  | "pos"
  | "accounts"
  | "acc_payment_sales"
  | "acc_product_sales"
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

  // Collapsible state for parent groups: "inventory", "stock", "supplier"
  const [openParents, setOpenParents] = useState<Record<string, boolean>>({
    inventory: activeModule.startsWith("inv_"),
    stock: activeModule.startsWith("stock_"),
    supplier: activeModule.startsWith("sup_"),
  });

  // Auto-expand parent when activeModule changes
  useEffect(() => {
    if (activeModule.startsWith("inv_")) {
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
  ];

  // Preserved top-level menus
  const coreItems = [
    {
      id: "overview" as OwnerModule,
      label: isManager ? "Branch Overview" : isAccounts ? "Financial Overview" : isCashier ? "Cashier Hub" : "Dashboard",
      icon: LayoutDashboard,
      visible: !isCashier && !isInventory,
    },
    {
      id: "pos" as OwnerModule,
      label: isCashier ? "Counter POS (Active)" : "Sales / Counter POS",
      icon: ShoppingCart,
      visible: isOwner || isRegional || isManager || isCashier,
    },
    {
      id: "accounts" as OwnerModule,
      label: "Accounts & Ledger",
      icon: Wallet,
      visible: isOwner || isAccounts || isManager,
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
    {
      id: "roles" as OwnerModule,
      label: "Roles & Permissions",
      icon: Shield,
      visible: isOwner || isAuditor,
    },
  ];

  const enterpriseItems = [
    {
      id: "reports" as OwnerModule,
      label: isCashier ? "Daily Shift Sales" : "Sales & MIS Reports",
      icon: BarChart3,
      visible: !isInventory,
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

  // Dedicated Accounts Manager menu items
  const accountsManagerItems = [
    {
      id: "accounts" as OwnerModule,
      label: "Accounts Overview",
      icon: Wallet,
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
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-3.5 space-y-5 flex-1 overflow-y-auto">
        {/* If Accounts Role, render dedicated 5 top-level items */}
        {isAccounts ? (
          <div className="space-y-1.5">
            <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Accounts & Finance
            </div>
            {accountsManagerItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onModuleChange(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <>
            {/* Core Operations (Dashboard, POS, Accounts) */}
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
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
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
            </div>

            {/* Collapsible Domain Sections */}
            <div className="space-y-2">
              <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Pharmacy Operations
              </div>

              {collapsibleSections
                .filter((sec) => sec.visible)
                .map((section) => {
                  const ParentIcon = section.icon;
                  const isOpen = !openParents[section.id];
                  const isParentActive = section.children.some(
                    (child) => activeModule === child.id
                  );

                  return (
                    <div key={section.id} className="rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleParent(section.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-black transition-all ${
                          isParentActive && !isOpen
                            ? "bg-emerald-600/10 text-emerald-600 dark:bg-emerald-600/20"
                            : isParentActive && isOpen
                            ? "bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-white"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <ParentIcon
                            className={`h-4 w-4 shrink-0 ${
                              isParentActive ? "text-emerald-600" : "text-slate-500 dark:text-slate-400"
                            }`}
                          />
                          <span>{section.label}</span>
                        </div>
                        {isOpen ? (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        )}
                      </button>

                      {/* Sub-items */}
                      {isOpen && (
                        <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-slate-100 dark:border-slate-800 ml-3.5 mt-1">
                          {section.children.map((child) => {
                            const ChildIcon = child.icon;
                            const isChildActive = activeModule === child.id;
                            return (
                              <button
                                key={child.id}
                                onClick={() => onModuleChange(child.id)}
                                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                  isChildActive
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
                                }`}
                              >
                                <ChildIcon className="h-3.5 w-3.5 shrink-0" />
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
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
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
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
            </div>

            {/* System / Reports */}
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
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
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
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
