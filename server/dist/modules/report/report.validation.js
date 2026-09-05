"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardQuerySchema = exports.vatMisReportSchema = exports.reportDateRangeSchema = void 0;
const zod_1 = require("zod");
exports.reportDateRangeSchema = zod_1.z.object({
    branchId: zod_1.z.string().optional().transform(v => (v === "" || v === "null" || v === "undefined" || v === "all" ? undefined : v)),
    userId: zod_1.z.string().optional().transform(v => (v === "" || v === "null" || v === "undefined" || v === "all" ? undefined : v)),
    paymentMethod: zod_1.z.enum(["CASH", "CARD", "MOBILE", "ALL"]).optional().transform(v => (v === "ALL" ? undefined : v)),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
});
exports.vatMisReportSchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid().optional(),
    month: zod_1.z.string().optional(), // YYYY-MM
    year: zod_1.z.string().optional().transform(v => (v ? parseInt(v, 10) : new Date().getFullYear())),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
});
exports.dashboardQuerySchema = zod_1.z.object({
    branchId: zod_1.z.string().optional().transform(v => (v === "" || v === "null" || v === "undefined" || v === "all" ? undefined : v)),
    period: zod_1.z.enum(["today", "yesterday", "7d", "30d", "custom", "all"]).optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
});
