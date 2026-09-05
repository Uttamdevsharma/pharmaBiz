import { z } from "zod";

export const transferItemInputSchema = z.object({
  productId: z.string().uuid("Valid product ID required"),
  inventoryId: z.string().uuid().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  packageType: z.string().optional().default("PIECE"),
  packageQuantity: z.number().int().min(1).optional().nullable(),
  conversionFactor: z.number().int().min(1).optional().default(1),
  sentQuantity: z.number().int().min(1, "Sent quantity must be at least 1 lowest unit"),
  costPrice: z.number().min(0, "Cost price must be non-negative"),
});

export const createTransferSchema = z.object({
  fromBranchId: z.string().uuid("Valid source branch ID required"),
  toBranchId: z.string().uuid("Valid destination branch ID required"),
  notes: z.string().optional().nullable(),
  // Courier Logistics Information
  courierName: z.string().optional().nullable(),
  courierHub: z.string().optional().nullable(),
  trackingId: z.string().optional().nullable(),
  deliveryPersonName: z.string().optional().nullable(),
  deliveryPersonContact: z.string().optional().nullable(),
  dispatchDate: z.string().optional().nullable(),
  deliveryNote: z.string().optional().nullable(),
  items: z.array(transferItemInputSchema).min(1, "At least one product item must be included in transfer"),
});

export const receiveItemInputSchema = z.object({
  itemId: z.string().uuid("Valid transfer item ID required"),
  receivedQuantity: z.number().int().min(0, "Received quantity must be non-negative"),
  damagedQuantity: z.number().int().min(0).default(0),
  missingQuantity: z.number().int().min(0).default(0),
  notes: z.string().optional().nullable(),
});

export const receiveTransferSchema = z.object({
  items: z.array(receiveItemInputSchema).min(1, "At least one receive item entry required"),
  notes: z.string().optional().nullable(),
});

export const settleTransferSchema = z.object({
  sourceAccountId: z.string().uuid("Valid paying account ID required"),
  destinationAccountId: z.string().uuid("Valid receiving account ID required"),
  amount: z.number().min(0.01, "Settlement amount must be greater than 0"),
  paymentMethod: z.string().default("CASH"),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const listTransfersQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  status: z.string().optional(),
  settlementStatus: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type ReceiveTransferInput = z.infer<typeof receiveTransferSchema>;
export type SettleTransferInput = z.infer<typeof settleTransferSchema>;
export type ListTransfersQuery = z.infer<typeof listTransfersQuerySchema>;
