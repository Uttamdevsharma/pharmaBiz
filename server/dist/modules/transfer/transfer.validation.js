"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTransfersQuerySchema = exports.rejectTransferSchema = exports.createTransferSchema = exports.transferItemInputSchema = void 0;
const zod_1 = require("zod");
exports.transferItemInputSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid("Invalid product ID format"),
    quantity: zod_1.z.number().int().positive("Quantity must be greater than 0"),
});
exports.createTransferSchema = zod_1.z.object({
    fromBranchId: zod_1.z.string().uuid("Invalid source branch ID format"),
    toBranchId: zod_1.z.string().uuid("Invalid destination branch ID format"),
    items: zod_1.z.array(exports.transferItemInputSchema).min(1, "Must transfer at least one item"),
    notes: zod_1.z.string().optional(),
});
exports.rejectTransferSchema = zod_1.z.object({
    reason: zod_1.z.string().min(1, "Rejection reason is required"),
});
exports.listTransfersQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform(v => (v ? parseInt(v, 10) : 1)),
    limit: zod_1.z.string().optional().transform(v => (v ? parseInt(v, 10) : 20)),
    status: zod_1.z.enum(["PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"]).optional(),
    branchId: zod_1.z.string().uuid().optional(),
});
