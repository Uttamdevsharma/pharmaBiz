"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTenantsQuerySchema = exports.updateTenantStatusSchema = exports.updatePlanSchema = exports.createPlanSchema = void 0;
const zod_1 = require("zod");
exports.createPlanSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Plan name must be at least 2 characters"),
    tier: zod_1.z.enum(["TRIAL", "STARTER", "GROWTH", "ENTERPRISE"]),
    price: zod_1.z.number().nonnegative("Price must be greater than or equal to 0"),
    billingCycle: zod_1.z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
    maxBranches: zod_1.z.number().int().positive("Max branches must be at least 1"),
    features: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    isActive: zod_1.z.boolean().default(true),
});
exports.updatePlanSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    price: zod_1.z.number().nonnegative().optional(),
    billingCycle: zod_1.z.enum(["MONTHLY", "YEARLY"]).optional(),
    maxBranches: zod_1.z.number().int().positive().optional(),
    features: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.updateTenantStatusSchema = zod_1.z.object({
    isActive: zod_1.z.boolean(),
    reason: zod_1.z.string().optional(),
});
exports.listTenantsQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform(v => (v ? parseInt(v, 10) : 1)),
    limit: zod_1.z.string().optional().transform(v => (v ? parseInt(v, 10) : 100)),
    search: zod_1.z.string().optional(),
    tier: zod_1.z.enum(["TRIAL", "STARTER", "GROWTH", "ENTERPRISE"]).optional(),
    isActive: zod_1.z.string().optional().transform(v => (v === "true" ? true : v === "false" ? false : undefined)),
});
