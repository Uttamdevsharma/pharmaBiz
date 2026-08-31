"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAuditLogsQuerySchema = void 0;
const zod_1 = require("zod");
exports.listAuditLogsQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform(v => (v ? parseInt(v, 10) : 1)),
    limit: zod_1.z.string().optional().transform(v => (v ? parseInt(v, 10) : 20)),
    action: zod_1.z.string().optional(),
    userId: zod_1.z.string().uuid().optional(),
    branchId: zod_1.z.string().uuid().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
});
