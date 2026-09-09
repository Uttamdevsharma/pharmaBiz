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
// 1. Literal path endpoints (must precede /:id)
router.get("/", (0, requirePermission_1.requirePermission)("supplier.view"), (0, validate_1.validateRequest)({ query: supplier_validation_1.listSuppliersQuerySchema }), supplier_controller_1.SupplierController.listSuppliers);
router.post("/", (0, requirePermission_1.requirePermission)("supplier.manage"), (0, validate_1.validateRequest)({ body: supplier_validation_1.createSupplierSchema }), supplier_controller_1.SupplierController.createSupplier);
router.get("/purchases/list", (0, requirePermission_1.requirePermission)("supplier.purchase_history"), (0, validate_1.validateRequest)({ query: supplier_validation_1.listPurchasesQuerySchema }), supplier_controller_1.SupplierController.listPurchases);
router.post("/purchases", (0, requirePermission_1.requirePermission)("stock.add_stock"), (0, validate_1.validateRequest)({ body: supplier_validation_1.createPurchaseSchema }), supplier_controller_1.SupplierController.recordPurchase);
router.get("/payments/list", (0, requirePermission_1.requirePermission)("supplier.payments_due"), (0, validate_1.validateRequest)({ query: supplier_validation_1.listSupplierPaymentsQuerySchema }), supplier_controller_1.SupplierController.listSupplierPayments);
router.get("/due-summary", (0, requirePermission_1.requirePermission)("supplier.payments_due"), (0, validate_1.validateRequest)({ query: supplier_validation_1.supplierDueSummaryQuerySchema }), supplier_controller_1.SupplierController.getSupplierDueSummary);
// 2. Specific supplier parameter routes
router.get("/:id", (0, requirePermission_1.requirePermission)("supplier.view"), supplier_controller_1.SupplierController.getSupplierById);
router.patch("/:id", (0, requirePermission_1.requirePermission)("supplier.manage"), (0, validate_1.validateRequest)({ body: supplier_validation_1.updateSupplierSchema }), supplier_controller_1.SupplierController.updateSupplier);
router.delete("/:id", (0, authorize_1.authorize)(["COMPANY_OWNER", "SUPER_ADMIN"]), supplier_controller_1.SupplierController.deleteSupplier);
// Supplier-specific purchases
router.get("/:id/purchases", (0, requirePermission_1.requirePermission)("supplier.purchase_history"), supplier_controller_1.SupplierController.getSupplierPurchases);
// Contact Persons under Supplier
router.get("/:id/contacts", (0, requirePermission_1.requirePermission)("supplier.contacts"), supplier_controller_1.SupplierController.listContacts);
router.post("/:id/contacts", (0, requirePermission_1.requirePermission)("supplier.contacts"), (0, validate_1.validateRequest)({ body: supplier_validation_1.createContactSchema }), supplier_controller_1.SupplierController.createContact);
router.patch("/:id/contacts/:contactId", (0, requirePermission_1.requirePermission)("supplier.contacts"), (0, validate_1.validateRequest)({ body: supplier_validation_1.updateContactSchema }), supplier_controller_1.SupplierController.updateContact);
router.delete("/:id/contacts/:contactId", (0, requirePermission_1.requirePermission)("supplier.contacts"), supplier_controller_1.SupplierController.deleteContact);
// Settle due payment to supplier
router.post("/:id/payments", (0, requirePermission_1.requirePermission)("supplier.payments_due"), (0, validate_1.validateRequest)({ body: supplier_validation_1.recordSupplierPaymentSchema }), supplier_controller_1.SupplierController.recordSupplierPayment);
exports.supplierRoutes = router;
