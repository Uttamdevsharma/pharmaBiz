"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supplierRoutes = void 0;
const express_1 = require("express");
const supplier_controller_1 = require("./supplier.controller");
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const validate_1 = require("../../middleware/validate");
const planLimiter_1 = require("../../middleware/planLimiter");
const supplier_validation_1 = require("./supplier.validation");
const router = (0, express_1.Router)();
router.use(authenticate_1.authenticate, planLimiter_1.requireActiveSubscription);
// Supplier CRUD
router.get("/", (0, authorize_1.authorize)(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "AUDITOR"]), (0, validate_1.validateRequest)({ query: supplier_validation_1.listSuppliersQuerySchema }), supplier_controller_1.SupplierController.listSuppliers);
router.get("/:id", (0, authorize_1.authorize)(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "AUDITOR"]), supplier_controller_1.SupplierController.getSupplierById);
router.post("/", (0, authorize_1.authorize)(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER"]), (0, validate_1.validateRequest)({ body: supplier_validation_1.createSupplierSchema }), supplier_controller_1.SupplierController.createSupplier);
router.patch("/:id", (0, authorize_1.authorize)(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER"]), (0, validate_1.validateRequest)({ body: supplier_validation_1.updateSupplierSchema }), supplier_controller_1.SupplierController.updateSupplier);
router.delete("/:id", (0, authorize_1.authorize)(["COMPANY_OWNER"]), supplier_controller_1.SupplierController.deleteSupplier);
// Purchases / Stock Inward
router.post("/purchases", (0, authorize_1.authorize)(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER"]), (0, validate_1.validateRequest)({ body: supplier_validation_1.createPurchaseSchema }), supplier_controller_1.SupplierController.recordPurchase);
router.get("/purchases/list", (0, authorize_1.authorize)(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "AUDITOR"]), (0, validate_1.validateRequest)({ query: supplier_validation_1.listPurchasesQuerySchema }), supplier_controller_1.SupplierController.listPurchases);
// Settle due payment to supplier
router.post("/:id/payments", (0, authorize_1.authorize)(["COMPANY_OWNER", "BRANCH_MANAGER"]), (0, validate_1.validateRequest)({ body: supplier_validation_1.recordSupplierPaymentSchema }), supplier_controller_1.SupplierController.recordSupplierPayment);
exports.supplierRoutes = router;
