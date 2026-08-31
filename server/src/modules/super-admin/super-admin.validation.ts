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

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type UpdateTenantStatusInput = z.infer<typeof updateTenantStatusSchema>;
export type ListTenantsQuery = z.infer<typeof listTenantsQuerySchema>;
