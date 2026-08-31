"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordSupplierPaymentSchema = exports.listPurchasesQuerySchema = exports.createPurchaseSchema = exports.purchaseItemInputSchema = exports.listSuppliersQuerySchema = exports.updateSupplierSchema = exports.createSupplierSchema = void 0;
const zod_1 = require("zod");
exports.createSupplierSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Company / Supplier name is required"),
    phone: zod_1.z.string().min(5, "Contact phone number is required"),
    email: zod_1.z.string().email("Invalid email format").optional().nullable(),
    address: zod_1.z.string().optional().nullable(),
    company: zod_1.z.string().optional().nullable(),
    contactPerson: zod_1.z.string().optional().nullable(),
});
exports.updateSupplierSchema = exports.createSupplierSchema.partial().extend({
    isActive: zod_1.z.boolean().optional(),
});
exports.listSuppliersQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().default(20),
});
exports.purchaseItemInputSchema = zod_1.z.object({
    productId: zod_1.z.string().min(1, "Product is required"),
    batchNumber: zod_1.z.string().optional().nullable(),
    barcode: zod_1.z.string().optional().nullable(),
    mfgDate: zod_1.z.string().optional().nullable(),
    expiryDate: zod_1.z.string().optional().nullable(),
    packageType: zod_1.z.string().optional().nullable().default("Medicine"),
    cartonQuantity: zod_1.z.number().int().nonnegative().optional().nullable(),
    boxQuantity: zod_1.z.number().int().nonnegative().optional().nullable(),
    stripsPerBox: zod_1.z.number().int().nonnegative().optional().nullable(),
    tabletsPerStrip: zod_1.z.number().int().nonnegative().optional().nullable(),
    quantity: zod_1.z.number().int().positive("Quantity must be at least 1"),
    unitPurchasePrice: zod_1.z.number().nonnegative("Purchase price must be positive"),
    unitSellingPrice: zod_1.z.number().nonnegative("Selling price must be positive"),
    shelfLocation: zod_1.z.string().optional().nullable(),
});
exports.createPurchaseSchema = zod_1.z.object({
    branchId: zod_1.z.string().min(1, "Branch is required"),
    supplierId: zod_1.z.string().optional().nullable(),
    invoiceNo: zod_1.z.string().optional().nullable(),
    purchaseDate: zod_1.z.string().optional(),
    items: zod_1.z.array(exports.purchaseItemInputSchema).min(1, "At least one item is required in purchase"),
    paidAmount: zod_1.z.number().nonnegative().default(0),
    paymentMethod: zod_1.z.string().default("CASH"),
    notes: zod_1.z.string().optional().nullable(),
});
exports.listPurchasesQuerySchema = zod_1.z.object({
    branchId: zod_1.z.string().optional(),
    supplierId: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    paymentStatus: zod_1.z.enum(["PAID", "PARTIAL", "DUE"]).optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().default(20),
});
exports.recordSupplierPaymentSchema = zod_1.z.object({
    amount: zod_1.z.number().positive("Payment amount must be greater than 0"),
    paymentMethod: zod_1.z.string().default("CASH"),
    notes: zod_1.z.string().optional().nullable(),
});
