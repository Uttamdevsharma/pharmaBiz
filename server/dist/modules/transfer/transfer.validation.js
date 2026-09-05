"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTransfersQuerySchema = exports.settleTransferSchema = exports.receiveTransferSchema = exports.receiveItemInputSchema = exports.createTransferSchema = exports.transferItemInputSchema = void 0;
const zod_1 = require("zod");
exports.transferItemInputSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid("Valid product ID required"),
    inventoryId: zod_1.z.string().uuid().optional().nullable(),
    batchNumber: zod_1.z.string().optional().nullable(),
    expiryDate: zod_1.z.string().optional().nullable(),
    packageType: zod_1.z.string().optional().default("PIECE"),
    packageQuantity: zod_1.z.number().int().min(1).optional().nullable(),
    conversionFactor: zod_1.z.number().int().min(1).optional().default(1),
    sentQuantity: zod_1.z.number().int().min(1, "Sent quantity must be at least 1 lowest unit"),
    costPrice: zod_1.z.number().min(0, "Cost price must be non-negative"),
});
exports.createTransferSchema = zod_1.z.object({
    fromBranchId: zod_1.z.string().uuid("Valid source branch ID required"),
    toBranchId: zod_1.z.string().uuid("Valid destination branch ID required"),
    notes: zod_1.z.string().optional().nullable(),
    items: zod_1.z.array(exports.transferItemInputSchema).min(1, "At least one product item must be included in transfer"),
});
exports.receiveItemInputSchema = zod_1.z.object({
    itemId: zod_1.z.string().uuid("Valid transfer item ID required"),
    receivedQuantity: zod_1.z.number().int().min(0, "Received quantity must be non-negative"),
    damagedQuantity: zod_1.z.number().int().min(0).default(0),
    missingQuantity: zod_1.z.number().int().min(0).default(0),
    notes: zod_1.z.string().optional().nullable(),
});
exports.receiveTransferSchema = zod_1.z.object({
    items: zod_1.z.array(exports.receiveItemInputSchema).min(1, "At least one receive item entry required"),
    notes: zod_1.z.string().optional().nullable(),
});
exports.settleTransferSchema = zod_1.z.object({
    sourceAccountId: zod_1.z.string().uuid("Valid paying account ID required"),
    destinationAccountId: zod_1.z.string().uuid("Valid receiving account ID required"),
    amount: zod_1.z.number().min(0.01, "Settlement amount must be greater than 0"),
    paymentMethod: zod_1.z.string().default("CASH"),
    reference: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});
exports.listTransfersQuerySchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid().optional(),
    status: zod_1.z.string().optional(),
    settlementStatus: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
});
