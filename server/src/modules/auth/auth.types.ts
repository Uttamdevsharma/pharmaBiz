import { RoleName } from "@prisma/client";

export type AllowedRole =
  | "SUPER_ADMIN"
  | "COMPANY_OWNER"
  | "REGIONAL_ADMIN"
  | "BRANCH_MANAGER"
  | "CASHIER"
  | "AUDITOR";

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  branchId: string | null;
  role: RoleName | AllowedRole;
  name?: string | null;
  username?: string | null;
  email?: string | null;
}

export interface LoginResponse {
  token: string;
  user: AuthenticatedUser;
}
