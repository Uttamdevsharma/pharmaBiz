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
  ShieldPlus,
  CheckSquare,
  KeyRound,
  Package,
  ShoppingCart,
  BarChart3,
  CreditCard,
  Sparkles,
  Settings,
  Truck,
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  BadgeAlert,
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
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export type OwnerModule =
  | "overview"
  | "pos"
  | "pos_sale"
  | "pos_history"
  | "pos_due_sales"
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
  | "loc_create_custom"
  | "loc_custom_list"
  | "sup_create_supplier"
  | "sup_suppliers"
  | "sup_purchase_history"
  | "sup_payments_due"
  | "branches"
  | "branch_create"
  | "staff"
  | "staff_create"
  | "create_role"
  | "permission_assignment"
  | "roles"
  | "reports"
  | "profile"
  | "subscription"
  | "subscription_plans"
  | "subscription_history"
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
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function DashboardSidebar({
  activeModule,
  userRole = "COMPANY_OWNER",
  onModuleChange,
  mobileOpen = false,
  onCloseMobile,
  collapsed = false,
  onToggleCollapse,
}: DashboardSidebarProps) {
  const { user, hasPermission } = useAuth();
  const isCollapsed = collapsed && !mobileOpen;

  const handleModuleSelect = (mod: OwnerModule) => {
    onModuleChange(mod);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

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
    activeModule === "create_role" ||
    activeModule === "permission_assignment" ||
    activeModule === "roles";

  const isSalesPosActive =
    activeModule === "pos" ||
    activeModule === "pos_sale" ||
    activeModule === "pos_history" ||
    activeModule === "pos_due_sales" ||
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

  const isSubscriptionActive =
    activeModule === "subscription" ||
    activeModule === "subscription_plans" ||
    activeModule === "subscription_history";

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
    subscription_mgmt: isSubscriptionActive,
  });

  const [openSubgroups, setOpenSubgroups] = useState<Record<string, boolean>>({
    allocate_product_group: true,
    role_management_group: false,
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
    if (isSubscriptionActive) {
      setOpenParents((prev) => ({ ...prev, subscription_mgmt: true }));
    }

    if (activeModule === "stock_stock_allocation" || activeModule === "stock_allocation_history") {
      setOpenSubgroups((prev) => ({ ...prev, allocate_product_group: true }));
    }
    if (activeModule === "create_role" || activeModule === "permission_assignment" || activeModule === "roles") {
      setOpenSubgroups((prev) => ({ ...prev, role_management_group: true }));
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
    isSubscriptionActive,
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

  // 7. Staff Management Section (Create Staff, Staff List, Role Management -> Create Role, Permission Assignment)
  const staffChildren: SubMenuItem[] = [
    {
      id: "staff_create" as OwnerModule,
      label: "Create Staff",
      icon: UserPlus,
      visible: isOwner || hasPermission("staff.create"),
    },
    {
      id: "staff" as OwnerModule,
      label: "Staff List",
      icon: Users,
      visible: isOwner || hasPermission("staff.view"),
    },
    {
      id: "role_management_group",
      label: "Role Management",
      icon: KeyRound,
      visible: isOwner || hasPermission("roles.manage"),
      children: [
        {
          id: "create_role" as OwnerModule,
          label: "Create Role",
          icon: ShieldPlus,
          visible: isOwner || hasPermission("roles.manage"),
        },
        {
          id: "permission_assignment" as OwnerModule,
          label: "Permission Assignment",
          icon: CheckSquare,
          visible: isOwner || hasPermission("roles.manage"),
        },
      ].filter((c) => c.visible),
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
      id: "pos_due_sales" as OwnerModule,
      label: "Due Sales",
      icon: BadgeAlert,
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

  const subscriptionChildren: SubMenuItem[] = [
    {
      id: "subscription_plans" as OwnerModule,
      label: "Subscription Plans",
      icon: Sparkles,
      visible: isOwner,
    },
    {
      id: "subscription_history" as OwnerModule,
      label: "Payment History",
      icon: History,
      visible: isOwner,
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
    {
      id: "subscription_mgmt",
      label: "Subscription",
      icon: CreditCard,
      visible: isOwner,
      children: subscriptionChildren,
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
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 lg:hidden transition-opacity duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar / Mobile Drawer */}
      <aside
        className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 h-full max-h-full min-h-0 overflow-hidden transition-all duration-300 z-50 lg:z-auto print:hidden ${
          mobileOpen
            ? "fixed inset-y-0 left-0 w-72 sm:w-80 shadow-2xl animate-in slide-in-from-left duration-200"
            : isCollapsed
            ? "hidden lg:flex lg:w-20 xl:w-20 2xl:w-20 3xl:w-20"
            : "hidden lg:flex lg:w-64 xl:w-72 2xl:w-80 3xl:w-88 4xl:w-96"
        }`}
      >
        {/* Mobile Drawer Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between lg:hidden shrink-0">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
            <LayoutDashboard className="h-5 w-5 text-brand-primary" />
            <span>Navigation Menu</span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Collapsed Icon-Only Mode (Desktop/Laptop) */}
        {isCollapsed ? (
          <div className="p-2.5 space-y-3 flex-1 sidebar-scrollbar flex flex-col items-center">
            {/* Core Overview */}
            {visibleCore.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <div key={item.id} className="relative group w-full flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleModuleSelect(item.id)}
                    className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      isActive
                        ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                    }`}
                    aria-label={item.label}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                  </button>
                  {/* Tooltip */}
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 border border-slate-700">
                    {item.label}
                  </div>
                </div>
              );
            })}

            <div className="w-8 border-t border-slate-200 dark:border-slate-800 my-1" />

            {/* Collapsible Domain Sections */}
            {visibleCollapsible.map((section) => {
              const ParentIcon = section.icon;
              const isParentActive =
                section.children.some(
                  (child) =>
                    activeModule === child.id ||
                    Boolean(child.children?.some((gc) => gc.id === activeModule))
                ) ||
                Boolean(section.moduleId && activeModule === section.moduleId);

              return (
                <div key={section.id} className="relative group w-full flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (section.moduleId) {
                        handleModuleSelect(section.moduleId);
                      } else if (section.children[0]?.id) {
                        handleModuleSelect(section.children[0].id as OwnerModule);
                      }
                    }}
                    className={`h-11 w-11 rounded-xl flex items-center justify-center relative transition-all cursor-pointer ${
                      isParentActive
                        ? "bg-brand-primary/15 text-brand-primary dark:bg-brand-primary/25 dark:text-brand-primary"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                    }`}
                    aria-label={section.label}
                  >
                    <ParentIcon className="h-5 w-5 shrink-0" />
                    {isParentActive && (
                      <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand-primary ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </button>

                  {/* Flyout Submenu on Hover */}
                  <div className="absolute left-full ml-3 top-0 min-w-[210px] p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition duration-150 z-50">
                    <div className="px-2.5 py-1 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
                      {section.label}
                    </div>
                    <div className="space-y-0.5 max-h-72 overflow-y-auto custom-scrollbar">
                      {section.children.map((child) => {
                        if (child.children && child.children.length > 0) {
                          return (
                            <div key={child.id} className="pt-1">
                              <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase">
                                {child.label}
                              </div>
                              {child.children.map((gc) => (
                                <button
                                  key={gc.id}
                                  type="button"
                                  onClick={() => handleModuleSelect(gc.id as OwnerModule)}
                                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer text-left ${
                                    activeModule === gc.id
                                      ? "bg-brand-primary text-white font-bold"
                                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                                  }`}
                                >
                                  <gc.icon className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{gc.label}</span>
                                </button>
                              ))}
                            </div>
                          );
                        }

                        const isChildActive = activeModule === child.id;
                        return (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => handleModuleSelect(child.id as OwnerModule)}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer text-left ${
                              isChildActive
                                ? "bg-brand-primary text-white font-bold"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            <child.icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{child.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="w-8 border-t border-slate-200 dark:border-slate-800 my-1" />

            {/* Enterprise / System Settings */}
            {visibleEnterprise.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <div key={item.id} className="relative group w-full flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleModuleSelect(item.id)}
                    className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      isActive
                        ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                    }`}
                    aria-label={item.label}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                  </button>
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 border border-slate-700">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Full Expanded Sidebar Content */
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
                      onClick={() => handleModuleSelect(item.id)}
                      className={`w-full flex items-center gap-2.5 xl:gap-3 px-3 py-2 xl:px-3.5 xl:py-2.5 2xl:px-4 2xl:py-3 rounded-xl xl:rounded-2xl text-xs xl:text-sm 2xl:text-base font-bold transition-all cursor-pointer ${
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
                            handleModuleSelect(section.moduleId);
                          }
                          toggleParent(section.id);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 xl:px-3.5 xl:py-2.5 2xl:px-4 2xl:py-3 rounded-xl xl:rounded-2xl text-xs xl:text-sm 2xl:text-base font-black transition-all cursor-pointer ${
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
                              const isSubgroupOpen = openSubgroups[child.id] ?? false;
                              const hasActiveGrandchild = child.children.some(
                                (gc) => gc.id === activeModule
                              );
                              return (
                                <div key={child.id} className="space-y-0.5 pt-0.5">
                                  <button
                                    onClick={() => toggleSubgroup(child.id)}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 xl:px-3 xl:py-2 2xl:px-3.5 2xl:py-2.5 rounded-lg xl:rounded-xl text-[11px] xl:text-xs 2xl:text-sm font-bold transition-all cursor-pointer ${
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
                                              handleModuleSelect(grandchild.id as OwnerModule)
                                            }
                                            className={`w-full flex items-center gap-2 xl:gap-2.5 px-2.5 py-1.5 xl:px-3 xl:py-2 2xl:px-3.5 2xl:py-2.5 rounded-lg xl:rounded-xl text-[11px] xl:text-xs 2xl:text-sm font-bold transition-all cursor-pointer ${
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
                                onClick={() => handleModuleSelect(child.id as OwnerModule)}
                                className={`w-full flex items-center gap-2 xl:gap-2.5 px-2.5 py-1.5 xl:px-3 xl:py-2 2xl:px-3.5 2xl:py-2.5 rounded-lg xl:rounded-xl text-[11px] xl:text-xs 2xl:text-sm font-bold transition-all cursor-pointer ${
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
                      onClick={() => handleModuleSelect(item.id)}
                      className={`w-full flex items-center gap-2.5 xl:gap-3 px-3 py-2 xl:px-3.5 xl:py-2.5 2xl:px-4 2xl:py-3 rounded-xl xl:rounded-2xl text-xs xl:text-sm 2xl:text-base font-bold transition-all cursor-pointer ${
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
        )}

        {/* Sidebar Footer: Theme Switcher & Collapse Toggle */}
        <div className="p-2.5 2xl:p-3 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
          {/* Theme Switcher */}
          {isCollapsed ? (
            <div className="flex justify-center">
              <ThemeToggle className="h-9 w-9" />
            </div>
          ) : (
            <ThemeToggle variant="sidebar" />
          )}

          {/* Desktop Collapse / Expand Toggle */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`w-full hidden lg:flex items-center ${isCollapsed ? "justify-center" : "justify-between px-2.5"} py-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition duration-150 group relative cursor-pointer`}
              title={isCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
            >
              {isCollapsed ? (
                <>
                  <PanelLeftOpen className="h-5 w-5 text-brand-primary" />
                  <span className="absolute left-full ml-3 px-2.5 py-1 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50 border border-slate-700">
                    Expand Sidebar (Ctrl+B)
                  </span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-xs 2xl:text-sm font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">
                    <PanelLeftClose className="h-4 w-4 2xl:h-5 2xl:w-5 text-slate-400 group-hover:text-brand-primary transition" />
                    <span>Collapse</span>
                  </div>
                  <kbd className="hidden xl:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                    Ctrl+B
                  </kbd>
                </>
              )}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
