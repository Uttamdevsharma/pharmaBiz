import { z } from "zod";

export const inwardStockSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  productId: z.string().min(1, "Product is required"),
  supplierId: z.string().optional().nullable(),
  contactPersonId: z.string().optional().nullable(),
  contactPersonName: z.string().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  mfgDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  packageType: z.string().optional().nullable().default("Medicine"),
  receivingUnit: z.enum(["CARTON", "BOX"]).optional().default("CARTON"),
  cartonsReceived: z.number().int().nonnegative().optional().nullable(),
  boxesReceived: z.number().int().nonnegative().optional().nullable(),
  cartonQuantity: z.number().int().nonnegative().optional().nullable(),
  boxesPerCarton: z.number().int().nonnegative().optional().nullable(),
  boxQuantity: z.number().int().nonnegative().optional().nullable(),
  stripsPerBox: z.number().int().nonnegative().optional().nullable(),
  tabletsPerStrip: z.number().int().nonnegative().optional().nullable(),
  quantity: z.number().int().positive("Calculated quantity must be at least 1"),
  purchasePrice: z.number().nonnegative().optional().nullable(),
  sellingPrice: z.number().nonnegative().optional().nullable(),
  boxPurchasePrice: z.number().nonnegative().optional().nullable(),
  boxSellingPrice: z.number().nonnegative().optional().nullable(),
  shelfLocation: z.string().optional().nullable(),
  paidAmount: z.number().nonnegative().optional().default(0),
  financialAccountId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  receivedDate: z.string().optional().nullable(),
  invoiceNo: z.string().optional().nullable(),
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
    "ALLOCATION",
    "LOCATION_TRANSFER"
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
  inventoryId: z.string().optional(),
  batchNumber: z.string().optional(),
  locationId: z.string().optional(),
  type: z.enum([
    "PURCHASE",
    "SALE",
    "ADJUSTMENT",
    "TRANSFER_IN",
    "TRANSFER_OUT",
    "DAMAGE",
    "RETURN",
    "ALLOCATION",
    "LOCATION_TRANSFER"
  ]).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const inventoryAlertsQuerySchema = z.object({
  branchId: z.string().optional(),
  daysThreshold: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 30)),
});

export const allocateStockSchema = z.object({
  inventoryId: z.string().min(1, "Inventory/Batch ID is required"),
  rackId: z.string().optional().nullable(),
  shelfId: z.string().optional().nullable(),
  binId: z.string().optional().nullable(),
  rack: z.string().optional().nullable(),
  shelf: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
  quantity: z.number().int().positive("Quantity must be greater than 0"),
  allocationSource: z.enum(["FROM_CARTON", "CARTON", "LOOSE_BOX", "LOOSE_STRIP", "LOOSE_TABLET", "AUTO"]).optional().default("AUTO"),
  packagingUnit: z.string().optional().nullable(),
  cartonsAllocated: z.number().int().nonnegative().optional().nullable(),
  boxesAllocated: z.number().int().nonnegative().optional().nullable(),
  stripsAllocated: z.number().int().nonnegative().optional().nullable(),
  tabletsAllocated: z.number().int().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const moveStockSchema = z.object({
  fromLocationId: z.string().min(1, "Source Location ID is required"),
  rackId: z.string().optional().nullable(),
  shelfId: z.string().optional().nullable(),
  binId: z.string().optional().nullable(),
  rack: z.string().optional().nullable(),
  shelf: z.string().optional().nullable(),
  bin: z.string().optional().nullable(),
  quantity: z.number().int().positive("Quantity must be greater than 0"),
  notes: z.string().optional().nullable(),
});

export const removeExpiredStockSchema = z.object({
  branchId: z.string().min(1, "Branch ID is required"),
  inventoryId: z.string().min(1, "Inventory/Batch ID is required"),
  source: z.enum(["BULK", "LOCATION"]),
  locationId: z.string().optional().nullable(),
  quantity: z.number().int().positive("Quantity must be greater than 0"),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const posBatchQuerySchema = z.object({
  branchId: z.string().min(1, "Branch ID is required"),
  productId: z.string().min(1, "Product ID is required"),
});

export type PosBatchQuery = z.infer<typeof posBatchQuerySchema>;

export type InwardStockInput = z.infer<typeof inwardStockSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>;
export type InventoryAlertsQuery = z.infer<typeof inventoryAlertsQuerySchema>;
export type AllocateStockInput = z.infer<typeof allocateStockSchema>;
export type MoveStockInput = z.infer<typeof moveStockSchema>;
export type RemoveExpiredStockInput = z.infer<typeof removeExpiredStockSchema>;
