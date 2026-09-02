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

      // Super Admin and Company Owner automatically bypass checks
      if (role === "SUPER_ADMIN" || role === "COMPANY_OWNER") {
        next();
        return;
      }

      // Security Boundary: CTO and Project Manager can operate delegated platform capabilities,
      // but are strictly barred from root destruction, ownership transfer, or altering Super Admin.
      if (["CTO", "PROJECT_MANAGER"].includes(role)) {
        if (
          permissionString.startsWith("platform.destroy") ||
          permissionString.startsWith("platform.owner") ||
          permissionString.startsWith("platform.super_admin") ||
          permissionString.startsWith("platform.transfer_ownership")
        ) {
          res.status(403).json({
            success: false,
            message: "Forbidden - CTO/Project Manager cannot execute root Super Admin actions or alter Super Admin authority.",
          });
          return;
        }
      }

      // Check DB RolePermission first
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

      // If not found in DB, check default matrix
      const defaultPerms = DEFAULT_ROLE_PERMISSIONS[role] || [];
      if (defaultPerms.includes(permissionString) || defaultPerms.includes("*")) {
        next();
        return;
      }

      res.status(403).json({
        success: false,
        message: `Forbidden - Missing permission: ${permissionString}`,
      });
    } catch (err) {
      console.error("Permission Check Error:", err);
      res.status(500).json({ success: false, message: "Internal server error during permission check" });
    }
  };
};
