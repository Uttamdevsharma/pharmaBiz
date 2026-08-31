"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerOwnerSchema = exports.loginSchema = void 0;
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
    planId: zod_1.z.string().optional(),
    billingCycle: zod_1.z.enum(["MONTHLY", "YEARLY"]).optional().default("MONTHLY"),
    address: zod_1.z.string().optional(),
});
