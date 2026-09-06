"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disburseSalarySchema = exports.setSalaryConfigSchema = exports.listExpensesQuerySchema = exports.recordExpensePaymentSchema = exports.updateRecurringExpenseSchema = exports.createRecurringExpenseSchema = exports.listTransactionsQuerySchema = exports.recordTransactionSchema = exports.transferFundsSchema = exports.updateAccountSchema = exports.createAccountSchema = void 0;
const zod_1 = require("zod");
exports.createAccountSchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid("Invalid branch ID"),
    name: zod_1.z.string().min(2, "Account name must be at least 2 characters"),
    type: zod_1.z.enum(["CASH", "BANK", "BKASH", "NAGAD", "MOBILE", "CARD_SETTLEMENT", "OTHER"]),
    accountNumber: zod_1.z.string().optional().nullable(),
    bankName: zod_1.z.string().optional().nullable(),
    branchName: zod_1.z.string().optional().nullable(),
    routingNumber: zod_1.z.string().optional().nullable(),
    isDefault: zod_1.z.boolean().optional().default(false),
    description: zod_1.z.string().optional().nullable(),
    initialBalance: zod_1.z.number().nonnegative().optional().default(0),
});
exports.updateAccountSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    accountNumber: zod_1.z.string().optional().nullable(),
    bankName: zod_1.z.string().optional().nullable(),
    branchName: zod_1.z.string().optional().nullable(),
    routingNumber: zod_1.z.string().optional().nullable(),
    isDefault: zod_1.z.boolean().optional(),
    description: zod_1.z.string().optional().nullable(),
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
// Recurring Bill / Expense Config Schema
exports.createRecurringExpenseSchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid("Invalid branch ID"),
    category: zod_1.z.enum(["SHOP_RENT", "ELECTRICITY_BILL", "INTERNET_BILL", "SECURITY_GUARD", "MAINTENANCE", "EMPLOYEE_SALARY", "OTHER"]).optional().default("OTHER"),
    title: zod_1.z.string().min(1, "Bill name is required"),
    estimatedAmount: zod_1.z.number().nonnegative().optional().default(0),
    dueDay: zod_1.z.number().int().min(1).max(31).optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});
exports.updateRecurringExpenseSchema = zod_1.z.object({
    category: zod_1.z.enum(["SHOP_RENT", "ELECTRICITY_BILL", "INTERNET_BILL", "SECURITY_GUARD", "MAINTENANCE", "EMPLOYEE_SALARY", "OTHER"]).optional(),
    title: zod_1.z.string().min(1, "Bill name is required").optional(),
    estimatedAmount: zod_1.z.number().nonnegative().optional(),
    dueDay: zod_1.z.number().int().min(1).max(31).optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
    isActive: zod_1.z.boolean().optional(),
});
// Actual Monthly Expense Payment Record Schema
exports.recordExpensePaymentSchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid("Invalid branch ID"),
    financialAccountId: zod_1.z.string().uuid("Invalid financial account ID"),
    recurringConfigId: zod_1.z.string().uuid().optional().nullable().or(zod_1.z.literal("")),
    category: zod_1.z.enum(["SHOP_RENT", "ELECTRICITY_BILL", "INTERNET_BILL", "SECURITY_GUARD", "MAINTENANCE", "EMPLOYEE_SALARY", "OTHER"]).optional().default("OTHER"),
    title: zod_1.z.string().min(1, "Expense title is required"),
    expenseMonth: zod_1.z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format must be YYYY-MM"),
    amount: zod_1.z.number().positive("Amount must be greater than 0"),
    voucherNo: zod_1.z.string().optional().nullable(),
    reference: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
    paymentDate: zod_1.z.string().optional(), // ISO date string optional, defaults to now
});
exports.listExpensesQuerySchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid().optional().or(zod_1.z.literal("")),
    category: zod_1.z.enum(["SHOP_RENT", "ELECTRICITY_BILL", "INTERNET_BILL", "SECURITY_GUARD", "MAINTENANCE", "EMPLOYEE_SALARY", "OTHER"]).optional().or(zod_1.z.literal("")),
    recurringConfigId: zod_1.z.string().uuid().optional().or(zod_1.z.literal("")),
    financialAccountId: zod_1.z.string().uuid().optional().or(zod_1.z.literal("")),
    expenseMonth: zod_1.z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional().or(zod_1.z.literal("")),
    startDate: zod_1.z.string().optional().or(zod_1.z.literal("")),
    endDate: zod_1.z.string().optional().or(zod_1.z.literal("")),
    page: zod_1.z.coerce.number().int().positive().optional().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(500).optional().default(100),
});
// Employee Salary Structure Config Schema
exports.setSalaryConfigSchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid("Invalid branch ID"),
    userId: zod_1.z.string().uuid("Invalid user/employee ID"),
    baseSalary: zod_1.z.number().nonnegative("Base salary cannot be negative"),
    allowances: zod_1.z.number().nonnegative().optional().default(0),
    deductions: zod_1.z.number().nonnegative().optional().default(0),
    paymentMethod: zod_1.z.string().optional().nullable(),
    paymentDetails: zod_1.z.string().optional().nullable(),
    effectiveDate: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});
// Monthly Salary Disbursement Payment Schema
exports.disburseSalarySchema = zod_1.z.object({
    branchId: zod_1.z.string().uuid("Invalid branch ID"),
    userId: zod_1.z.string().uuid("Invalid employee ID"),
    financialAccountId: zod_1.z.string().uuid("Invalid financial account ID"),
    month: zod_1.z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format must be YYYY-MM"),
    paidAmount: zod_1.z.number().positive("Payment amount must be greater than 0"),
    paymentRef: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});
