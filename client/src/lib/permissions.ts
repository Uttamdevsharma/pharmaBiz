import React from "react";

export interface PermissionDef {
  id: string;
  name: string;
  category: string;
  description: string;
}

export const CATEGORIES = [
  "Dashboard",
  "Sales & POS",
  "Category Management",
  "Inventory",
  "Stock Management",
  "Location Management",
  "Supplier Management",
  "Accounts & Finance",
  "Expenses & Bills",
  "Employee & Salary",
  "Staff Management",
  "Branch Network & Settings",
] as const;

export type CategoryType = (typeof CATEGORIES)[number];

export const PHARMACY_MODULE_PERMISSIONS: PermissionDef[] = [
  // 1. Dashboard
  {
    id: "dashboard.view",
    name: "View Dashboard",
    category: "Dashboard",
    description: "Access main dashboard metrics, financial summaries, and branch status.",
  },

  // 2. Sales & POS
  {
    id: "pos.manage",
    name: "Sales / POS",
    category: "Sales & POS",
    description: "Process live checkout, scan barcodes, dispense medicines, and generate invoices.",
  },
  {
    id: "pos.history",
    name: "Sales History",
    category: "Sales & POS",
    description: "Inspect customer receipts, transaction history, invoice details, and sales records.",
  },
  {
    id: "accounts.payment_sales",
    name: "Payment Method Sales",
    category: "Sales & POS",
    description: "Analyze revenue breakdowns by cash, card, mobile banking, and digital payment methods.",
  },
  {
    id: "accounts.product_sales",
    name: "Product-Wise Sales",
    category: "Sales & POS",
    description: "Inspect sales velocity, units sold, and revenue contributions by items and categories.",
  },
  {
    id: "accounts.reports",
    name: "Sales Reports",
    category: "Sales & POS",
    description: "Generate sales reports, profit/loss summaries, and financial performance analytics.",
  },
  {
    id: "pos.vat",
    name: "VAT Settings",
    category: "Sales & POS",
    description: "Configure tax rules, branch VAT percentages, and receipt print options.",
  },

  // 3. Category Management
  {
    id: "category.manage",
    name: "Manage Categories",
    category: "Category Management",
    description: "Create, view, edit, and organize product categories and classifications.",
  },
  {
    id: "category.subcategories",
    name: "Manage Subcategories",
    category: "Category Management",
    description: "Create, update, and manage subcategories and product subtypes.",
  },

  // 4. Inventory
  {
    id: "inventory.add_product",
    name: "Add Product",
    category: "Inventory",
    description: "Register new pharmaceutical products, dosage forms, and catalog items.",
  },
  {
    id: "inventory.product_list",
    name: "Product List",
    category: "Inventory",
    description: "Browse, search, edit product details, update prices, and view catalog status.",
  },

  // 5. Stock Management
  {
    id: "stock.add_stock",
    name: "Add Stock",
    category: "Stock Management",
    description: "Record inward stock shipments, batch numbers, expiry dates, and purchase costs.",
  },
  {
    id: "stock.stock_list",
    name: "Stock List",
    category: "Stock Management",
    description: "Inspect branch inventory stock levels, low-stock alerts, and expiring batches.",
  },
  {
    id: "stock.stock_history",
    name: "Stock History",
    category: "Stock Management",
    description: "Review audit ledger of stock movements, batch arrivals, sales deductions, and adjustments.",
  },
  {
    id: "stock.allocation",
    name: "Stock Allocation",
    category: "Stock Management",
    description: "Allocate inventory items and batches to physical warehouse racks, shelves, and bins.",
  },
  {
    id: "stock.allocation_history",
    name: "Allocation History",
    category: "Stock Management",
    description: "Track physical allocation history, bin movements, and storage placements.",
  },
  {
    id: "stock.transfer",
    name: "Transfer Stock",
    category: "Stock Management",
    description: "Initiate and dispatch inter-branch stock transfers to other pharmacy locations.",
  },
  {
    id: "stock.transfer_history",
    name: "Transfer History",
    category: "Stock Management",
    description: "Track dispatch records, shipment statuses, and inter-branch transfer logs.",
  },
  {
    id: "stock.receive",
    name: "Stock Receive",
    category: "Stock Management",
    description: "Inspect and accept incoming branch transfers and record damaged/missing counts.",
  },
  {
    id: "stock.damaged",
    name: "Damaged Products",
    category: "Stock Management",
    description: "Review transit damaged reports, quarantine stock, and manage damaged items.",
  },

  // 6. Location Management
  {
    id: "location.create_rack",
    name: "Create Rack",
    category: "Location Management",
    description: "Set up and configure warehouse racks, shelves, and storage bin identifiers.",
  },
  {
    id: "location.rack_list",
    name: "Rack List",
    category: "Location Management",
    description: "Browse branch storage layouts, inspect bin contents, and manage physical locations.",
  },
  {
    id: "location.create_custom",
    name: "Create Location",
    category: "Location Management",
    description: "Configure custom physical storage units (refrigerators, counter desks, floor boxes).",
  },
  {
    id: "location.custom_list",
    name: "Location List",
    category: "Location Management",
    description: "Browse and manage non-rack custom physical storage locations.",
  },

  // 7. Supplier Management
  {
    id: "supplier.view",
    name: "Suppliers",
    category: "Supplier Management",
    description: "Browse supplier directories, vendor accounts, and supply partner profiles.",
  },
  {
    id: "supplier.manage",
    name: "Create / Manage Supplier",
    category: "Supplier Management",
    description: "Add new suppliers, edit vendor terms, and manage supplier profiles.",
  },
  {
    id: "supplier.purchase_history",
    name: "Purchase History",
    category: "Supplier Management",
    description: "Review supplier purchase orders, invoice amounts, batch receipts, and dates.",
  },
  {
    id: "supplier.payments_due",
    name: "Payments / Due",
    category: "Supplier Management",
    description: "Track unpaid vendor balances, record purchase dues, and settle supplier invoices.",
  },
  {
    id: "supplier.contacts",
    name: "Supplier & Contact Management",
    category: "Supplier Management",
    description: "Manage medical representatives, sales reps, and supplier contact persons.",
  },

  // 8. Accounts & Finance
  {
    id: "accounts.overview",
    name: "Overview",
    category: "Accounts & Finance",
    description: "View branch financial overview, total cash in hand, receivables, and payables.",
  },
  {
    id: "accounts.financial_accounts",
    name: "Financial Accounts",
    category: "Accounts & Finance",
    description: "Create and manage cash registers, petty cash, bank accounts, and digital wallets.",
  },
  {
    id: "accounts.fund_transfer",
    name: "Fund Transfer",
    category: "Accounts & Finance",
    description: "Execute internal double-entry fund transfers between pharmacy accounts with audit logs.",
  },
  {
    id: "accounts.supplier_due",
    name: "Supplier Payments / Due",
    category: "Accounts & Finance",
    description: "Financial settlement and disbursement of supplier dues and vendor payables.",
  },
  {
    id: "accounts.transaction_history",
    name: "Transaction History",
    category: "Accounts & Finance",
    description: "Inspect the complete financial ledger, credits, debits, and balance statements.",
  },

  // 9. Expenses & Bills
  {
    id: "expenses.list",
    name: "Bill List",
    category: "Expenses & Bills",
    description: "Manage recurring bills (Rent, Electricity, Internet, Maintenance) and billing schedules.",
  },
  {
    id: "expenses.pay",
    name: "Pay Bill",
    category: "Expenses & Bills",
    description: "Record and disburse branch expense payments directly from selected financial accounts.",
  },
  {
    id: "expenses.history",
    name: "Bill History",
    category: "Expenses & Bills",
    description: "Review monthly expense breakdown logs, payment vouchers, and utility bills.",
  },

  // 10. Employee & Salary
  {
    id: "employee.view",
    name: "Employee List",
    category: "Employee & Salary",
    description: "View branch employee roster, contact info, join dates, and employment statuses.",
  },
  {
    id: "attendance.manage",
    name: "Attendance Management",
    category: "Employee & Salary",
    description: "Record daily staff attendance (Present, Absent, Late, Half Day) and monthly summaries.",
  },
  {
    id: "attendance.offdays",
    name: "Off-Day Settings",
    category: "Employee & Salary",
    description: "Configure weekly off-days, monthly holiday calendars, and branch working days.",
  },
  {
    id: "salary.deductions",
    name: "Salary Deduction Rules",
    category: "Employee & Salary",
    description: "Configure rules for late penalties, unexcused absence deductions, and salary cut policies.",
  },
  {
    id: "salary.manage",
    name: "Salary Management",
    category: "Employee & Salary",
    description: "Calculate monthly payroll, manage dynamic allowances, and disburse staff salaries.",
  },
  {
    id: "salary.history",
    name: "Salary History",
    category: "Employee & Salary",
    description: "Review monthly payroll disbursement archives, pay slips, and staff compensation logs.",
  },
  {
    id: "salaries.base_salary.edit",
    name: "Configure Base Salary",
    category: "Employee & Salary",
    description: "Set and update employee Base Salary packages and contractual compensation.",
  },

  // 11. Staff Management
  {
    id: "staff.view",
    name: "Staff List",
    category: "Staff Management",
    description: "View pharmacy staff accounts, active statuses, and assigned operational roles.",
  },
  {
    id: "staff.create",
    name: "Create Staff",
    category: "Staff Management",
    description: "Create new pharmacy staff credentials, assign branch, and configure access roles.",
  },
  {
    id: "roles.manage",
    name: "Roles & Permissions",
    category: "Staff Management",
    description: "Create custom roles, edit role permissions, and customize operational staff privileges.",
  },

  // 12. Branch Network & Settings
  {
    id: "branches.manage",
    name: "Branch Network",
    category: "Branch Network & Settings",
    description: "View and configure branch network locations, contact information, and branch settings.",
  },
  {
    id: "settings.manage",
    name: "Pharmacy Settings & Profile",
    category: "Branch Network & Settings",
    description: "Update pharmacy business profile, company information, and organizational preferences.",
  },
];

