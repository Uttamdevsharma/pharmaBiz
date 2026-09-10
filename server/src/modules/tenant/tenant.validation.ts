import { z } from "zod";

export const updateTenantProfileSchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email format").optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  logoPublicId: z.string().optional(),
});

export type UpdateTenantProfileInput = z.infer<typeof updateTenantProfileSchema>;

