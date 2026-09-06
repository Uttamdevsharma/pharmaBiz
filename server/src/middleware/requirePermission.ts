import { Request, Response, NextFunction } from "express";
import { prisma } from "../app/lib/prisma";

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ["*"],
  COMPANY_OWNER: ["*"],
  BRANCH_MANAGER: [
    "dashboard.view",
    "product.view",
    "product.create",
    "product.update",
    "inventory.manage",
    "inventory.view",
    "inventory.add_stock",
    "inventory.adjust",
    "inventory.batch",
    "inventory.transfer",
    "stock.manage",
    "supplier.view",
    "supplier.manage",
    "suppliers.manage",
    "sales.view",
    "sales.create",
    "sales.pos",
    "pos.manage",
    "pos.history",
    "pos.vat",
    "accounts.manage",
    "accounts.expenses",
    "accounts.salaries",
    "accounts.reports",
    "reports.view",
    "reports.sales",
    "reports.stock",
    "reports.revenue",
    "staff.manage",
    "attendance.manage",
    "salaries.base_salary.edit",
  ],
  INVENTORY_EXECUTIVE: [
    "product.view",
    "product.create",
    "product.update",
    "inventory.manage",
    "inventory.view",
    "inventory.add_stock",
    "inventory.adjust",
    "inventory.batch",
    "inventory.transfer",
    "stock.manage",
    "supplier.view",
    "supplier.manage",
    "suppliers.manage",
    "reports.stock",
  ],
  CASHIER: [
    "sales.pos",
    "sales.create",
    "sales.view_own",
    "pos.manage",
    "pos.history",
    "product.view",
    "inventory.view",
  ],
  ACCOUNTS: [
    "accounts.view",
    "accounts.manage",
    "accounts.transfer",
    "accounts.reconciliation",
    "accounts.expense",
    "accounts.expenses",
    "accounts.salaries",
    "accounts.income",
    "accounts.reports",
    "supplier.view",
    "supplier.payment",
    "reports.view",
    "reports.financial",
    "reports.sales",
    "sales.view",
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

const PERMISSION_ALIASES: Record<string, string[]> = {
  "stock.manage": ["inventory.transfer"],
  "inventory.transfer": ["stock.manage"],
  "inventory.view": ["inventory.manage", "stock.manage"],
  "inventory.add_stock": ["stock.manage", "inventory.manage"],
  "inventory.adjust": ["stock.manage", "inventory.manage"],
  "pos.manage": ["sales.pos", "sales.create"],
  "pos.history": ["sales.view", "sales.history", "pos.manage"],
  "pos.vat": ["pos.manage"],
  "suppliers.manage": ["supplier.manage"],
  "accounts.view": ["accounts.manage", "accounts.reports", "accounts.transfer", "stock.manage", "dashboard.view"],
  "accounts.manage": ["accounts.view", "accounts.transfer"],
  "accounts.transfer": ["accounts.manage", "stock.manage"],
  "accounts.expenses": ["accounts.manage"],
  "accounts.salaries": ["accounts.manage"],
  "staff.manage": ["user.create", "user.view", "user.update", "user.manage"],
  "attendance.manage": ["accounts.salaries", "staff.manage", "accounts.manage"],
  "attendance.offdays": ["attendance.manage", "accounts.salaries"],
};

function hasMatchingPermission(userPerms: string[], requiredPerm: string): boolean {
  if (userPerms.includes("*") || userPerms.includes(requiredPerm)) {
    return true;
  }
  const grantingPerms = PERMISSION_ALIASES[requiredPerm] || [];
  if (grantingPerms.some((granting) => userPerms.includes(granting))) {
    return true;
  }
  return false;
}

export const requirePermission = (permissionString: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
      const dbUser = await (prisma as any).user.findUnique({
        where: { id: req.user.id },
        include: { customRole: true, pharmacyRole: true },
      });

      if (dbUser) {
        // Check direct user permissions
        const directPermissions: string[] = dbUser.permissions || [];
        if (hasMatchingPermission(directPermissions, permissionString)) {
          next();
          return;
        }

        // Check assigned pharmacy role permissions (Tenant-level custom roles)
        if (dbUser.pharmacyRole && dbUser.pharmacyRole.permissions) {
          const pharmacyRolePermissions: string[] = dbUser.pharmacyRole.permissions || [];
          if (hasMatchingPermission(pharmacyRolePermissions, permissionString)) {
            next();
            return;
          }
        }

        // Check assigned custom role permissions (Platform-level custom roles)
        if (dbUser.customRole && dbUser.customRole.permissions) {
          const rolePermissions: string[] = dbUser.customRole.permissions || [];
          if (hasMatchingPermission(rolePermissions, permissionString)) {
            next();
            return;
          }
        }
      }

      // 3. Check legacy DB RolePermission table
      const rolePerm = await (prisma as any).rolePermission.findUnique({
        where: {
          role_permission: {
            role: role as any,
            permission: permissionString,
          },
        },
      });

      if (rolePerm) {
        next();
        return;
      }

      // 4. Check static default fallback matrix for legacy/assigned roles
      const isBranchManager =
        role === "BRANCH_MANAGER" ||
        req.user.pharmacyRoleName?.toLowerCase().includes("branch manager") ||
        req.user.customRoleName?.toLowerCase().includes("branch manager") ||
        dbUser?.pharmacyRole?.name?.toLowerCase().includes("branch manager") ||
        dbUser?.customRole?.name?.toLowerCase().includes("branch manager");

      const effectiveRoleKey = isBranchManager ? "BRANCH_MANAGER" : role;
      const defaultPerms = DEFAULT_ROLE_PERMISSIONS[effectiveRoleKey] || DEFAULT_ROLE_PERMISSIONS[role] || [];
      if (hasMatchingPermission(defaultPerms, permissionString)) {
        next();
        return;
      }

      res.status(403).json({
        success: false,
        message: `Forbidden - You do not have permission (${permissionString}) to perform this action.`,
      });
    } catch (err) {
      console.error("Permission Check Error:", err);
      res.status(500).json({ success: false, message: "Internal server error during permission check" });
    }
  };
};

