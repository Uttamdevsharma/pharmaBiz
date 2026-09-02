"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTransactionsQuerySchema = exports.recordTransactionSchema = exports.transferFundsSchema = exports.updateAccountSchema = exports.createAccountSchema = void 0;
const zod_1 = require("zod");
exports.createAccountSchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid("Invalid branch ID"),
    name: zod_1.z.string().min(2, "Account name must be at least 2 characters"),
    type: zod_1.z.enum(["CASH", "BANK", "MOBILE", "CARD_SETTLEMENT", "OTHER"]),
    initialBalance: zod_1.z.number().nonnegative().optional().default(0),
});
exports.updateAccountSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.transferFundsSchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid("Invalid branch ID"),
    sourceAccountId: zod_1.z.string().uuid("Invalid source account ID"),
    destinationAccountId: zod_1.z.string().uuid("Invalid destination account ID"),
    amount: zod_1.z.number().positive("Transfer amount must be greater than 0"),
    reference: zod_1.z.string().optional(),
    note: zod_1.z.string().optional(),
});
exports.recordTransactionSchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid("Invalid branch ID"),
    accountId: zod_1.z.string().uuid("Invalid account ID"),
    amount: zod_1.z.number().positive("Amount must be greater than 0"),
    type: zod_1.z.enum(["INCOME", "EXPENSE", "SALE_PAYMENT", "PURCHASE_PAYMENT", "REFUND"]),
    reference: zod_1.z.string().optional(),
    note: zod_1.z.string().optional(),
});
exports.listTransactionsQuerySchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid().optional(),
    accountId: zod_1.z.string().uuid().optional(),
    type: zod_1.z.enum(["INCOME", "EXPENSE", "TRANSFER", "SALE_PAYMENT", "PURCHASE_PAYMENT", "REFUND"]).optional(),
    startDate: zod_1.z.string().datetime().optional().or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    endDate: zod_1.z.string().datetime().optional().or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    page: zod_1.z.coerce.number().int().positive().optional().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
});
