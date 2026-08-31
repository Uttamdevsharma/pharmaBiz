"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryAlertsQuerySchema = exports.listMovementsQuerySchema = exports.updateInventoryItemSchema = exports.adjustStockSchema = exports.inwardStockSchema = void 0;
const zod_1 = require("zod");
exports.inwardStockSchema = zod_1.z.object({
    branchId: zod_1.z.string().min(1, "Branch is required"),
    productId: zod_1.z.string().min(1, "Product is required"),
    supplierId: zod_1.z.string().optional().nullable(),
    batchNumber: zod_1.z.string().optional().nullable(),
    barcode: zod_1.z.string().optional().nullable(),
    mfgDate: zod_1.z.string().optional().nullable(),
    expiryDate: zod_1.z.string().optional().nullable(),
    packageType: zod_1.z.string().optional().nullable().default("Medicine"),
    cartonQuantity: zod_1.z.number().int().nonnegative().optional().nullable(),
    boxQuantity: zod_1.z.number().int().nonnegative().optional().nullable(),
    stripsPerBox: zod_1.z.number().int().nonnegative().optional().nullable(),
    tabletsPerStrip: zod_1.z.number().int().nonnegative().optional().nullable(),
    quantity: zod_1.z.number().int().positive("Calculated quantity must be at least 1"),
    purchasePrice: zod_1.z.number().nonnegative().optional().nullable(),
    sellingPrice: zod_1.z.number().nonnegative().optional().nullable(),
    shelfLocation: zod_1.z.string().optional().nullable(),
    paidAmount: zod_1.z.number().nonnegative().optional().default(0),
    notes: zod_1.z.string().optional().nullable(),
});
exports.adjustStockSchema = zod_1.z.object({
    branchId: zod_1.z.string().min(1, "Branch ID is required"),
    productId: zod_1.z.string().min(1, "Product ID is required"),
    inventoryId: zod_1.z.string().optional().nullable(),
    quantity: zod_1.z.number().int("Quantity must be an integer"), // positive to add, negative to subtract
    type: zod_1.z.enum([
        "PURCHASE",
        "SALE",
        "ADJUSTMENT",
        "TRANSFER_IN",
        "TRANSFER_OUT",
        "DAMAGE",
        "RETURN",
    ]).default("ADJUSTMENT"),
    batchNumber: zod_1.z.string().optional().nullable(),
    expiryDate: zod_1.z.string().optional().nullable(),
    minStockLevel: zod_1.z.number().int().nonnegative().optional(),
    lowStockThreshold: zod_1.z.number().int().nonnegative().optional(),
    reason: zod_1.z.string().optional().nullable(),
});
exports.updateInventoryItemSchema = zod_1.z.object({
    quantity: zod_1.z.number().int().nonnegative().optional(),
    batchNumber: zod_1.z.string().optional().nullable(),
    barcode: zod_1.z.string().optional().nullable(),
    expiryDate: zod_1.z.string().optional().nullable(),
    shelfLocation: zod_1.z.string().optional().nullable(),
    purchasePrice: zod_1.z.number().nonnegative().optional().nullable(),
    sellingPrice: zod_1.z.number().nonnegative().optional().nullable(),
    minStockLevel: zod_1.z.number().int().nonnegative().optional(),
    lowStockThreshold: zod_1.z.number().int().nonnegative().optional(),
});
exports.listMovementsQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
    limit: zod_1.z.string().optional().transform((v) => (v ? parseInt(v, 10) : 20)),
    branchId: zod_1.z.string().optional(),
    productId: zod_1.z.string().optional(),
    type: zod_1.z.enum([
        "PURCHASE",
        "SALE",
        "ADJUSTMENT",
        "TRANSFER_IN",
        "TRANSFER_OUT",
        "DAMAGE",
        "RETURN",
    ]).optional(),
    search: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
});
exports.inventoryAlertsQuerySchema = zod_1.z.object({
    branchId: zod_1.z.string().optional(),
    daysThreshold: zod_1.z.string().optional().transform((v) => (v ? parseInt(v, 10) : 30)),
});
