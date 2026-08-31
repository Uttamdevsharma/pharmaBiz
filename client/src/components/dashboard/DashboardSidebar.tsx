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
} from "lucide-react";

export type OwnerModule =
  | "overview"
  | "pos"
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
  const isManager = userRole === "BRANCH_MANAGER";
  const isCashier = userRole === "CASHIER";
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

  // Exact Requested Structure with Dedicated Route IDs:
  // 📦 Inventory
  //   ├─ Add Product (inv_add_product)
  //   ├─ Product List (inv_product_list)
  //   ├─ Variants (inv_variants)
  //   └─ Expired Products (inv_expired_products)
  // 🔄 Stock Management
  //   ├─ Add Stock (stock_add_stock)
  //   ├─ Stock List (stock_stock_list)
  //   ├─ Stock History (stock_stock_history)
  //   ├─ Transfer Stock (stock_transfer_stock)
  //   ├─ Transfer History (stock_transfer_history)
  //   └─ Stock Receive (stock_stock_receive)
  // 🏭 Supplier Management
  //   ├─ Suppliers (sup_suppliers)
  //   ├─ Purchase History (sup_purchase_history)
  //   └─ Payments / Due (sup_payments_due)
  const collapsibleSections: ParentMenuItem[] = [
    {
      id: "inventory",
      label: "Inventory",
      icon: Package,
      visible: isOwner || isRegional || isManager || isCashier || isAuditor,
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
      visible: isOwner || isRegional || isManager || isAuditor,
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
      visible: isOwner || isRegional || isManager || isAuditor,
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
      label: isManager ? "Branch Overview" : isCashier ? "Cashier Hub" : "Dashboard",
      icon: LayoutDashboard,
      visible: !isCashier,
    },
    {
      id: "pos" as OwnerModule,
      label: isCashier ? "Counter POS (Active)" : "Sales / Counter POS",
      icon: ShoppingCart,
      visible: isOwner || isRegional || isManager || isCashier,
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
      label: "Roles & Security",
      icon: Shield,
      visible: isOwner || isAuditor,
    },
  ];

  const enterpriseItems = [
    {
      id: "reports" as OwnerModule,
      label: isCashier ? "Daily Shift Sales" : "Sales & MIS Reports",
      icon: BarChart3,
      visible: true,
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

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-3.5 space-y-5 flex-1 overflow-y-auto">
        {/* Core Operations (Dashboard, POS) */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Overview & Sales
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

        {/* Collapsible Domain Sections */}
        <div className="space-y-2">
          <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Pharmacy Operations
          </div>

          {collapsibleSections
            .filter((sec) => sec.visible)
            .map((section) => {
              const ParentIcon = section.icon;
              const isOpen = !!openParents[section.id];
              
              // Check if any child in this section is currently active
              const isParentActive = section.children.some(
                (child) => activeModule === child.id
              );

              return (
                <div key={section.id} className="rounded-xl overflow-hidden">
                  {/* Parent Collapsible Header */}
                  <button
                    onClick={() => toggleParent(section.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-black transition-all ${
                      isParentActive && !isOpen
                        ? "bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/20"
                        : isParentActive && isOpen
                        ? "bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-white"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ParentIcon
                        className={`h-4 w-4 shrink-0 ${
                          isParentActive ? "text-brand-primary" : "text-slate-500 dark:text-slate-400"
                        }`}
                      />
                      <span>{section.label}</span>
                    </div>
                    <div className="p-0.5 text-slate-400">
                      {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200" />
                      )}
                    </div>
                  </button>

                  {/* Submenu Children */}
                  {isOpen && (
                    <div className="mt-1 ml-3.5 pl-2.5 border-l-2 border-slate-150 dark:border-slate-800 space-y-1 animate-in fade-in duration-150">
                      {section.children.map((child) => {
                        const ChildIcon = child.icon;
                        const isChildActive = activeModule === child.id;

                        return (
                          <button
                            key={child.id}
                            onClick={() => onModuleChange(child.id)}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all text-left ${
                              isChildActive
                                ? "bg-brand-primary text-white shadow-xs font-black"
                                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            <ChildIcon className="h-3.5 w-3.5 shrink-0 opacity-85" />
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

        {/* Organization Network */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Organization
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

        {/* Enterprise & Finance */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Enterprise & Finance
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
      </div>
    </aside>
  );
}
