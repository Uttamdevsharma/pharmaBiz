"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = exports.PERMISSION_ALIASES = exports.DEFAULT_ROLE_PERMISSIONS = void 0;
const prisma_1 = require("../app/lib/prisma");
exports.DEFAULT_ROLE_PERMISSIONS = {
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
    CTO: [
        "platform.view",
        "platform.analytics",
        "platform.tenants",
        "platform.plans",
        "platform.support",
        "platform.payments",
        "platform.staff",
        "platform.logs",
        "platform.tech_settings",
    ],
    PROJECT_MANAGER: [
        "platform.view",
        "platform.analytics",
        "platform.tenants",
        "platform.plans",
        "platform.support",
        "platform.payments",
        "platform.staff",
        "platform.logs",
        "platform.tech_settings",
    ],
};
exports.PERMISSION_ALIASES = {
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
    "location.create_rack": ["location.manage", "stock.manage", "inventory.manage"],
    "location.rack_list": ["location.view", "location.manage", "stock.manage", "inventory.manage", "stock.stock_list"],
    "location.manage": ["location.create_rack", "location.rack_list", "stock.manage"],
    "location.view": ["location.rack_list", "location.manage", "stock.manage"],
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
function hasMatchingPermission(userPerms, requiredPerm) {
    if (userPerms.includes("*") || userPerms.includes(requiredPerm)) {
        return true;
    }
    const grantingPerms = exports.PERMISSION_ALIASES[requiredPerm] || [];
    if (grantingPerms.some((granting) => userPerms.includes(granting))) {
        return true;
    }
    return false;
}
const requirePermission = (permissionString) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: "Unauthorized - User not authenticated" });
                return;
            }
            const role = req.user.role;
            // Super Admin automatically bypasses all checks with full root authority
            if (role === "SUPER_ADMIN") {
                next();
                return;
            }
            // Company Owner automatically bypasses all tenant-level checks
            if (role === "COMPANY_OWNER") {
                next();
                return;
            }
            // 1. Check user.permissions from request / JWT payload
            const userPerms = req.user.permissions || [];
            if (hasMatchingPermission(userPerms, permissionString)) {
                next();
                return;
            }
            // 2. Fetch live user & custom / pharmacy roles from database for up-to-date permissions
            const dbUser = await prisma_1.prisma.user.findUnique({
                where: { id: req.user.id },
                include: { customRole: true, pharmacyRole: true },
            });
            if (dbUser) {
                // Check direct user permissions
                const directPermissions = dbUser.permissions || [];
                if (hasMatchingPermission(directPermissions, permissionString)) {
                    next();
                    return;
                }
                // Check assigned pharmacy role permissions (Tenant-level custom roles)
                if (dbUser.pharmacyRole && dbUser.pharmacyRole.permissions) {
                    const pharmacyRolePermissions = dbUser.pharmacyRole.permissions || [];
                    if (hasMatchingPermission(pharmacyRolePermissions, permissionString)) {
                        next();
                        return;
                    }
                }
                // Check assigned custom role permissions (Platform-level custom roles)
                if (dbUser.customRole && dbUser.customRole.permissions) {
                    const rolePermissions = dbUser.customRole.permissions || [];
                    if (hasMatchingPermission(rolePermissions, permissionString)) {
                        next();
                        return;
                    }
                }
            }
            // 3. Check legacy DB RolePermission table
            const rolePerm = await prisma_1.prisma.rolePermission.findUnique({
                where: {
                    role_permission: {
                        role: role,
                        permission: permissionString,
                    },
                },
            });
            if (rolePerm) {
                next();
                return;
            }
            // 4. Check static default fallback matrix for legacy/assigned roles
            const isBranchManager = role === "BRANCH_MANAGER" ||
                req.user.pharmacyRoleName?.toLowerCase().includes("branch manager") ||
                req.user.customRoleName?.toLowerCase().includes("branch manager") ||
                dbUser?.pharmacyRole?.name?.toLowerCase().includes("branch manager") ||
                dbUser?.customRole?.name?.toLowerCase().includes("branch manager");
            const effectiveRoleKey = isBranchManager ? "BRANCH_MANAGER" : role;
            const defaultPerms = exports.DEFAULT_ROLE_PERMISSIONS[effectiveRoleKey] || exports.DEFAULT_ROLE_PERMISSIONS[role] || [];
            if (hasMatchingPermission(defaultPerms, permissionString)) {
                next();
                return;
            }
            res.status(403).json({
                success: false,
                message: `Forbidden - You do not have permission (${permissionString}) to perform this action.`,
            });
        }
        catch (err) {
            console.error("Permission Check Error:", err);
            res.status(500).json({ success: false, message: "Internal server error during permission check" });
        }
    };
};
exports.requirePermission = requirePermission;
