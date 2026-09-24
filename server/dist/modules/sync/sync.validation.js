"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSyncLogsQuerySchema = exports.pullUpdatesQuerySchema = exports.pushStockBatchSchema = exports.offlineStockAdjustmentSchema = exports.pushSalesBatchSchema = exports.offlineSaleEventSchema = exports.offlineSaleItemSchema = void 0;
const zod_1 = require("zod");
exports.offlineSaleItemSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid(),
    inventoryId: zod_1.z.string().uuid().nullable().optional(),
    inventoryLocationId: zod_1.z.string().uuid().nullable().optional(),
    batchNumber: zod_1.z.string().nullable().optional(),
    unitType: zod_1.z.string().optional(),
    unitMultiplier: zod_1.z.number().int().positive().optional(),
    lowestUnitQuantity: zod_1.z.number().int().positive().optional(),
    quantity: zod_1.z.number().int().positive(),
    unitPrice: zod_1.z.number().positive(),
    purchasePrice: zod_1.z.number().nullable().optional(),
    subTotal: zod_1.z.number().positive(),
});
exports.offlineSaleEventSchema = zod_1.z.object({
    localId: zod_1.z.string(), // Edge event ID
    receiptNo: zod_1.z.string().min(3),
    branchId: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    customerName: zod_1.z.string().nullable().optional(),
    customerPhone: zod_1.z.string().nullable().optional(),
    financialAccountId: zod_1.z.string().uuid().nullable().optional(),
    subTotal: zod_1.z.number().nonnegative(),
    discount: zod_1.z.number().nonnegative().default(0),
    tax: zod_1.z.number().nonnegative().default(0),
    totalAmount: zod_1.z.number().nonnegative(),
    paidAmount: zod_1.z.number().nonnegative().optional(),
    dueAmount: zod_1.z.number().nonnegative().optional(),
    changeAmount: zod_1.z.number().nonnegative().optional(),
    paymentMethod: zod_1.z.enum(["CASH", "CARD", "MOBILE", "BKASH", "NAGAD", "BANK", "OTHER"]).default("CASH"),
    status: zod_1.z.enum(["COMPLETED", "REFUNDED", "VOIDED"]).default("COMPLETED"),
    notes: zod_1.z.string().optional(),
    managerApprovedBy: zod_1.z.string().optional(),
    prescriptionRef: zod_1.z.string().optional(),
    localCreatedAt: zod_1.z.string().datetime().or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
    items: zod_1.z.array(exports.offlineSaleItemSchema).min(1),
});
exports.pushSalesBatchSchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid("Invalid branch ID format"),
    sales: zod_1.z.array(exports.offlineSaleEventSchema).min(1, "Must contain at least one sale event"),
});
exports.offlineStockAdjustmentSchema = zod_1.z.object({
    localId: zod_1.z.string(),
    branchId: zod_1.z.string().uuid(),
    productId: zod_1.z.string().uuid(),
    quantityChange: zod_1.z.number().int(),
    type: zod_1.z.enum([
        "PURCHASE",
        "SALE",
        "ADJUSTMENT",
        "TRANSFER_IN",
        "TRANSFER_OUT",
        "DAMAGE",
        "RETURN",
    ]),
    reason: zod_1.z.string().optional(),
    batchNumber: zod_1.z.string().optional(),
    expiryDate: zod_1.z.string().datetime().or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
    localCreatedAt: zod_1.z.string().datetime().or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
});
exports.pushStockBatchSchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid("Invalid branch ID format"),
    adjustments: zod_1.z.array(exports.offlineStockAdjustmentSchema).min(1),
});
exports.pullUpdatesQuerySchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid("Invalid branch ID format"),
    lastSyncedAt: zod_1.z.string().datetime().or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
});
exports.listSyncLogsQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform(v => (v ? parseInt(v, 10) : 1)),
    limit: zod_1.z.string().optional().transform(v => (v ? parseInt(v, 10) : 20)),
    branchId: zod_1.z.string().uuid().optional(),
    status: zod_1.z.enum(["PENDING", "SUCCESS", "FAILED"]).optional(),
    direction: zod_1.z.enum(["CLOUD_TO_BRANCH", "BRANCH_TO_CLOUD"]).optional(),
});
