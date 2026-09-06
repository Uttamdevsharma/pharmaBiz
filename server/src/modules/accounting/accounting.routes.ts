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
  requirePermission("accounts.expenses"),
  AccountingController.listRecurringExpenses
);
router.post(
  "/recurring-expenses",
  requirePermission("accounts.expenses"),
  validateRequest({ body: createRecurringExpenseSchema }),
  AccountingController.createRecurringExpense
);
router.put(
  "/recurring-expenses/:id",
  requirePermission("accounts.expenses"),
  validateRequest({ body: updateRecurringExpenseSchema }),
  AccountingController.updateRecurringExpense
);
router.delete(
  "/recurring-expenses/:id",
  requirePermission("accounts.expenses"),
  AccountingController.deleteRecurringExpense
);

// ==========================================
// 💸 Monthly Expenses & Payments
// ==========================================
router.get(
  "/expenses",
  requirePermission("accounts.expenses"),
  validateRequest({ query: listExpensesQuerySchema }),
  AccountingController.listExpenses
);
router.post(
  "/expenses",
  requirePermission("accounts.expenses"),
  validateRequest({ body: recordExpensePaymentSchema }),
  AccountingController.recordExpense
);
router.get(
  "/expenses/summary",
  requirePermission("accounts.expenses"),
  AccountingController.getExpenseSummary
);

// ==========================================
// 👥 Staff Salaries & Payroll
// ==========================================
router.get(
  "/salaries/employees",
  requirePermission("accounts.salaries"),
  AccountingController.listBranchStaffSalaries
);
router.post(
  "/salaries/config",
  requirePermission("accounts.salaries"),
  validateRequest({ body: setSalaryConfigSchema }),
  AccountingController.setSalaryConfig
);
router.post(
  "/salaries/disburse",
  requirePermission("accounts.salaries"),
  validateRequest({ body: disburseSalarySchema }),
  AccountingController.disburseSalary
);
router.get(
  "/salaries/branch-history",
  requirePermission("accounts.salaries"),
  AccountingController.getBranchSalaryHistory
);
router.get(
  "/salaries/history/:userId",
  requirePermission("accounts.salaries"),
  AccountingController.getEmployeeSalaryHistory
);
router.get(
  "/salaries/my-history",
  AccountingController.getMySalaryHistory
);

export const accountingRoutes = router;
