import { z } from "zod";

export const RoleEnum = z.enum([
  "SUPER_ADMIN",
  "COMPANY_OWNER",
  "REGIONAL_ADMIN",
  "BRANCH_MANAGER",
  "MANAGER",
  "INVENTORY_EXECUTIVE",
  "CASHIER",
  "ACCOUNTS",
  "AUDITOR",
  "CTO",
  "PROJECT_MANAGER",
]);

export const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email format").optional(),
  phone: z.string().optional(),
  role: z.string().min(1, "Role is required"),
  branchId: z.string().nullable().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.string().optional(),
  branchId: z.string().nullable().optional(),
  password: z.string().min(6).optional(),
  isActive: z.boolean().optional(),
});

export const createPharmacyRoleSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters"),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([]),
});

export const updatePharmacyRoleSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export const updateRolePermissionsSchema = z.object({
  role: z.string(),
  permissions: z.array(z.string()),
});

export const listUsersQuerySchema = z.object({
  page: z.union([z.string(), z.number()]).optional().transform(v => (v ? parseInt(String(v), 10) : 1)),
  limit: z.union([z.string(), z.number()]).optional().transform(v => (v ? parseInt(String(v), 10) : 50)),
  search: z.string().optional(),
  role: z.string().optional(),
  branchId: z.string().optional().transform(v => (v === "" || v === "null" || v === "undefined" ? undefined : v)),
  isActive: z.union([z.string(), z.boolean()]).optional().transform(v => (v === "true" || v === true ? true : v === "false" || v === false ? false : undefined)),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreatePharmacyRoleInput = z.infer<typeof createPharmacyRoleSchema>;
export type UpdatePharmacyRoleInput = z.infer<typeof updatePharmacyRoleSchema>;
export type UpdateRolePermissionsInput = z.infer<typeof updateRolePermissionsSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

