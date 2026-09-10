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
  phone?: string | null;
  avatarUrl?: string | null;
  verificationStatus?: string | null;
  rejectionReason?: string | null;
  requiresOtp?: boolean;
  paymentRequired?: boolean;
  tenant?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    logoPublicId?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
}

export interface LoginResponse {
  token: string;
  user: AuthenticatedUser;
  verificationStatus?: string | null;
  requiresOtp?: boolean;
  paymentRequired?: boolean;
  rejectionReason?: string | null;
  subscriptionId?: string | null;
}

