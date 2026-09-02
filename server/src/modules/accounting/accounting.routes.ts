import { Router } from "express";
import { AccountingController } from "./accounting.controller";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission } from "../../middleware/requirePermission";
import { validateRequest } from "../../middleware/validate";
import { requireActiveSubscription } from "../../middleware/planLimiter";
import {
  createAccountSchema,
  transferFundsSchema,
  recordTransactionSchema,
  listTransactionsQuerySchema,
} from "./accounting.validation";

const router = Router();

router.use(authenticate, requireActiveSubscription);

// Overview & summary
router.get(
  "/overview",
  requirePermission("accounts.view"),
  AccountingController.getOverview
);

// Accounts list & create
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

export const accountingRoutes = router;
