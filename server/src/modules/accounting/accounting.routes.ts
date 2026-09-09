import { Router } from "express";
import { AccountingController } from "./accounting.controller";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission } from "../../middleware/requirePermission";
import { validateRequest } from "../../middleware/validate";
import { requireActiveSubscription } from "../../middleware/planLimiter";
import {
  createAccountSchema,
  updateAccountSchema,
  depositFundsSchema,
  transferFundsSchema,
  recordTransactionSchema,
  listTransactionsQuerySchema,
  createRecurringExpenseSchema,
  updateRecurringExpenseSchema,
  recordExpensePaymentSchema,
  listExpensesQuerySchema,
  setSalaryConfigSchema,
  disburseSalarySchema,
} from "./accounting.validation";

const router = Router();

router.use(authenticate, requireActiveSubscription);

// Overview & summary
router.get(
  "/overview",
  requirePermission("accounts.view"),
  AccountingController.getOverview
);

// Accounts list & create & update
router.get(
  "/accounts",
  requirePermission("accounts.view"),
  AccountingController.listAccounts
);

router.post(
  "/accounts",
  requirePermission("accounts.manage"),
  validateRequest({ body: createAccountSchema }),
  AccountingController.createAccount
);

router.patch(
  "/accounts/:id",
  requirePermission("accounts.manage"),
  validateRequest({ body: updateAccountSchema }),
  AccountingController.updateAccount
);

router.post(
  "/accounts/deposit",
  requirePermission("accounts.manage"),
  validateRequest({ body: depositFundsSchema }),
  AccountingController.depositFunds
);

router.delete(
  "/accounts/:id",
  requirePermission("accounts.manage"),
  AccountingController.deleteAccount
);

// Double-entry transfer
router.post(
  "/transfer",
  requirePermission("accounts.transfer"),
  validateRequest({ body: transferFundsSchema }),
  AccountingController.transferFunds
);

// Income / Expense recording
router.post(
  "/transactions",
  requirePermission("accounts.manage"),
  validateRequest({ body: recordTransactionSchema }),
  AccountingController.recordTransaction
);

// Ledger list
router.get(
  "/transactions",
  requirePermission("accounts.view"),
  validateRequest({ query: listTransactionsQuerySchema }),
  AccountingController.listTransactions
);

// Daily sales register audit
router.get(
  "/daily-sales",
  requirePermission("accounts.view"),
  AccountingController.getDailySales
);

// ==========================================
// 🏢 Recurring bills & expenses
// ==========================================
router.get(
  "/recurring-expenses",
  requirePermission("expenses.list"),
  AccountingController.listRecurringExpenses
);
router.post(
  "/recurring-expenses",
  requirePermission("expenses.list"),
  validateRequest({ body: createRecurringExpenseSchema }),
  AccountingController.createRecurringExpense
);
router.put(
  "/recurring-expenses/:id",
  requirePermission("expenses.list"),
  validateRequest({ body: updateRecurringExpenseSchema }),
  AccountingController.updateRecurringExpense
);
router.delete(
  "/recurring-expenses/:id",
  requirePermission("expenses.list"),
  AccountingController.deleteRecurringExpense
);

// ==========================================
// 💸 Monthly Expenses & Payments
// ==========================================
router.get(
  "/expenses",
  requirePermission("expenses.history"),
  validateRequest({ query: listExpensesQuerySchema }),
  AccountingController.listExpenses
);
router.post(
  "/expenses",
  requirePermission("expenses.pay"),
  validateRequest({ body: recordExpensePaymentSchema }),
  AccountingController.recordExpense
);
router.get(
  "/expenses/summary",
  requirePermission("expenses.history"),
  AccountingController.getExpenseSummary
);

// ==========================================
// 👥 Staff Salaries & Payroll
// ==========================================
router.get(
  "/salaries/employees",
  requirePermission("employee.view"),
  AccountingController.listBranchStaffSalaries
);
router.post(
  "/salaries/config",
  requirePermission("salary.manage"),
  validateRequest({ body: setSalaryConfigSchema }),
  AccountingController.setSalaryConfig
);
router.post(
  "/salaries/disburse",
  requirePermission("salary.manage"),
  validateRequest({ body: disburseSalarySchema }),
  AccountingController.disburseSalary
);
router.get(
  "/salaries/branch-history",
  requirePermission("salary.history"),
  AccountingController.getBranchSalaryHistory
);
router.get(
  "/salaries/history/:userId",
  requirePermission("salary.history"),
  AccountingController.getEmployeeSalaryHistory
);
router.get(
  "/salaries/my-history",
  AccountingController.getMySalaryHistory
);

export const accountingRoutes = router;
