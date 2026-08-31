"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotificationsQuerySchema = void 0;
const zod_1 = require("zod");
exports.listNotificationsQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform(v => (v ? parseInt(v, 10) : 1)),
    limit: zod_1.z.string().optional().transform(v => (v ? parseInt(v, 10) : 20)),
    type: zod_1.z.enum(["LOW_STOCK", "EXPIRY", "SYNC_FAILURE", "SYSTEM"]).optional(),
    isRead: zod_1.z.string().optional().transform(v => (v === "true" ? true : v === "false" ? false : undefined)),
    branchId: zod_1.z.string().uuid().optional(),
});
