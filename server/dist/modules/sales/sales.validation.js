"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSalesQuerySchema = exports.voidSaleSchema = exports.refundSaleSchema = exports.createSaleSchema = exports.saleItemInputSchema = void 0;
const zod_1 = require("zod");
exports.saleItemInputSchema = zod_1.z.object({
    productId: zod_1.z.string().min(1, "Product ID is required"),
    inventoryId: zod_1.z.string().optional().nullable(),
    inventoryLocationId: zod_1.z.string().optional().nullable(),
    batchNumber: zod_1.z.string().optional().nullable(),
    unitType: zod_1.z.string().default("PIECE"), // e.g. "TABLET", "STRIP", "BOX", "BOTTLE", "PIECE"
    unitMultiplier: zod_1.z.number().int().positive().default(1),
    quantity: zod_1.z.number().int().positive("Quantity must be greater than 0"),
    unitPrice: zod_1.z.number().nonnegative("Unit price must be positive").optional(),
});
exports.createSaleSchema = zod_1.z.object({
    branchId: zod_1.z.string().min(1, "Branch ID is required"),
    items: zod_1.z.array(exports.saleItemInputSchema).min(1, "Must contain at least one item"),
    customerName: zod_1.z.string().optional().nullable(),
    customerPhone: zod_1.z.string().optional().nullable(),
    customerEmail: zod_1.z.string().optional().nullable(),
    paymentMethod: zod_1.z.enum(["CASH", "BKASH", "NAGAD", "BANK", "CARD", "MOBILE", "OTHER"]).default("CASH"),
    financialAccountId: zod_1.z.string().optional().nullable(),
    bankName: zod_1.z.string().optional().nullable(),
    transactionRef: zod_1.z.string().optional().nullable(),
    discount: zod_1.z.number().nonnegative().default(0),
    discountType: zod_1.z.enum(["FIXED", "PERCENT"]).default("FIXED"),
    tax: zod_1.z.number().nonnegative().default(0),
    paidAmount: zod_1.z.number().nonnegative().optional(),
    notes: zod_1.z.string().optional().nullable(),
    prescriptionRef: zod_1.z.string().optional().nullable(),
    managerApprovedBy: zod_1.z.string().optional().nullable(),
    localCreatedAt: zod_1.z.string().optional(),
});
exports.refundSaleSchema = zod_1.z.object({
    reason: zod_1.z.string().min(1, "Refund reason is required"),
    managerId: zod_1.z.string().min(1, "Manager authorization is required"),
});
exports.voidSaleSchema = zod_1.z.object({
    reason: zod_1.z.string().min(1, "Void reason is required"),
    managerId: zod_1.z.string().min(1, "Manager authorization is required"),
});
exports.listSalesQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
    limit: zod_1.z.string().optional().transform((v) => (v ? parseInt(v, 10) : 20)),
    branchId: zod_1.z.string().optional(),
    userId: zod_1.z.string().optional(),
    status: zod_1.z.enum(["COMPLETED", "REFUNDED", "VOIDED"]).optional(),
    paymentMethod: zod_1.z.enum(["CASH", "BKASH", "NAGAD", "BANK", "CARD", "MOBILE", "OTHER"]).optional(),
    financialAccountId: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
});
