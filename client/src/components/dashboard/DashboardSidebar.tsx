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
  CalendarDays,
  Sliders,
  Wallet,
  Percent,
  AlertTriangle,
  DollarSign,
  Briefcase,
  CalendarCheck,
  Archive,
  Layers,
  MapPin,
  Pill,
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
  | "acc_expenses"
  | "acc_salaries"
  | "employee_details"
  | "staff_salary_history"
  | "change_password"
  | "acc_transaction_history"
  | "exp_list"
  | "exp_pay"
  | "exp_history"
  | "exp_recurring"
  | "exp_monthly"
  | "exp_settings"
  | "sal_employees"
  | "sal_attendance"
  | "sal_offdays"
  | "sal_deduction_rules"
  | "sal_management"
  | "sal_history"
  | "inv_add_product"
  | "inv_product_list"
  | "inv_variants"
  | "inv_expired_products"
  | "cat_create"
  | "cat_list"
  | "stock_add_stock"
  | "stock_stock_list"
  | "stock_stock_history"
  | "stock_stock_allocation"
  | "stock_allocation_history"
  | "stock_transfer_stock"
  | "stock_transfer_history"
  | "stock_stock_receive"
  | "stock_inspection"
  | "stock_damaged_products"
  | "loc_create_rack"
  | "loc_rack_list"
  | "sup_create_supplier"
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
  id: OwnerModule | string;
  label: string;
  icon: React.ElementType;
  visible?: boolean;
  children?: SubMenuItem[];
}

