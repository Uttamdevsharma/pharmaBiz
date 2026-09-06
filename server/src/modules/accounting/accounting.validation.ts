import { z } from "zod";

export const createAccountSchema = z.object({
  branchId: z.string().uuid("Invalid branch ID"),
  name: z.string().min(2, "Account name must be at least 2 characters"),
  type: z.enum(["CASH", "BANK", "BKASH", "NAGAD", "MOBILE", "CARD_SETTLEMENT", "OTHER"]),
  accountNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  branchName: z.string().optional().nullable(),
  routingNumber: z.string().optional().nullable(),
  isDefault: z.boolean().optional().default(false),
  description: z.string().optional().nullable(),
  initialBalance: z.number().nonnegative().optional().default(0),
});

export const updateAccountSchema = z.object({
  name: z.string().min(2).optional(),
  accountNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  branchName: z.string().optional().nullable(),
  routingNumber: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const depositFundsSchema = z.object({
  accountId: z.string().uuid("Invalid account ID"),
  amount: z.number().positive("Deposit amount must be greater than 0"),
  description: z.string().optional().nullable(),
});

export type DepositFundsInput = z.infer<typeof depositFundsSchema>;

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

// Recurring Bill / Expense Config Schema
export const createRecurringExpenseSchema = z.object({
  branchId: z.string().uuid("Invalid branch ID"),
  category: z.enum(["SHOP_RENT", "ELECTRICITY_BILL", "INTERNET_BILL", "SECURITY_GUARD", "MAINTENANCE", "EMPLOYEE_SALARY", "OTHER"]).optional().default("OTHER"),
  title: z.string().min(1, "Bill name is required"),
  estimatedAmount: z.number().nonnegative().optional().default(0),
  dueDay: z.number().int().min(1).max(31).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateRecurringExpenseSchema = z.object({
  category: z.enum(["SHOP_RENT", "ELECTRICITY_BILL", "INTERNET_BILL", "SECURITY_GUARD", "MAINTENANCE", "EMPLOYEE_SALARY", "OTHER"]).optional(),
  title: z.string().min(1, "Bill name is required").optional(),
  estimatedAmount: z.number().nonnegative().optional(),
  dueDay: z.number().int().min(1).max(31).optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// Actual Monthly Expense Payment Record Schema
export const recordExpensePaymentSchema = z.object({
  branchId: z.string().uuid("Invalid branch ID"),
  financialAccountId: z.string().uuid("Invalid financial account ID"),
  recurringConfigId: z.string().uuid().optional().nullable().or(z.literal("")),
  category: z.enum(["SHOP_RENT", "ELECTRICITY_BILL", "INTERNET_BILL", "SECURITY_GUARD", "MAINTENANCE", "EMPLOYEE_SALARY", "OTHER"]).optional().default("OTHER"),
  title: z.string().min(1, "Expense title is required"),
  expenseMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format must be YYYY-MM"),
  amount: z.number().positive("Amount must be greater than 0"),
  voucherNo: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  paymentDate: z.string().optional(), // ISO date string optional, defaults to now
});

export const listExpensesQuerySchema = z.object({
  branchId: z.string().uuid().optional().or(z.literal("")),
  category: z.enum(["SHOP_RENT", "ELECTRICITY_BILL", "INTERNET_BILL", "SECURITY_GUARD", "MAINTENANCE", "EMPLOYEE_SALARY", "OTHER"]).optional().or(z.literal("")),
  recurringConfigId: z.string().uuid().optional().or(z.literal("")),
  financialAccountId: z.string().uuid().optional().or(z.literal("")),
  expenseMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(500).optional().default(100),
});

// Employee Salary Structure Config Schema
export const setSalaryConfigSchema = z.object({
  branchId: z.string().uuid("Invalid branch ID"),
  userId: z.string().uuid("Invalid user/employee ID"),
  baseSalary: z.number().nonnegative("Base salary cannot be negative"),
  allowances: z.number().nonnegative().optional().default(0),
  deductions: z.number().nonnegative().optional().default(0),
  paymentMethod: z.string().optional().nullable(),
  paymentDetails: z.string().optional().nullable(),
  effectiveDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Monthly Salary Disbursement Payment Schema
export const disburseSalarySchema = z.object({
  branchId: z.string().uuid("Invalid branch ID"),
  userId: z.string().uuid("Invalid employee ID"),
  financialAccountId: z.string().uuid("Invalid financial account ID"),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format must be YYYY-MM"),
  paidAmount: z.number().positive("Payment amount must be greater than 0"),
  paymentRef: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type TransferFundsInput = z.infer<typeof transferFundsSchema>;
export type RecordTransactionInput = z.infer<typeof recordTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
export type CreateRecurringExpenseInput = z.infer<typeof createRecurringExpenseSchema>;
export type UpdateRecurringExpenseInput = z.infer<typeof updateRecurringExpenseSchema>;
export type RecordExpensePaymentInput = z.infer<typeof recordExpensePaymentSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
export type SetSalaryConfigInput = z.infer<typeof setSalaryConfigSchema>;
export type DisburseSalaryInput = z.infer<typeof disburseSalarySchema>;

