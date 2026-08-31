import { z } from "zod";

export const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email format").optional(),
  phone: z.string().optional(),
  role: z.enum([
    "COMPANY_OWNER",
    "REGIONAL_ADMIN",
    "BRANCH_MANAGER",
    "CASHIER",
    "AUDITOR",
  ]),
  branchId: z.string().uuid().nullable().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum([
    "COMPANY_OWNER",
    "REGIONAL_ADMIN",
    "BRANCH_MANAGER",
    "CASHIER",
    "AUDITOR",
  ]).optional(),
  branchId: z.string().uuid().nullable().optional(),
  password: z.string().min(6).optional(),
  isActive: z.boolean().optional(),
});

export const listUsersQuerySchema = z.object({
  page: z.union([z.string(), z.number()]).optional().transform(v => (v ? parseInt(String(v), 10) : 1)),
  limit: z.union([z.string(), z.number()]).optional().transform(v => (v ? parseInt(String(v), 10) : 50)),
  search: z.string().optional(),
  role: z.enum([
    "COMPANY_OWNER",
    "REGIONAL_ADMIN",
    "BRANCH_MANAGER",
    "CASHIER",
    "AUDITOR",
  ]).optional(),
  branchId: z.string().optional().transform(v => (v === "" || v === "null" || v === "undefined" ? undefined : v)),
  isActive: z.union([z.string(), z.boolean()]).optional().transform(v => (v === "true" || v === true ? true : v === "false" || v === false ? false : undefined)),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
