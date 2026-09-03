import { RoleName } from "@prisma/client";

export type AllowedRole =
  | "SUPER_ADMIN"
  | "CTO"
  | "PROJECT_MANAGER"
  | "COMPANY_OWNER"
  | "REGIONAL_ADMIN"
  | "BRANCH_MANAGER"
  | "MANAGER"
  | "INVENTORY_EXECUTIVE"
  | "CASHIER"
  | "ACCOUNTS"
  | "AUDITOR"
  | string;

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  branchId: string | null;
  role: RoleName | AllowedRole;
  customRoleId?: string | null;
  customRoleName?: string | null;
  pharmacyRoleId?: string | null;
  pharmacyRoleName?: string | null;
  permissions?: string[];
  name?: string | null;
  username?: string | null;
  email?: string | null;
}

export interface LoginResponse {
  token: string;
  user: AuthenticatedUser;
}

