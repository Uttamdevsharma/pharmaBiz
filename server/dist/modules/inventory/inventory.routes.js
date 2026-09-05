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
router.post("/inward", (0, requirePermission_1.requirePermission)("inventory.add_stock"), (0, validate_1.validateRequest)({ body: inventory_validation_1.inwardStockSchema }), inventory_controller_1.InventoryController.inwardStock);
// Manual Stock Adjustment
router.post("/adjust", (0, requirePermission_1.requirePermission)("inventory.adjust"), (0, validate_1.validateRequest)({ body: inventory_validation_1.adjustStockSchema }), inventory_controller_1.InventoryController.adjustStock);
// Update Inventory item metadata
router.patch("/:id", (0, requirePermission_1.requirePermission)("inventory.adjust"), (0, validate_1.validateRequest)({ body: inventory_validation_1.updateInventoryItemSchema }), inventory_controller_1.InventoryController.updateInventoryItem);
// List Movements / Stock History Ledger
router.get("/movements", (0, requirePermission_1.requirePermission)("inventory.view"), (0, validate_1.validateRequest)({ query: inventory_validation_1.listMovementsQuerySchema }), inventory_controller_1.InventoryController.listMovements);
// Alerts: Low stock
router.get("/low-stock", (0, requirePermission_1.requirePermission)("inventory.view"), (0, validate_1.validateRequest)({ query: inventory_validation_1.inventoryAlertsQuerySchema }), inventory_controller_1.InventoryController.getLowStock);
// Alerts: Near expiry & expired
router.get("/near-expiry", (0, requirePermission_1.requirePermission)("inventory.view"), (0, validate_1.validateRequest)({ query: inventory_validation_1.inventoryAlertsQuerySchema }), inventory_controller_1.InventoryController.getNearExpiry);
// Get branch inventory list
router.get("/branch/:branchId", (0, requirePermission_1.requirePermission)("inventory.view"), inventory_controller_1.InventoryController.getBranchInventory);
// Query-based branch inventory list (e.g. /api/inventory?branchId=...)
router.get("/", (0, requirePermission_1.requirePermission)("inventory.view"), (req, res) => {
    const branchId = req.query.branchId || req.user?.branchId;
    if (!branchId) {
        res.status(400).json({ success: false, message: "branchId is required" });
        return;
    }
    req.params.branchId = branchId;
    return inventory_controller_1.InventoryController.getBranchInventory(req, res);
});
exports.inventoryRoutes = router;
