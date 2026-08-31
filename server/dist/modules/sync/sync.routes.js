"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncRoutes = void 0;
const express_1 = require("express");
const sync_controller_1 = require("./sync.controller");
const authenticate_1 = require("../../middleware/authenticate");
const validate_1 = require("../../middleware/validate");
const planLimiter_1 = require("../../middleware/planLimiter");
const sync_validation_1 = require("./sync.validation");
const router = (0, express_1.Router)();
exports.syncRoutes = router;
router.use(authenticate_1.authenticate, planLimiter_1.requireActiveSubscription);
// Push offline changes from branch
router.post("/push/sales", (0, validate_1.validateRequest)({ body: sync_validation_1.pushSalesBatchSchema }), sync_controller_1.SyncController.pushSales);
router.post("/push/stock", (0, validate_1.validateRequest)({ body: sync_validation_1.pushStockBatchSchema }), sync_controller_1.SyncController.pushStock);
// Pull cloud updates down to branch
router.get("/pull", (0, validate_1.validateRequest)({ query: sync_validation_1.pullUpdatesQuerySchema }), sync_controller_1.SyncController.pullUpdates);
// Status & Logs
router.get("/status/:branchId", sync_controller_1.SyncController.getSyncStatus);
router.get("/logs", (0, validate_1.validateRequest)({ query: sync_validation_1.listSyncLogsQuerySchema }), sync_controller_1.SyncController.listSyncLogs);
