"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.changePasswordSchema = exports.listUsersQuerySchema = exports.updateRolePermissionsSchema = exports.updatePharmacyRoleSchema = exports.createPharmacyRoleSchema = exports.updateUserSchema = exports.createUserSchema = exports.RoleEnum = void 0;
const zod_1 = require("zod");
exports.RoleEnum = zod_1.z.enum([
    "SUPER_ADMIN",
    "COMPANY_OWNER",
    "REGIONAL_ADMIN",
    "BRANCH_MANAGER",
    "MANAGER",
    "INVENTORY_EXECUTIVE",
    "CASHIER",
    "ACCOUNTS",
    "AUDITOR",
    "CTO",
    "PROJECT_MANAGER",
]);
exports.createUserSchema = zod_1.z.object({
    username: zod_1.z.string().min(3, "Username must be at least 3 characters").optional(),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
    name: zod_1.z.string().min(2, "Name must be at least 2 characters").optional(),
    email: zod_1.z.string().email("Invalid email format").optional(),
    phone: zod_1.z.string().optional(),
    role: zod_1.z.string().min(1, "Role is required"),
    branchId: zod_1.z.string().nullable().optional(),
});
exports.updateUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    role: zod_1.z.string().optional(),
    branchId: zod_1.z.string().nullable().optional(),
    password: zod_1.z.string().min(6).optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.createPharmacyRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Role name must be at least 2 characters"),
    description: zod_1.z.string().optional(),
    permissions: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.updatePharmacyRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    description: zod_1.z.string().optional(),
    permissions: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.updateRolePermissionsSchema = zod_1.z.object({
    role: zod_1.z.string(),
    permissions: zod_1.z.array(zod_1.z.string()),
});
exports.listUsersQuerySchema = zod_1.z.object({
    page: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional().transform(v => (v ? parseInt(String(v), 10) : 1)),
    limit: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional().transform(v => (v ? parseInt(String(v), 10) : 50)),
    search: zod_1.z.string().optional(),
    role: zod_1.z.string().optional(),
    branchId: zod_1.z.string().optional().transform(v => (v === "" || v === "null" || v === "undefined" ? undefined : v)),
    isActive: zod_1.z.union([zod_1.z.string(), zod_1.z.boolean()]).optional().transform(v => (v === "true" || v === true ? true : v === "false" || v === false ? false : undefined)),
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, "Current password is required"),
    newPassword: zod_1.z.string().min(6, "New password must be at least 6 characters"),
});
exports.updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    phone: zod_1.z.string().optional().nullable(),
    email: zod_1.z.string().email().optional().nullable(),
    avatarUrl: zod_1.z.string().optional().nullable(),
});