interface ParentMenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  children: SubMenuItem[];
  visible: boolean;
  moduleId?: OwnerModule;
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

  const isSupplierActive =
    activeModule.startsWith("sup_") && activeModule !== "sup_payments_due";
  const isCategoryActive = activeModule.startsWith("cat_");
  const isLocationActive = activeModule.startsWith("loc_");
  const isInventoryActive = activeModule.startsWith("inv_");
  const isBranchActive = activeModule === "branches";
  const isStockActive = activeModule.startsWith("stock_");
  const isStaffActive =
    activeModule === "staff" ||
    activeModule === "staff_create" ||
    activeModule === "roles";

  const isSalesPosActive =
    activeModule === "pos" ||
    activeModule === "pos_sale" ||
    activeModule === "pos_history" ||
    activeModule === "pos_vat" ||
    activeModule === "reports";

  const isAccountsActive =
    activeModule === "acc_overview" ||
    activeModule === "accounts" ||
    activeModule === "acc_financial_accounts" ||
    activeModule === "acc_fund_transfer" ||
    activeModule === "acc_transaction_history" ||
    activeModule === "sup_payments_due";

  const isExpensesActive =
    activeModule === "exp_list" ||
    activeModule === "exp_pay" ||
    activeModule === "exp_history" ||
    activeModule === "exp_recurring" ||
    activeModule === "exp_monthly" ||
    activeModule === "exp_settings" ||
    activeModule === "acc_expenses";

  const isSalaryActive =
    activeModule === "sal_employees" ||
    activeModule === "sal_attendance" ||
    activeModule === "sal_offdays" ||
    activeModule === "sal_deduction_rules" ||
    activeModule === "sal_management" ||
    activeModule === "sal_history" ||
    activeModule === "acc_salaries" ||
    activeModule === "employee_details" ||
    activeModule === "staff_salary_history";

  // Collapsible state for parent groups (in workflow order)
  const [openParents, setOpenParents] = useState<Record<string, boolean>>({
    supplier: isSupplierActive,
    category_mgmt: isCategoryActive,
    location_mgmt: isLocationActive,
    inventory: isInventoryActive,
    branch_mgmt: isBranchActive,
    stock: isStockActive,
    staff_mgmt: isStaffActive,
    sales_pos: isSalesPosActive,
    accounts: isAccountsActive,
    expenses_bills: isExpensesActive,
    employee_salary: isSalaryActive,
  });

  const [openSubgroups, setOpenSubgroups] = useState<Record<string, boolean>>({
    allocate_product_group: true,
  });

  const toggleSubgroup = (subgroupId: string) => {
    setOpenSubgroups((prev) => ({
      ...prev,
      [subgroupId]: !prev[subgroupId],
    }));
  };

  // Auto-expand parent when activeModule changes
  useEffect(() => {
    if (isSupplierActive) {
      setOpenParents((prev) => ({ ...prev, supplier: true }));
    }
    if (isCategoryActive) {
      setOpenParents((prev) => ({ ...prev, category_mgmt: true }));
    }
    if (isLocationActive) {
      setOpenParents((prev) => ({ ...prev, location_mgmt: true }));
    }
    if (isInventoryActive) {
      setOpenParents((prev) => ({ ...prev, inventory: true }));
    }
    if (isBranchActive) {
      setOpenParents((prev) => ({ ...prev, branch_mgmt: true }));
    }
    if (isStockActive) {
      setOpenParents((prev) => ({ ...prev, stock: true }));
    }
    if (isStaffActive) {
      setOpenParents((prev) => ({ ...prev, staff_mgmt: true }));
    }
    if (isSalesPosActive) {
      setOpenParents((prev) => ({ ...prev, sales_pos: true }));
    }
    if (isAccountsActive) {
      setOpenParents((prev) => ({ ...prev, accounts: true }));
    }
    if (isExpensesActive) {
      setOpenParents((prev) => ({ ...prev, expenses_bills: true }));
    }
    if (isSalaryActive) {
      setOpenParents((prev) => ({ ...prev, employee_salary: true }));
    }

    if (activeModule === "stock_stock_allocation" || activeModule === "stock_allocation_history") {
      setOpenSubgroups((prev) => ({ ...prev, allocate_product_group: true }));
    }
  }, [
    activeModule,
    isSupplierActive,
    isCategoryActive,
    isLocationActive,
    isInventoryActive,
    isBranchActive,
    isStockActive,
    isStaffActive,
    isSalesPosActive,
    isAccountsActive,
    isExpensesActive,
    isSalaryActive,
  ]);

  const toggleParent = (parentId: string) => {
    setOpenParents((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }));
  };

  // 1. Supplier Management Section
  const supplierChildren: SubMenuItem[] = [
    {
      id: "sup_create_supplier" as OwnerModule,
      label: "Create Supplier",
      icon: PlusCircle,
      visible: isOwner || hasPermission("supplier.manage"),
    },
    {
      id: "sup_suppliers" as OwnerModule,
      label: "Suppliers",
      icon: Truck,
      visible: isOwner || hasPermission("supplier.view"),
    },
    {
      id: "sup_purchase_history" as OwnerModule,
      label: "Purchase History",
      icon: Receipt,
      visible: isOwner || hasPermission("supplier.purchase_history"),
    },
    {
      id: "sup_payments_due" as OwnerModule,
      label: "Payments / Due",
      icon: CreditCard,
      visible: isOwner || hasPermission("supplier.payments_due"),
    },
  ].filter((item) => item.visible);

  // 2. Category Management Section
  const categoryChildren: SubMenuItem[] = [
    {
      id: "cat_create" as OwnerModule,
      label: "Manage Categories",
      icon: PlusCircle,
      visible: isOwner || hasPermission("category.manage"),
    },
    {
      id: "cat_list" as OwnerModule,
      label: "Manage Subcategories",
      icon: List,
      visible: isOwner || hasPermission("category.subcategories") || hasPermission("category.manage"),
    },
  ].filter((item) => item.visible);

  // 3. Location Management Section
  const locationChildren: SubMenuItem[] = [
    {
      id: "loc_create_rack" as OwnerModule,
      label: "Create Rack",
      icon: PlusCircle,
      visible: isOwner || hasPermission("location.create_rack"),
    },
    {
      id: "loc_rack_list" as OwnerModule,
      label: "Rack List",
      icon: List,
      visible: isOwner || hasPermission("location.rack_list"),
    },
  ].filter((item) => item.visible);

  // 4. Inventory Section
  const inventoryChildren: SubMenuItem[] = [
    {
      id: "inv_add_product" as OwnerModule,
      label: "Add Product",
      icon: PlusCircle,
      visible: isOwner || hasPermission("inventory.add_product"),
    },
    {
      id: "inv_product_list" as OwnerModule,
      label: "Product List",
      icon: List,
      visible: isOwner || hasPermission("inventory.product_list"),
    },
  ].filter((item) => item.visible);

  // 5. Branch Management Section
  const branchChildren: SubMenuItem[] = [
    {
      id: "branches" as OwnerModule,
      label: "Branch List",
      icon: Store,
      visible: isOwner || hasPermission("branches.manage"),
    },
  ].filter((item) => item.visible);

  // 6. Stock Management Section
  const hasAllocationPerm = isOwner || hasPermission("stock.allocation");
  const hasAllocationHistPerm = isOwner || hasPermission("stock.allocation_history");
  const allocationGroupVisible = hasAllocationPerm || hasAllocationHistPerm;

  const stockChildren: SubMenuItem[] = [
    {
      id: "stock_add_stock" as OwnerModule,
      label: "Add Stock",
      icon: PackagePlus,
      visible: isOwner || hasPermission("stock.add_stock"),
    },
    {
      id: "stock_stock_list" as OwnerModule,
      label: "Stock List",
      icon: PackageCheck,
      visible: isOwner || hasPermission("stock.stock_list"),
    },
    {
      id: "stock_stock_history" as OwnerModule,
      label: "Stock History",
      icon: History,
      visible: isOwner || hasPermission("stock.stock_history"),
    },
    ...(allocationGroupVisible
      ? [
          {
            id: "allocate_product_group",
            label: "Allocate Product",
            icon: MapPin,
            visible: true,
            children: [
              {
                id: "stock_stock_allocation" as OwnerModule,
                label: "Stock Allocation",
                icon: Layers,
                visible: hasAllocationPerm,
              },
              {
                id: "stock_allocation_history" as OwnerModule,
                label: "Allocation History",
                icon: History,
                visible: hasAllocationHistPerm,
              },
            ].filter((c) => c.visible),
          },
        ]
      : []),
    {
      id: "stock_transfer_stock" as OwnerModule,
      label: "Transfer Stock",
      icon: ArrowLeftRight,
      visible: isOwner || hasPermission("stock.transfer"),
    },
    {
      id: "stock_transfer_history" as OwnerModule,
      label: "Transfer History",
      icon: FileSpreadsheet,
      visible: isOwner || hasPermission("stock.transfer_history"),
    },
    {
      id: "stock_stock_receive" as OwnerModule,
      label: "Stock Receive",
      icon: Inbox,
      visible: isOwner || hasPermission("stock.receive"),
    },
    {
      id: "stock_damaged_products" as OwnerModule,
      label: "Damaged Products",
      icon: AlertTriangle,
      visible: isOwner || hasPermission("stock.damaged"),
    },
  ].filter((item) => item.visible);

  // 7. Staff Management Section (Staff List, Create Staff, Roles & Permissions)
  const staffChildren: SubMenuItem[] = [
    {
      id: "staff" as OwnerModule,
      label: "Staff List",
      icon: Users,
      visible: isOwner || hasPermission("staff.view"),
    },
    {
      id: "staff_create" as OwnerModule,
      label: "Create Staff",
      icon: UserPlus,
      visible: isOwner || hasPermission("staff.create"),
    },
    {
      id: "roles" as OwnerModule,
      label: "Roles & Permissions",
      icon: KeyRound,
      visible: isOwner || hasPermission("roles.manage"),
    },
  ].filter((item) => item.visible);

  // 8. Sales & POS Section
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
      id: "reports" as OwnerModule,
      label: "Sales Reports",
      icon: BarChart3,
      visible: isOwner || hasPermission("accounts.reports"),
    },
    {
      id: "pos_vat" as OwnerModule,
      label: "VAT Settings",
      icon: Percent,
      visible: isOwner || hasPermission("pos.vat"),
    },
  ].filter((item) => item.visible);

  // 9. Accounts & Finance Section
  const accountsChildren: SubMenuItem[] = [
    {
      id: "acc_overview" as OwnerModule,
      label: "Overview",
      icon: LayoutDashboard,
      visible: isOwner || hasPermission("accounts.overview"),
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

  // 10. Expenses & Bills Section
  const expensesChildren: SubMenuItem[] = [
    {
      id: "exp_list" as OwnerModule,
      label: "Bill List",
      icon: List,
      visible: isOwner || hasPermission("expenses.list"),
    },
    {
      id: "exp_pay" as OwnerModule,
      label: "Pay Bill",
      icon: CreditCard,
      visible: isOwner || hasPermission("expenses.pay"),
    },
    {
      id: "exp_history" as OwnerModule,
      label: "Bill History",
      icon: History,
      visible: isOwner || hasPermission("expenses.history"),
    },
  ].filter((item) => item.visible);

  // 11. Employee & Salary Section
  const salaryChildren: SubMenuItem[] = [
    {
      id: "sal_employees" as OwnerModule,
      label: "Employee List",
      icon: Users,
      visible: isOwner || hasPermission("employee.view"),
    },
    {
      id: "sal_attendance" as OwnerModule,
      label: "Attendance Management",
      icon: CalendarCheck,
      visible: isOwner || hasPermission("attendance.manage"),
    },
    {
      id: "sal_offdays" as OwnerModule,
      label: "Off-Day Settings",
      icon: CalendarX2,
      visible: isOwner || hasPermission("attendance.offdays"),
    },
    {
      id: "sal_deduction_rules" as OwnerModule,
      label: "Salary Deduction Rules",
      icon: Sliders,
      visible: isOwner || hasPermission("salary.deductions"),
    },
    {
      id: "sal_management" as OwnerModule,
      label: "Salary Management",
      icon: Briefcase,
      visible: isOwner || hasPermission("salary.manage"),
    },
    {
      id: "sal_history" as OwnerModule,
      label: "Salary History",
      icon: History,
      visible: isOwner || hasPermission("salary.history"),
    },
  ].filter((item) => item.visible);

  // Collapsible domain groups list in exact workflow order
  const collapsibleSections: ParentMenuItem[] = [
    {
      id: "supplier",
      label: "Supplier Management",
      icon: Factory,
      visible: supplierChildren.length > 0,
      children: supplierChildren,
    },
    {
      id: "category_mgmt",
      label: "Category Management",
      icon: FolderTree,
      visible: categoryChildren.length > 0,
      children: categoryChildren,
    },
    {
      id: "location_mgmt",
      label: "Location Management",
      icon: Archive,
      visible: locationChildren.length > 0,
      children: locationChildren,
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: Package,
      visible: inventoryChildren.length > 0,
      children: inventoryChildren,
    },
    {
      id: "branch_mgmt",
      label: "Branch Management",
      icon: Store,
      visible: isOwner || hasPermission("branches.manage"),
      moduleId: "branches" as OwnerModule,
      children: branchChildren,
    },
    {
      id: "stock",
      label: "Stock Management",
      icon: RefreshCw,
      visible: stockChildren.length > 0,
      children: stockChildren,
    },
    {
      id: "staff_mgmt",
      label: "Staff Management",
      icon: Users,
      visible: staffChildren.length > 0,
      children: staffChildren,
    },
    {
      id: "sales_pos",
      label: "Sales & POS",
      icon: ShoppingCart,
      visible: salesChildren.length > 0,
      children: salesChildren,
    },
    {
      id: "accounts",
      label: "Accounts & Finance",
      icon: Wallet,
      visible: accountsChildren.length > 0,
      children: accountsChildren,
    },
    {
      id: "expenses_bills",
      label: "Expenses & Bills",
      icon: Receipt,
      visible: expensesChildren.length > 0,
      children: expensesChildren,
    },
    {
      id: "employee_salary",
      label: "Employee & Salary",
      icon: Briefcase,
      visible: salaryChildren.length > 0,
      children: salaryChildren,
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

  // Pharmacy Owner Enterprise Settings
  const enterpriseItems = [
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
      visible: isOwner || hasPermission("settings.manage"),
    },
  ];

  const visibleCore = coreItems.filter((item) => item.visible);
  const visibleEnterprise = enterpriseItems.filter((item) => item.visible);
  const visibleCollapsible = collapsibleSections.filter((sec) => sec.visible);

  return (
    <aside className="w-64 xl:w-72 2xl:w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 h-full max-h-full min-h-0 overflow-hidden transition-all duration-200">
      <div className="p-3.5 xl:p-4 2xl:p-5 space-y-4 xl:space-y-5 2xl:space-y-6 flex-1 sidebar-scrollbar">
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
              const isParentActive =
                section.children.some(
                  (child) =>
                    activeModule === child.id ||
                    Boolean(child.children?.some((gc) => gc.id === activeModule))
                ) ||
                Boolean(section.moduleId && activeModule === section.moduleId);
              const isOpen = openParents[section.id] ?? isParentActive;

              return (
                <div key={section.id} className="rounded-xl xl:rounded-2xl overflow-hidden">
                  <button
                    onClick={() => {
                      if (section.moduleId) {
                        onModuleChange(section.moduleId);
                      }
                      toggleParent(section.id);
                    }}
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

                        // Check if item is a subgroup with nested children (e.g. Allocate Product)
                        if (child.children && child.children.length > 0) {
                          const isSubgroupOpen = openSubgroups[child.id] ?? true;
                          const hasActiveGrandchild = child.children.some(
                            (gc) => gc.id === activeModule
                          );
                          return (
                            <div key={child.id} className="space-y-0.5 pt-0.5">
                              <button
                                onClick={() => toggleSubgroup(child.id)}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 xl:px-3 xl:py-2 2xl:px-3.5 2xl:py-2.5 rounded-lg xl:rounded-xl text-[11px] xl:text-xs 2xl:text-sm font-bold transition-all ${
                                  hasActiveGrandchild
                                    ? "text-brand-primary bg-slate-100/70 dark:bg-slate-800/80 font-black"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white"
                                }`}
                              >
                                <div className="flex items-center gap-2 xl:gap-2.5 truncate">
                                  <ChildIcon className="h-3.5 w-3.5 xl:h-4 xl:w-4 shrink-0" />
                                  <span className="truncate">{child.label}</span>
                                </div>
                                {isSubgroupOpen ? (
                                  <ChevronDown className="h-3.5 w-3.5 xl:h-4 xl:w-4 shrink-0 opacity-70" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 xl:h-4 xl:w-4 shrink-0 opacity-70" />
                                )}
                              </button>

                              {isSubgroupOpen && (
                                <div className="pl-2.5 py-0.5 space-y-0.5 border-l-2 border-slate-200 dark:border-slate-700 ml-3.5 my-0.5">
                                  {child.children.map((grandchild) => {
                                    const GrandIcon = grandchild.icon;
                                    const isGrandActive = activeModule === grandchild.id;
                                    return (
                                      <button
                                        key={grandchild.id}
                                        onClick={() =>
                                          onModuleChange(grandchild.id as OwnerModule)
                                        }
                                        className={`w-full flex items-center gap-2 xl:gap-2.5 px-2.5 py-1.5 xl:px-3 xl:py-2 2xl:px-3.5 2xl:py-2.5 rounded-lg xl:rounded-xl text-[11px] xl:text-xs 2xl:text-sm font-bold transition-all ${
                                          isGrandActive
                                            ? "bg-brand-primary text-white shadow-xs"
                                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
                                        }`}
                                      >
                                        <GrandIcon className="h-3.5 w-3.5 xl:h-4 xl:w-4 shrink-0" />
                                        <span className="truncate">{grandchild.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        }

                        const isChildActive = activeModule === child.id;
                        return (
                          <button
                            key={child.id}
                            onClick={() => onModuleChange(child.id as OwnerModule)}
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
