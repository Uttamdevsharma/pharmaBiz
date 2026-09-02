import { Request, Response, NextFunction } from "express";

export type AllowedRole =
  | "SUPER_ADMIN"
  | "COMPANY_OWNER"
  | "REGIONAL_ADMIN"
  | "BRANCH_MANAGER"
  | "MANAGER"
  | "INVENTORY_EXECUTIVE"
  | "CASHIER"
  | "ACCOUNTS"
  | "AUDITOR"
  | "CTO"
  | "PROJECT_MANAGER";

export const authorize = (allowedRoles: AllowedRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized - User not authenticated" });
      return;
    }

    if (!allowedRoles.includes(req.user.role as AllowedRole)) {
      res.status(403).json({ success: false, message: "Forbidden - Insufficient permissions" });
      return;
    }

    next();
  };
};
