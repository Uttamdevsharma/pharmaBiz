"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesRoutes = void 0;
const express_1 = require("express");
const sales_controller_1 = require("./sales.controller");
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const validate_1 = require("../../middleware/validate");
const planLimiter_1 = require("../../middleware/planLimiter");
const sales_validation_1 = require("./sales.validation");
const router = (0, express_1.Router)();
exports.salesRoutes = router;
router.use(authenticate_1.authenticate, planLimiter_1.requireActiveSubscription);
// POS Checkout
router.post("/", (0, authorize_1.authorize)(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "CASHIER", "SUPER_ADMIN"]), (0, validate_1.validateRequest)({ body: sales_validation_1.createSaleSchema }), sales_controller_1.SalesController.createSale);
// Sales Listing & Details
router.get("/", (0, validate_1.validateRequest)({ query: sales_validation_1.listSalesQuerySchema }), sales_controller_1.SalesController.listSales);
router.get("/:id", sales_controller_1.SalesController.getSaleById);
router.get("/:id/receipt", sales_controller_1.SalesController.getReceipt);
// Refund & Void (Manager Authorization Required)
router.post("/:id/refund", (0, authorize_1.authorize)(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "SUPER_ADMIN"]), (0, validate_1.validateRequest)({ body: sales_validation_1.refundSaleSchema }), sales_controller_1.SalesController.refundSale);
router.post("/:id/void", (0, authorize_1.authorize)(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "SUPER_ADMIN"]), (0, validate_1.validateRequest)({ body: sales_validation_1.voidSaleSchema }), sales_controller_1.SalesController.voidSale);
