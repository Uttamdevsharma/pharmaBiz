"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePlatformRolePermissionsSchema = exports.updatePlatformStaffSchema = exports.createPlatformStaffSchema = exports.batchUpdatePlatformRolePermissionsSchema = exports.updateRoleSchema = exports.createRoleSchema = exports.listTenantsQuerySchema = exports.updateTenantStatusSchema = exports.updatePlanSchema = exports.createPlanSchema = void 0;
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
    datePreset: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
});
exports.createRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Role name is required"),
    description: zod_1.z.string().optional(),
    permissions: zod_1.z.array(zod_1.z.string()).default([]),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Role name is required").optional(),
    description: zod_1.z.string().optional(),
    permissions: zod_1.z.array(zod_1.z.string()).optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.batchUpdatePlatformRolePermissionsSchema = zod_1.z.object({
    matrix: zod_1.z.array(zod_1.z.object({
        roleId: zod_1.z.string(),
        permissions: zod_1.z.array(zod_1.z.string()),
    })),
});
exports.createPlatformStaffSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name must be at least 2 characters"),
    email: zod_1.z.string().email("Invalid email format"),
    username: zod_1.z.string().min(3, "Username must be at least 3 characters").optional(),
    phone: zod_1.z.string().optional(),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
    role: zod_1.z.string().min(2, "Role is required"),
    permissions: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.updatePlatformStaffSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    password: zod_1.z.string().min(6).optional(),
    role: zod_1.z.string().min(2).optional(),
    permissions: zod_1.z.array(zod_1.z.string()).optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.updatePlatformRolePermissionsSchema = zod_1.z.object({
    role: zod_1.z.string().min(2),
    permissions: zod_1.z.array(zod_1.z.string()),
});
