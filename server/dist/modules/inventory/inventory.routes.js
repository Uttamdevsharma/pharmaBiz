"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryRoutes = void 0;
const express_1 = require("express");
const inventory_controller_1 = require("./inventory.controller");
const authenticate_1 = require("../../middleware/authenticate");
const requirePermission_1 = require("../../middleware/requirePermission");
const validate_1 = require("../../middleware/validate");
const planLimiter_1 = require("../../middleware/planLimiter");
const inventory_validation_1 = require("./inventory.validation");
const router = (0, express_1.Router)();
router.use(authenticate_1.authenticate, planLimiter_1.requireActiveSubscription);
// Inward / Add Stock Batch
router.post("/inward", (0, requirePermission_1.requirePermission)("stock.add_stock"), (0, validate_1.validateRequest)({ body: inventory_validation_1.inwardStockSchema }), inventory_controller_1.InventoryController.inwardStock);
// Manual Stock Adjustment
router.post("/adjust", (0, requirePermission_1.requirePermission)("stock.add_stock"), (0, validate_1.validateRequest)({ body: inventory_validation_1.adjustStockSchema }), inventory_controller_1.InventoryController.adjustStock);
// Allocate Stock
router.post("/allocate", (0, requirePermission_1.requirePermission)("stock.allocation"), (0, validate_1.validateRequest)({ body: inventory_validation_1.allocateStockSchema }), inventory_controller_1.InventoryController.allocateStock);
// Move Stock
router.post("/move", (0, requirePermission_1.requirePermission)("stock.allocation"), (0, validate_1.validateRequest)({ body: inventory_validation_1.moveStockSchema }), inventory_controller_1.InventoryController.moveStock);
// Remove Expired Stock
router.post("/remove-expired", (0, requirePermission_1.requirePermission)("stock.damaged"), (0, validate_1.validateRequest)({ body: inventory_validation_1.removeExpiredStockSchema }), inventory_controller_1.InventoryController.removeExpiredStock);
// Update Inventory item metadata
router.patch("/:id", (0, requirePermission_1.requirePermission)("stock.stock_list"), (0, validate_1.validateRequest)({ body: inventory_validation_1.updateInventoryItemSchema }), inventory_controller_1.InventoryController.updateInventoryItem);
// List Stock Receiving History
router.get("/receiving-history", (0, requirePermission_1.requirePermission)("stock.stock_history"), inventory_controller_1.InventoryController.listReceivingHistory);
// List Movements / Stock History Ledger
router.get("/movements", (0, requirePermission_1.requirePermission)("stock.stock_history"), (0, validate_1.validateRequest)({ query: inventory_validation_1.listMovementsQuerySchema }), inventory_controller_1.InventoryController.listMovements);
router.get("/movements/:branchId", (0, requirePermission_1.requirePermission)("stock.stock_history"), (req, res) => {
    req.query.branchId = req.params.branchId;
    return inventory_controller_1.InventoryController.listMovements(req, res);
});
// Alerts: Low stock
router.get("/low-stock", (0, requirePermission_1.requirePermission)("stock.stock_list"), (0, validate_1.validateRequest)({ query: inventory_validation_1.inventoryAlertsQuerySchema }), inventory_controller_1.InventoryController.getLowStock);
// Alerts: Near expiry & expired
router.get("/near-expiry", (0, requirePermission_1.requirePermission)("stock.stock_list"), (0, validate_1.validateRequest)({ query: inventory_validation_1.inventoryAlertsQuerySchema }), inventory_controller_1.InventoryController.getNearExpiry);
// POS: Get FEFO-sorted batches with physical locations for a product
router.get("/pos-batches", (0, requirePermission_1.requirePermission)("pos.manage"), (0, validate_1.validateRequest)({ query: inventory_validation_1.posBatchQuerySchema }), inventory_controller_1.InventoryController.getPosBatches);
// Get single batch details
router.get("/batch/:id", (0, requirePermission_1.requirePermission)("stock.stock_list"), inventory_controller_1.InventoryController.getBatchDetails);
// Get branch inventory list
router.get("/branch/:branchId", (0, requirePermission_1.requirePermission)("stock.stock_list"), inventory_controller_1.InventoryController.getBranchInventory);
// Query-based branch inventory list (e.g. /api/inventory?branchId=...)
router.get("/", (0, requirePermission_1.requirePermission)("stock.stock_list"), (req, res) => {
    const branchId = req.query.branchId || req.headers["x-branch-id"] || req.user?.branchId || "all";
    req.params.branchId = branchId;
    return inventory_controller_1.InventoryController.getBranchInventory(req, res);
});
exports.inventoryRoutes = router;