export const PERMISSION_ALIASES: Record<string, string[]> = {
  // Sales & POS
  "pos.manage": ["sales.pos", "sales.create"],
  "sales.pos": ["pos.manage"],
  "pos.history": ["sales.view", "sales.history", "pos.manage"],
  "sales.view": ["pos.history", "pos.manage"],
  "pos.vat": ["pos.manage"],
  "accounts.payment_sales": ["accounts.manage", "pos.history"],
  "accounts.product_sales": ["accounts.manage", "pos.history"],
  "accounts.reports": ["reports.sales", "reports.view", "accounts.manage", "pos.history"],
  "reports.sales": ["accounts.reports", "accounts.manage"],
  "reports.view": ["accounts.reports", "accounts.manage"],

  // Category Management
  "category.manage": ["inventory.manage", "product.create", "product.update", "product.view"],
  "category.subcategories": ["category.manage", "inventory.manage", "product.view"],

  // Inventory
  "inventory.add_product": ["inventory.manage", "product.create"],
  "product.create": ["inventory.add_product", "inventory.manage"],
  "inventory.product_list": ["inventory.manage", "inventory.view", "product.view"],
  "product.view": ["inventory.product_list", "inventory.manage", "inventory.view"],
  "product.update": ["inventory.manage", "inventory.add_product"],
  "inventory.view": ["inventory.product_list", "inventory.manage", "stock.manage", "stock.stock_list"],
  "inventory.manage": ["inventory.add_product", "inventory.product_list"],

  // Stock Management
  "stock.add_stock": ["stock.manage", "inventory.add_stock", "inventory.manage"],
  "inventory.add_stock": ["stock.add_stock", "stock.manage", "inventory.manage"],
  "stock.stock_list": ["stock.manage", "inventory.view", "inventory.manage", "product.view"],
  "stock.stock_history": ["stock.manage", "inventory.view", "inventory.manage"],
  "stock.allocation": ["stock.manage", "inventory.adjust", "inventory.manage"],
  "stock.allocation_history": ["stock.manage", "inventory.view", "inventory.manage"],
  "stock.transfer": ["stock.manage", "inventory.transfer"],
  "stock.transfer_history": ["stock.manage", "inventory.transfer"],
  "stock.receive": ["stock.manage", "inventory.transfer"],
  "stock.damaged": ["stock.manage", "inventory.manage", "inventory.adjust"],
  "inventory.adjust": ["stock.manage", "stock.allocation", "stock.damaged"],
  "inventory.transfer": ["stock.manage", "stock.transfer", "stock.receive"],
  "stock.manage": [
    "stock.add_stock",
    "stock.stock_list",
    "stock.stock_history",
    "stock.allocation",
    "stock.allocation_history",
    "stock.transfer",
    "stock.transfer_history",
    "stock.receive",
    "stock.damaged",
    "inventory.transfer",
  ],

  // Location Management
  "location.create_rack": ["location.manage", "stock.manage", "inventory.manage", "location.create_custom"],
  "location.rack_list": ["location.view", "location.manage", "stock.manage", "inventory.manage", "stock.stock_list", "location.custom_list"],
  "location.create_custom": ["location.create_rack", "location.manage", "stock.manage"],
  "location.custom_list": ["location.rack_list", "location.view", "location.manage", "stock.manage"],
  "location.manage": ["location.create_rack", "location.rack_list", "location.create_custom", "location.custom_list", "stock.manage"],
  "location.view": ["location.rack_list", "location.custom_list", "location.manage", "stock.manage"],

  // Supplier Management
  "supplier.view": ["supplier.manage", "suppliers.manage"],
  "supplier.manage": ["suppliers.manage"],
  "suppliers.manage": ["supplier.manage"],
  "supplier.purchase_history": ["supplier.manage", "suppliers.manage", "supplier.view"],
  "supplier.payments_due": ["accounts.supplier_due", "supplier.manage", "suppliers.manage", "accounts.manage"],
  "supplier.contacts": ["supplier.manage", "suppliers.manage"],

  // Accounts & Finance
  "accounts.overview": ["accounts.view", "accounts.manage"],
  "accounts.view": ["accounts.manage", "accounts.overview", "accounts.reports", "accounts.transfer", "dashboard.view"],
  "accounts.manage": ["accounts.view", "accounts.overview", "accounts.transfer"],
  "accounts.financial_accounts": ["accounts.manage"],
  "accounts.fund_transfer": ["accounts.transfer", "accounts.manage"],
  "accounts.transfer": ["accounts.fund_transfer", "accounts.manage"],
  "accounts.transaction_history": ["accounts.view", "accounts.manage"],
  "accounts.supplier_due": ["supplier.payments_due", "accounts.manage", "suppliers.manage"],

  // Expenses & Bills
  "expenses.list": ["accounts.expenses", "accounts.manage"],
  "expenses.pay": ["accounts.expenses", "accounts.manage"],
  "expenses.history": ["accounts.expenses", "accounts.manage"],
  "accounts.expenses": ["expenses.list", "expenses.pay", "expenses.history", "accounts.manage"],

  // Employee & Salary
  "employee.view": ["accounts.salaries", "accounts.manage", "staff.manage"],
  "attendance.manage": ["accounts.salaries", "staff.manage", "accounts.manage"],
  "attendance.offdays": ["attendance.manage", "accounts.salaries"],
  "salary.deductions": ["attendance.offdays", "attendance.manage", "accounts.salaries", "accounts.manage"],
  "salary.manage": ["accounts.salaries", "accounts.manage"],
  "salary.history": ["accounts.salaries", "accounts.manage"],
  "salaries.base_salary.edit": ["accounts.salaries", "accounts.manage"],
  "accounts.salaries": ["salary.manage", "salary.history", "salary.deductions", "accounts.manage"],

  // Staff Management
  "staff.view": ["staff.manage", "user.view", "user.manage"],
  "staff.create": ["staff.manage", "user.create", "user.manage"],
  "roles.manage": ["staff.manage"],
  "staff.manage": ["staff.view", "staff.create", "roles.manage", "user.create", "user.view", "user.update", "user.manage"],

  // Organization
  "branches.manage": [],
  "settings.manage": [],
};

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ["*"],
  COMPANY_OWNER: ["*"],
  BRANCH_MANAGER: [
    "dashboard.view",
    "pos.manage",
    "pos.history",
    "pos.vat",
    "accounts.payment_sales",
    "accounts.product_sales",
    "accounts.reports",
    "category.manage",
    "category.subcategories",
    "inventory.add_product",
    "inventory.product_list",
    "inventory.manage",
    "inventory.view",
    "product.view",
    "product.create",
    "product.update",
    "stock.manage",
    "stock.add_stock",
    "stock.stock_list",
    "stock.stock_history",
    "stock.allocation",
    "stock.allocation_history",
    "stock.transfer",
    "stock.transfer_history",
    "stock.receive",
    "stock.damaged",
    "location.create_rack",
    "location.rack_list",
    "supplier.view",
    "supplier.manage",
    "supplier.purchase_history",
    "supplier.payments_due",
    "supplier.contacts",
    "suppliers.manage",
    "accounts.overview",
    "accounts.manage",
    "accounts.view",
    "accounts.financial_accounts",
    "accounts.fund_transfer",
    "accounts.transaction_history",
    "accounts.supplier_due",
    "expenses.list",
    "expenses.pay",
    "expenses.history",
    "accounts.expenses",
    "employee.view",
    "attendance.manage",
    "attendance.offdays",
    "salary.deductions",
    "salary.manage",
    "salary.history",
    "accounts.salaries",
    "salaries.base_salary.edit",
    "staff.view",
    "staff.create",
    "staff.manage",
    "branches.manage",
    "reports.view",
    "reports.sales",
    "reports.stock",
    "reports.revenue",
  ],
  INVENTORY_EXECUTIVE: [
    "inventory.add_product",
    "inventory.product_list",
    "inventory.manage",
    "inventory.view",
    "product.view",
    "product.create",
    "product.update",
    "category.manage",
    "category.subcategories",
    "stock.manage",
    "stock.add_stock",
    "stock.stock_list",
    "stock.stock_history",
    "stock.allocation",
    "stock.allocation_history",
    "stock.transfer",
    "stock.transfer_history",
    "stock.receive",
    "stock.damaged",
    "location.create_rack",
    "location.rack_list",
    "supplier.view",
    "supplier.manage",
    "supplier.purchase_history",
    "supplier.contacts",
    "suppliers.manage",
    "reports.stock",
  ],
  CASHIER: [
    "pos.manage",
    "pos.history",
    "sales.pos",
    "sales.create",
    "sales.view_own",
    "stock.stock_list",
    "inventory.product_list",
    "product.view",
    "inventory.view",
  ],
  ACCOUNTS: [
    "dashboard.view",
    "accounts.overview",
    "accounts.manage",
    "accounts.view",
    "accounts.financial_accounts",
    "accounts.fund_transfer",
    "accounts.transaction_history",
    "accounts.supplier_due",
    "accounts.payment_sales",
    "accounts.product_sales",
    "accounts.reports",
    "expenses.list",
    "expenses.pay",
    "expenses.history",
    "accounts.expenses",
    "employee.view",
    "salary.manage",
    "salary.history",
    "salary.deductions",
    "accounts.salaries",
    "supplier.view",
    "supplier.purchase_history",
    "supplier.payments_due",
    "pos.history",
    "reports.view",
    "reports.financial",
    "reports.sales",
  ],
};

