import { z } from "zod";

export const inwardStockSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  productId: z.string().min(1, "Product is required"),
  supplierId: z.string().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  mfgDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  packageType: z.string().optional().nullable().default("Medicine"),
  cartonQuantity: z.number().int().nonnegative().optional().nullable(),
  boxQuantity: z.number().int().nonnegative().optional().nullable(),
  stripsPerBox: z.number().int().nonnegative().optional().nullable(),
  tabletsPerStrip: z.number().int().nonnegative().optional().nullable(),
  quantity: z.number().int().positive("Calculated quantity must be at least 1"),
  purchasePrice: z.number().nonnegative().optional().nullable(),
  sellingPrice: z.number().nonnegative().optional().nullable(),
  shelfLocation: z.string().optional().nullable(),
  paidAmount: z.number().nonnegative().optional().default(0),
  financialAccountId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const adjustStockSchema = z.object({
  branchId: z.string().min(1, "Branch ID is required"),
  productId: z.string().min(1, "Product ID is required"),
  inventoryId: z.string().optional().nullable(),
  quantity: z.number().int("Quantity must be an integer"), // positive to add, negative to subtract
  type: z.enum([
    "PURCHASE",
    "SALE",
    "ADJUSTMENT",
    "TRANSFER_IN",
    "TRANSFER_OUT",
    "DAMAGE",
    "RETURN",
  ]).default("ADJUSTMENT"),
  batchNumber: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  minStockLevel: z.number().int().nonnegative().optional(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  reason: z.string().optional().nullable(),
});

export const updateInventoryItemSchema = z.object({
  quantity: z.number().int().nonnegative().optional(),
  batchNumber: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  shelfLocation: z.string().optional().nullable(),
  purchasePrice: z.number().nonnegative().optional().nullable(),
  sellingPrice: z.number().nonnegative().optional().nullable(),
  minStockLevel: z.number().int().nonnegative().optional(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
});

export const listMovementsQuerySchema = z.object({
  page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 20)),
  branchId: z.string().optional(),
  productId: z.string().optional(),
  type: z.enum([
    "PURCHASE",
    "SALE",
    "ADJUSTMENT",
    "TRANSFER_IN",
    "TRANSFER_OUT",
    "DAMAGE",
    "RETURN",
  ]).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const inventoryAlertsQuerySchema = z.object({
  branchId: z.string().optional(),
  daysThreshold: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 30)),
});

export type InwardStockInput = z.infer<typeof inwardStockSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>;
export type InventoryAlertsQuery = z.infer<typeof inventoryAlertsQuerySchema>;
