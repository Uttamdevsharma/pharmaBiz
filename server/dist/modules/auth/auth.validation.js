"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendOtpSchema = exports.verifyOtpSchema = exports.registerOwnerSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z
    .object({
    username: zod_1.z.string().optional(),
    email: zod_1.z.string().optional(),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
})
    .refine((data) => data.username || data.email, {
    message: "Either username or email is required",
    path: ["username"],
});
exports.registerOwnerSchema = zod_1.z.object({
    companyName: zod_1.z.string().min(2, "Company name must be at least 2 characters"),
    ownerName: zod_1.z.string().min(2, "Owner name must be at least 2 characters"),
    email: zod_1.z.string().email("Invalid email address"),
    phone: zod_1.z.string().min(5, "Phone number must be at least 5 digits"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
    address: zod_1.z.string().optional(),
    // Regulatory document & license numbers
    nidNumber: zod_1.z.string().min(4, "NID number is required"),
    nidFrontDocument: zod_1.z.string().min(1, "NID front document is required").optional(),
    nidBackDocument: zod_1.z.string().min(1, "NID back document is required").optional(),
    nidDocument: zod_1.z.string().optional(), // Fallback / single doc support
    tradeLicenseNumber: zod_1.z.string().min(4, "Trade license number is required"),
    tradeLicenseFrontDocument: zod_1.z.string().min(1, "Trade license front document is required").optional(),
    tradeLicenseBackDocument: zod_1.z.string().optional(),
    tradeLicenseDocument: zod_1.z.string().optional(),
    drugLicenseNumber: zod_1.z.string().min(4, "Drug license number is required"),
    drugLicenseFrontDocument: zod_1.z.string().min(1, "Drug license front document is required").optional(),
    drugLicenseBackDocument: zod_1.z.string().optional(),
    drugLicenseDocument: zod_1.z.string().optional(),
    planId: zod_1.z.string().optional(),
    billingCycle: zod_1.z.enum(["MONTHLY", "YEARLY"]).optional().default("MONTHLY"),
});
exports.verifyOtpSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email address"),
    otpCode: zod_1.z.string().min(4, "OTP code must be at least 4-6 digits"),
});
exports.resendOtpSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email address"),
});
