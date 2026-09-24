import { z } from "zod";

export const saleItemInputSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  inventoryId: z.string().optional().nullable(),
  inventoryLocationId: z.string().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
  unitType: z.string().default("PIECE"), // e.g. "TABLET", "STRIP", "BOX", "BOTTLE", "PIECE"
  unitMultiplier: z.number().int().positive().default(1),
  quantity: z.number().int().positive("Quantity must be greater than 0"),
  unitPrice: z.number().nonnegative("Unit price must be positive").optional(),
});

export const createSaleSchema = z.object({
  branchId: z.string().min(1, "Branch ID is required"),
  items: z.array(saleItemInputSchema).min(1, "Must contain at least one item"),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerEmail: z.string().optional().nullable(),
  paymentMethod: z.enum(["CASH", "BKASH", "NAGAD", "BANK", "CARD", "MOBILE", "OTHER"]).default("CASH"),
  financialAccountId: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  transactionRef: z.string().optional().nullable(),
  discount: z.number().nonnegative().default(0),
  discountType: z.enum(["FIXED", "PERCENT"]).default("FIXED"),
  subTotal: z.number().nonnegative().optional(),
  totalAmount: z.number().nonnegative().optional(),
  tax: z.number().nonnegative().default(0),
  paidAmount: z.number().nonnegative().optional(),
  notes: z.string().optional().nullable(),
  prescriptionRef: z.string().optional().nullable(),
  managerApprovedBy: z.string().optional().nullable(),
  localCreatedAt: z.string().optional(),
});

export const refundSaleSchema = z.object({
  reason: z.string().min(1, "Refund reason is required"),
  managerId: z.string().min(1, "Manager authorization is required"),
});

export const voidSaleSchema = z.object({
  reason: z.string().min(1, "Void reason is required"),
  managerId: z.string().min(1, "Manager authorization is required"),
});

export const listSalesQuerySchema = z.object({
  page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 20)),
  branchId: z.string().optional(),
  userId: z.string().optional(),
  status: z.enum(["COMPLETED", "REFUNDED", "VOIDED"]).optional(),
  paymentMethod: z.enum(["CASH", "BKASH", "NAGAD", "BANK", "CARD", "MOBILE", "OTHER"]).optional(),
  financialAccountId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  hasDue: z
    .string()
    .optional()
    .transform((v) => (v === "true" || v === "1" ? true : v === "false" || v === "0" ? false : undefined)),
  paymentStatus: z.enum(["ALL", "PAID", "DUE"]).optional(),
});

export const collectDueSchema = z.object({
  amount: z.number().positive("Collected amount must be greater than 0"),
  paymentMethod: z.enum(["CASH", "BKASH", "NAGAD", "BANK", "CARD", "MOBILE", "OTHER"]).default("CASH"),
  financialAccountId: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  transactionRef: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type RefundSaleInput = z.infer<typeof refundSaleSchema>;
export type VoidSaleInput = z.infer<typeof voidSaleSchema>;
export type ListSalesQuery = z.infer<typeof listSalesQuerySchema>;
export type CollectDueInput = z.infer<typeof collectDueSchema>;