export function checkUserPermission(
  user: {
    role?: string;
    permissions?: string[];
    pharmacyRoleName?: string | null;
    customRoleName?: string | null;
  } | null,
  permissionKey: string
): boolean {
  if (!user) return false;

  const role = user.role || "";
  // Super Admin & Company Owner bypass
  if (role === "SUPER_ADMIN" || role === "COMPANY_OWNER") return true;

  // Resolve user permissions with fallback to built-in default role matrix
  const isBranchManager =
    role === "BRANCH_MANAGER" ||
    user.pharmacyRoleName?.toLowerCase().includes("branch manager") ||
    user.customRoleName?.toLowerCase().includes("branch manager");

  const effectiveRoleKey = isBranchManager ? "BRANCH_MANAGER" : role;
  const defaultPerms = DEFAULT_ROLE_PERMISSIONS[effectiveRoleKey] || DEFAULT_ROLE_PERMISSIONS[role] || [];
  const userPerms = (user.permissions && user.permissions.length > 0) ? user.permissions : defaultPerms;

  if (userPerms.includes("*") || userPerms.includes(permissionKey)) {
    return true;
  }

  const aliases = PERMISSION_ALIASES[permissionKey] || [];
  if (aliases.some((alias) => userPerms.includes(alias))) {
    return true;
  }

  return false;
}
