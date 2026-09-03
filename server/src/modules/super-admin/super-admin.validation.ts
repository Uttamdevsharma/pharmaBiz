import { z } from "zod";

export const createPlanSchema = z.object({
  name: z.string().min(2, "Plan name must be at least 2 characters"),
  tier: z.enum(["TRIAL", "STARTER", "GROWTH", "ENTERPRISE"]),
  price: z.number().nonnegative("Price must be greater than or equal to 0"),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
  maxBranches: z.number().int().positive("Max branches must be at least 1"),
  features: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().default(true),
});

export const updatePlanSchema = z.object({
  name: z.string().min(2).optional(),
  price: z.number().nonnegative().optional(),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).optional(),
  maxBranches: z.number().int().positive().optional(),
  features: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().optional(),
});

export const updateTenantStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().optional(),
});

export const listTenantsQuerySchema = z.object({
  page: z.string().optional().transform(v => (v ? parseInt(v, 10) : 1)),
  limit: z.string().optional().transform(v => (v ? parseInt(v, 10) : 100)),
  search: z.string().optional(),
  tier: z.enum(["TRIAL", "STARTER", "GROWTH", "ENTERPRISE"]).optional(),
  isActive: z.string().optional().transform(v => (v === "true" ? true : v === "false" ? false : undefined)),
});

export const createRoleSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters"),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([]),
});

export const updateRoleSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters").optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export const createPlatformStaffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.string().min(2, "Role is required"),
  permissions: z.array(z.string()).default([]),
});

export const updatePlatformStaffSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(6).optional(),
  role: z.string().min(2).optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const updatePlatformRolePermissionsSchema = z.object({
  role: z.string().min(2),
  permissions: z.array(z.string()),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type UpdateTenantStatusInput = z.infer<typeof updateTenantStatusSchema>;
export type ListTenantsQuery = z.infer<typeof listTenantsQuerySchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type CreatePlatformStaffInput = z.infer<typeof createPlatformStaffSchema>;
export type UpdatePlatformStaffInput = z.infer<typeof updatePlatformStaffSchema>;
export type UpdatePlatformRolePermissionsInput = z.infer<typeof updatePlatformRolePermissionsSchema>;

