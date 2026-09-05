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
  address: z.string().optional(),
  
  // Regulatory document & license numbers
  nidNumber: z.string().min(4, "NID number is required"),
  nidFrontDocument: z.string().min(1, "NID front document is required").optional(),
  nidBackDocument: z.string().min(1, "NID back document is required").optional(),
  nidDocument: z.string().optional(), // Fallback / single doc support

  tradeLicenseNumber: z.string().min(4, "Trade license number is required"),
  tradeLicenseFrontDocument: z.string().min(1, "Trade license front document is required").optional(),
  tradeLicenseBackDocument: z.string().optional(),
  tradeLicenseDocument: z.string().optional(),

  drugLicenseNumber: z.string().min(4, "Drug license number is required"),
  drugLicenseFrontDocument: z.string().min(1, "Drug license front document is required").optional(),
  drugLicenseBackDocument: z.string().optional(),
  drugLicenseDocument: z.string().optional(),

  planId: z.string().optional(),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).optional().default("MONTHLY"),
});

export type RegisterOwnerRequest = z.infer<typeof registerOwnerSchema>;

export const verifyOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otpCode: z.string().min(4, "OTP code must be at least 4-6 digits"),
});

export type VerifyOtpRequest = z.infer<typeof verifyOtpSchema>;

export const resendOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type ResendOtpRequest = z.infer<typeof resendOtpSchema>;
