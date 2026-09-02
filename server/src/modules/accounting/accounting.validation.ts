import { z } from "zod";

export const createAccountSchema = z.object({
  branchId: z.string().uuid("Invalid branch ID"),
  name: z.string().min(2, "Account name must be at least 2 characters"),
  type: z.enum(["CASH", "BANK", "MOBILE", "CARD_SETTLEMENT", "OTHER"]),
  initialBalance: z.number().nonnegative().optional().default(0),
});

export const updateAccountSchema = z.object({
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
});

export const transferFundsSchema = z.object({
  branchId: z.string().uuid("Invalid branch ID"),
  sourceAccountId: z.string().uuid("Invalid source account ID"),
  destinationAccountId: z.string().uuid("Invalid destination account ID"),
  amount: z.number().positive("Transfer amount must be greater than 0"),
  reference: z.string().optional(),
  note: z.string().optional(),
});

export const recordTransactionSchema = z.object({
  branchId: z.string().uuid("Invalid branch ID"),
  accountId: z.string().uuid("Invalid account ID"),
  amount: z.number().positive("Amount must be greater than 0"),
  type: z.enum(["INCOME", "EXPENSE", "SALE_PAYMENT", "PURCHASE_PAYMENT", "REFUND"]),
  reference: z.string().optional(),
  note: z.string().optional(),
});

export const listTransactionsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER", "SALE_PAYMENT", "PURCHASE_PAYMENT", "REFUND"]).optional(),
  startDate: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  endDate: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type TransferFundsInput = z.infer<typeof transferFundsSchema>;
export type RecordTransactionInput = z.infer<typeof recordTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
