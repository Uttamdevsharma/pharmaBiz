"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePlatformSettingsSchema = void 0;
const zod_1 = require("zod");
exports.updatePlatformSettingsSchema = zod_1.z.object({
    siteName: zod_1.z.string().min(2).optional(),
    logoUrl: zod_1.z.string().optional(),
    logoPublicId: zod_1.z.string().optional(),
    primaryColor: zod_1.z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid HEX color format").optional(),
    hero: zod_1.z
        .object({
        badge: zod_1.z.string().optional(),
        title: zod_1.z.string().min(3).optional(),
        subtitle: zod_1.z.string().optional(),
        ctaPrimaryText: zod_1.z.string().optional(),
        ctaSecondaryText: zod_1.z.string().optional(),
    })
        .optional(),
    features: zod_1.z
        .array(zod_1.z.object({
        id: zod_1.z.string().optional(),
        title: zod_1.z.string(),
        description: zod_1.z.string(),
        icon: zod_1.z.string().optional(),
    }))
        .optional(),
    howItWorks: zod_1.z
        .array(zod_1.z.object({
        step: zod_1.z.number(),
        title: zod_1.z.string(),
        description: zod_1.z.string(),
    }))
        .optional(),
    contact: zod_1.z
        .object({
        email: zod_1.z.string().email().optional(),
        phone: zod_1.z.string().optional(),
        address: zod_1.z.string().optional(),
        supportHours: zod_1.z.string().optional(),
    })
        .optional(),
    about: zod_1.z
        .object({
        headline: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        stats: zod_1.z.array(zod_1.z.object({ label: zod_1.z.string(), value: zod_1.z.string() })).optional(),
    })
        .optional(),
});
