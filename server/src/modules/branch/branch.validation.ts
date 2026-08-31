import { z } from "zod";

export const createBranchSchema = z.object({
  name: z.string().min(2, "Branch name must be at least 2 characters"),
  location: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

export const updateBranchSchema = z.object({
  name: z.string().min(2).optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
