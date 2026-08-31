import { z } from "zod";

export const transferItemInputSchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
  quantity: z.number().int().positive("Quantity must be greater than 0"),
});

export const createTransferSchema = z.object({
  fromBranchId: z.string().uuid("Invalid source branch ID format"),
  toBranchId: z.string().uuid("Invalid destination branch ID format"),
  items: z.array(transferItemInputSchema).min(1, "Must transfer at least one item"),
  notes: z.string().optional(),
});

export const rejectTransferSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required"),
});

export const listTransfersQuerySchema = z.object({
  page: z.string().optional().transform(v => (v ? parseInt(v, 10) : 1)),
  limit: z.string().optional().transform(v => (v ? parseInt(v, 10) : 20)),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"]).optional(),
  branchId: z.string().uuid().optional(),
});

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type RejectTransferInput = z.infer<typeof rejectTransferSchema>;
export type ListTransfersQuery = z.infer<typeof listTransfersQuerySchema>;
