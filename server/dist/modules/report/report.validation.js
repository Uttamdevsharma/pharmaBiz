"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vatMisReportSchema = exports.reportDateRangeSchema = void 0;
const zod_1 = require("zod");
exports.reportDateRangeSchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid().optional(),
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
