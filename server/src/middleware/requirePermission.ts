import { Request, Response, NextFunction } from "express";
import { prisma } from "../app/lib/prisma";

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ["*"],
  COMPANY_OWNER: ["*"],
  BRANCH_MANAGER: [
    "product.view",
    "product.create",
    "product.update",
    "inventory.view",
    "inventory.add_stock",
    "inventory.adjust",
    "inventory.batch",
    "inventory.transfer",
    "supplier.view",
    "supplier.manage",
    "sales.view",
    "sales.create",
    "sales.pos",
    "reports.view",
    "reports.sales",
    "reports.stock",
    "reports.revenue",
  ],
  INVENTORY_EXECUTIVE: [
    "product.view",
    "product.create",
    "product.update",
    "inventory.view",
    "inventory.add_stock",
    "inventory.adjust",
    "inventory.batch",
    "inventory.transfer",
    "supplier.view",
    "reports.stock",
  ],
  CASHIER: [
    "sales.pos",
    "sales.create",
    "sales.view_own",
    "product.view",
    "inventory.view",
  ],
  ACCOUNTS: [
    "accounts.view",
    "accounts.manage",
    "accounts.transfer",
    "accounts.reconciliation",
    "accounts.expense",
    "accounts.income",
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
      if (userPerms.includes("*") || userPerms.includes(permissionString)) {
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
        if (directPermissions.includes("*") || directPermissions.includes(permissionString)) {
          next();
          return;
        }

        // Check assigned pharmacy role permissions (Tenant-level custom roles)
        if (dbUser.pharmacyRole && dbUser.pharmacyRole.permissions) {
          const pharmacyRolePermissions: string[] = dbUser.pharmacyRole.permissions || [];
          if (pharmacyRolePermissions.includes("*") || pharmacyRolePermissions.includes(permissionString)) {
            next();
            return;
          }
        }

        // Check assigned custom role permissions (Platform-level custom roles)
        if (dbUser.customRole && dbUser.customRole.permissions) {
          const rolePermissions: string[] = dbUser.customRole.permissions || [];
          if (rolePermissions.includes("*") || rolePermissions.includes(permissionString)) {
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

      // 4. Check static default fallback matrix for legacy roles
      const defaultPerms = DEFAULT_ROLE_PERMISSIONS[role] || [];
      if (defaultPerms.includes(permissionString) || defaultPerms.includes("*")) {
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

