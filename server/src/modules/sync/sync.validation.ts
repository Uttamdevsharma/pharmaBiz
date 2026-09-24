import { z } from "zod";

export const offlineSaleItemSchema = z.object({
  productId: z.string().uuid(),
  inventoryId: z.string().uuid().nullable().optional(),
  inventoryLocationId: z.string().uuid().nullable().optional(),
  batchNumber: z.string().nullable().optional(),
  unitType: z.string().optional(),
  unitMultiplier: z.number().int().positive().optional(),
  lowestUnitQuantity: z.number().int().positive().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  purchasePrice: z.number().nullable().optional(),
  subTotal: z.number().positive(),
});

export const offlineSaleEventSchema = z.object({
  localId: z.string(), // Edge event ID
  receiptNo: z.string().min(3),
  branchId: z.string().uuid(),
  userId: z.string().uuid(),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  financialAccountId: z.string().uuid().nullable().optional(),
  subTotal: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  tax: z.number().nonnegative().default(0),
  totalAmount: z.number().nonnegative(),
  paidAmount: z.number().nonnegative().optional(),
  dueAmount: z.number().nonnegative().optional(),
  changeAmount: z.number().nonnegative().optional(),
  paymentMethod: z.enum(["CASH", "CARD", "MOBILE", "BKASH", "NAGAD", "BANK", "OTHER"]).default("CASH"),
  status: z.enum(["COMPLETED", "REFUNDED", "VOIDED"]).default("COMPLETED"),
  notes: z.string().optional(),
  managerApprovedBy: z.string().optional(),
  prescriptionRef: z.string().optional(),
  localCreatedAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  items: z.array(offlineSaleItemSchema).min(1),
});

export const pushSalesBatchSchema = z.object({
  branchId: z.string().uuid("Invalid branch ID format"),
  sales: z.array(offlineSaleEventSchema).min(1, "Must contain at least one sale event"),
});

export const offlineStockAdjustmentSchema = z.object({
  localId: z.string(),
  branchId: z.string().uuid(),
  productId: z.string().uuid(),
  quantityChange: z.number().int(),
  type: z.enum([
    "PURCHASE",
    "SALE",
    "ADJUSTMENT",
    "TRANSFER_IN",
    "TRANSFER_OUT",
    "DAMAGE",
    "RETURN",
  ]),
  reason: z.string().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  localCreatedAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
});

export const pushStockBatchSchema = z.object({
  branchId: z.string().uuid("Invalid branch ID format"),
  adjustments: z.array(offlineStockAdjustmentSchema).min(1),
});

export const pullUpdatesQuerySchema = z.object({
  branchId: z.string().uuid("Invalid branch ID format"),
  lastSyncedAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
});

export const listSyncLogsQuerySchema = z.object({
  page: z.string().optional().transform(v => (v ? parseInt(v, 10) : 1)),
  limit: z.string().optional().transform(v => (v ? parseInt(v, 10) : 20)),
  branchId: z.string().uuid().optional(),
  status: z.enum(["PENDING", "SUCCESS", "FAILED"]).optional(),
  direction: z.enum(["CLOUD_TO_BRANCH", "BRANCH_TO_CLOUD"]).optional(),
});

export type PushSalesBatchInput = z.infer<typeof pushSalesBatchSchema>;
export type PushStockBatchInput = z.infer<typeof pushStockBatchSchema>;
export type PullUpdatesQuery = z.infer<typeof pullUpdatesQuerySchema>;
export type ListSyncLogsQuery = z.infer<typeof listSyncLogsQuerySchema>;
