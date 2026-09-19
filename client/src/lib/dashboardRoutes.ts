import { OwnerModule } from "@/components/dashboard/DashboardSidebar";

/**
 * Maps each OwnerModule to a clean, human-friendly URL path under /dashboard
 */
export const MODULE_TO_PATH: Record<OwnerModule, string> = {
  // Overview
  overview: "/dashboard",

  // Sales & POS
  pos: "/dashboard/pos",
  pos_sale: "/dashboard/pos",
  pos_history: "/dashboard/pos/history",
  pos_vat: "/dashboard/pos/vat",

  // Accounts & Finance
  accounts: "/dashboard/accounts",
  acc_overview: "/dashboard/accounts",
  acc_financial_accounts: "/dashboard/accounts/financial",
  acc_fund_transfer: "/dashboard/accounts/transfer",
  acc_transaction_history: "/dashboard/accounts/transactions",
  acc_expenses: "/dashboard/expenses",
  acc_salaries: "/dashboard/salary",

  // Expenses & Bills
  exp_list: "/dashboard/expenses/list",
  exp_pay: "/dashboard/expenses/pay",
  exp_history: "/dashboard/expenses/history",
  exp_recurring: "/dashboard/expenses/recurring",
  exp_monthly: "/dashboard/expenses/monthly",
  exp_settings: "/dashboard/expenses/settings",

  // Salary & Attendance
  sal_employees: "/dashboard/salary/employees",
  sal_attendance: "/dashboard/salary/attendance",
  sal_offdays: "/dashboard/salary/offdays",
  sal_deduction_rules: "/dashboard/salary/deductions",
  sal_management: "/dashboard/salary/management",
  sal_history: "/dashboard/salary/history",
  employee_details: "/dashboard/salary/employees/details",
  staff_salary_history: "/dashboard/salary/staff-history",

  // Inventory & Products
  inv_add_product: "/dashboard/inventory/add-product",
  inv_product_list: "/dashboard/inventory/products",
  inv_variants: "/dashboard/inventory/variants",
  inv_expired_products: "/dashboard/inventory/expired",

  // Categories
  cat_create: "/dashboard/categories/create",
  cat_list: "/dashboard/categories",

  // Stock Management
  stock_add_stock: "/dashboard/stock/add",
  stock_stock_list: "/dashboard/stock",
  stock_stock_history: "/dashboard/stock/history",
  stock_stock_allocation: "/dashboard/stock/allocation",
  stock_allocation_history: "/dashboard/stock/allocation-history",
  stock_transfer_stock: "/dashboard/stock/transfer",
  stock_transfer_history: "/dashboard/stock/transfer-history",
  stock_stock_receive: "/dashboard/stock/receive",
  stock_inspection: "/dashboard/stock/inspection",
  stock_damaged_products: "/dashboard/stock/damaged",

  // Racks & Locations
  loc_create_rack: "/dashboard/locations/create-rack",
  loc_rack_list: "/dashboard/locations/racks",

  // Suppliers & Procurement
  sup_create_supplier: "/dashboard/suppliers/create",
  sup_suppliers: "/dashboard/suppliers",
  sup_purchase_history: "/dashboard/suppliers/purchases",
  sup_payments_due: "/dashboard/suppliers/payments-due",

  // Branches & Staff & Permissions
  branches: "/dashboard/branches",
  staff: "/dashboard/staff",
  staff_create: "/dashboard/staff/create",
  create_role: "/dashboard/staff/roles/create",
  permission_assignment: "/dashboard/staff/permissions",
  roles: "/dashboard/staff/roles",

  // Reports, Profile & System Settings
  reports: "/dashboard/reports",
  profile: "/dashboard/profile",
  subscription: "/dashboard/subscription",
  settings: "/dashboard/settings",
  change_password: "/dashboard/settings/password",
};

/**
 * Build reverse map for fast path to module lookup
 */
const PATH_TO_MODULE_MAP: Record<string, OwnerModule> = {};

// Populate direct paths
for (const [moduleKey, path] of Object.entries(MODULE_TO_PATH)) {
  const mod = moduleKey as OwnerModule;
  if (!PATH_TO_MODULE_MAP[path]) {
    PATH_TO_MODULE_MAP[path] = mod;
  }
}

// Add canonical aliases so both /dashboard/pos and /dashboard/pos_sale work
PATH_TO_MODULE_MAP["/dashboard/overview"] = "overview";
PATH_TO_MODULE_MAP["/dashboard/inventory"] = "inv_product_list";
PATH_TO_MODULE_MAP["/dashboard/sales"] = "pos";

/**
 * Converts an OwnerModule to a clean URL path
 */
export function getPathFromModule(module: OwnerModule): string {
  return MODULE_TO_PATH[module] || "/dashboard";
}

/**
 * Resolves the matching OwnerModule from a URL pathname
 */
export function getModuleFromPathname(
  pathname: string,
  userRole?: string
): OwnerModule {
  if (!pathname || pathname === "/dashboard" || pathname === "/dashboard/") {
    return getDefaultModuleForRole(userRole);
  }

  // Normalize path (strip trailing slash)
  const normalizedPath = pathname.replace(/\/+$/, "");

  // 1. Check exact match in pre-built map
  if (PATH_TO_MODULE_MAP[normalizedPath]) {
    return PATH_TO_MODULE_MAP[normalizedPath];
  }

  // 2. Direct module name in path check (e.g. /dashboard/stock_stock_list)
  const segments = normalizedPath.split("/").filter(Boolean);
  if (segments.length >= 2 && segments[0] === "dashboard") {
    const candidateModule = segments[segments.length - 1] as OwnerModule;
    if (candidateModule in MODULE_TO_PATH) {
      return candidateModule;
    }
  }

  // 3. Prefix matching for sub-paths (e.g., /dashboard/stock/...)
  for (const [path, mod] of Object.entries(PATH_TO_MODULE_MAP)) {
    if (path !== "/dashboard" && normalizedPath.startsWith(path)) {
      return mod;
    }
  }

  return getDefaultModuleForRole(userRole);
}

/**
 * Default fallback module based on the user's role
 */
export function getDefaultModuleForRole(role?: string): OwnerModule {
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
