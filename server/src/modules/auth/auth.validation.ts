import { z } from "zod";

export const loginSchema = z
  .object({
    username: z.string().optional(),
    email: z.string().optional(),
    password: z.string().min(6, "Password must be at least 6 characters"),
  })
  .refine((data) => data.username || data.email, {
    message: "Either username or email is required",
    path: ["username"],
  });

export type LoginRequest = z.infer<typeof loginSchema>;

export const registerOwnerSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  ownerName: z.string().min(2, "Owner name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(5, "Phone number must be at least 5 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  planId: z.string().optional(),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).optional().default("MONTHLY"),
  address: z.string().optional(),
});

export type RegisterOwnerRequest = z.infer<typeof registerOwnerSchema>;
