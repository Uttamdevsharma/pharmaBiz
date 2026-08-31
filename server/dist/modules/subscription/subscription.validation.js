"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelSubscriptionSchema = exports.changePlanSchema = exports.subscribeSchema = void 0;
const zod_1 = require("zod");
exports.subscribeSchema = zod_1.z.object({
    planId: zod_1.z.string().uuid("Invalid plan ID format"),
    billingCycle: zod_1.z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
    autoRenew: zod_1.z.boolean().default(false),
});
exports.changePlanSchema = zod_1.z.object({
    newPlanId: zod_1.z.string().uuid("Invalid new plan ID format"),
});
exports.cancelSubscriptionSchema = zod_1.z.object({
    reason: zod_1.z.string().optional(),
});
