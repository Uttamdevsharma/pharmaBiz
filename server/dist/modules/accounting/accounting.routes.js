"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountingRoutes = void 0;
const express_1 = require("express");
const accounting_controller_1 = require("./accounting.controller");
const authenticate_1 = require("../../middleware/authenticate");
const requirePermission_1 = require("../../middleware/requirePermission");
const validate_1 = require("../../middleware/validate");
const planLimiter_1 = require("../../middleware/planLimiter");
const accounting_validation_1 = require("./accounting.validation");
const router = (0, express_1.Router)();
router.use(authenticate_1.authenticate, planLimiter_1.requireActiveSubscription);
// Overview & summary
router.get("/overview", (0, requirePermission_1.requirePermission)("accounts.view"), accounting_controller_1.AccountingController.getOverview);
// Accounts list & create & update
router.get("/accounts", (0, requirePermission_1.requirePermission)("accounts.view"), accounting_controller_1.AccountingController.listAccounts);
router.post("/accounts", (0, requirePermission_1.requirePermission)("accounts.manage"), (0, validate_1.validateRequest)({ body: accounting_validation_1.createAccountSchema }), accounting_controller_1.AccountingController.createAccount);
router.patch("/accounts/:id", (0, requirePermission_1.requirePermission)("accounts.manage"), (0, validate_1.validateRequest)({ body: accounting_validation_1.updateAccountSchema }), accounting_controller_1.AccountingController.updateAccount);
router.delete("/accounts/:id", (0, requirePermission_1.requirePermission)("accounts.manage"), accounting_controller_1.AccountingController.deleteAccount);
// Double-entry transfer
router.post("/transfer", (0, requirePermission_1.requirePermission)("accounts.transfer"), (0, validate_1.validateRequest)({ body: accounting_validation_1.transferFundsSchema }), accounting_controller_1.AccountingController.transferFunds);
// Income / Expense recording
router.post("/transactions", (0, requirePermission_1.requirePermission)("accounts.manage"), (0, validate_1.validateRequest)({ body: accounting_validation_1.recordTransactionSchema }), accounting_controller_1.AccountingController.recordTransaction);
// Ledger list
router.get("/transactions", (0, requirePermission_1.requirePermission)("accounts.view"), (0, validate_1.validateRequest)({ query: accounting_validation_1.listTransactionsQuerySchema }), accounting_controller_1.AccountingController.listTransactions);
// Daily sales register audit
router.get("/daily-sales", (0, requirePermission_1.requirePermission)("accounts.view"), accounting_controller_1.AccountingController.getDailySales);
exports.accountingRoutes = router;
