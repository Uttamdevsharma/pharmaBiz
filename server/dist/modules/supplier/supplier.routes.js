"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supplierRoutes = void 0;
const express_1 = require("express");
const supplier_controller_1 = require("./supplier.controller");
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const requirePermission_1 = require("../../middleware/requirePermission");
const validate_1 = require("../../middleware/validate");
const planLimiter_1 = require("../../middleware/planLimiter");
const supplier_validation_1 = require("./supplier.validation");
const router = (0, express_1.Router)();
router.use(authenticate_1.authenticate, planLimiter_1.requireActiveSubscription);
// Supplier CRUD
router.get("/", (0, requirePermission_1.requirePermission)("supplier.view"), (0, validate_1.validateRequest)({ query: supplier_validation_1.listSuppliersQuerySchema }), supplier_controller_1.SupplierController.listSuppliers);
router.get("/:id", (0, requirePermission_1.requirePermission)("supplier.view"), supplier_controller_1.SupplierController.getSupplierById);
router.post("/", (0, requirePermission_1.requirePermission)("supplier.manage"), (0, validate_1.validateRequest)({ body: supplier_validation_1.createSupplierSchema }), supplier_controller_1.SupplierController.createSupplier);
router.patch("/:id", (0, requirePermission_1.requirePermission)("supplier.manage"), (0, validate_1.validateRequest)({ body: supplier_validation_1.updateSupplierSchema }), supplier_controller_1.SupplierController.updateSupplier);
router.delete("/:id", (0, authorize_1.authorize)(["COMPANY_OWNER", "SUPER_ADMIN"]), supplier_controller_1.SupplierController.deleteSupplier);
// Purchases / Stock Inward
router.post("/purchases", (0, requirePermission_1.requirePermission)("inventory.add_stock"), (0, validate_1.validateRequest)({ body: supplier_validation_1.createPurchaseSchema }), supplier_controller_1.SupplierController.recordPurchase);
router.get("/purchases/list", (0, requirePermission_1.requirePermission)("supplier.view"), (0, validate_1.validateRequest)({ query: supplier_validation_1.listPurchasesQuerySchema }), supplier_controller_1.SupplierController.listPurchases);
// Settle due payment to supplier
router.post("/:id/payments", (0, requirePermission_1.requirePermission)("accounts.manage"), (0, validate_1.validateRequest)({ body: supplier_validation_1.recordSupplierPaymentSchema }), supplier_controller_1.SupplierController.recordSupplierPayment);
exports.supplierRoutes = router;
