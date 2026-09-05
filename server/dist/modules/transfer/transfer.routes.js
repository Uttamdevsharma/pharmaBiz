"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transferRoutes = void 0;
const express_1 = require("express");
const transfer_controller_1 = require("./transfer.controller");
const authenticate_1 = require("../../middleware/authenticate");
const requirePermission_1 = require("../../middleware/requirePermission");
const validate_1 = require("../../middleware/validate");
const planLimiter_1 = require("../../middleware/planLimiter");
const transfer_validation_1 = require("./transfer.validation");
const router = (0, express_1.Router)();
exports.transferRoutes = router;
// Inter-branch transfers require active subscription
router.use(authenticate_1.authenticate, planLimiter_1.requireActiveSubscription);
// List & Details
router.get("/damaged-products", (0, requirePermission_1.requirePermission)("stock.manage"), transfer_controller_1.TransferController.getDamagedProducts);
router.get("/", (0, requirePermission_1.requirePermission)("stock.manage"), (0, validate_1.validateRequest)({ query: transfer_validation_1.listTransfersQuerySchema }), transfer_controller_1.TransferController.listTransfers);
router.get("/:id", (0, requirePermission_1.requirePermission)("stock.manage"), transfer_controller_1.TransferController.getTransferDetails);
// Create & Dispatch Transfer
router.post("/", (0, requirePermission_1.requirePermission)("stock.manage"), (0, validate_1.validateRequest)({ body: transfer_validation_1.createTransferSchema }), transfer_controller_1.TransferController.createTransfer);
// Receive Shipment (with damaged/missing quantities & optional immediate settlement)
router.post("/:id/receive", (0, requirePermission_1.requirePermission)("stock.manage"), (0, validate_1.validateRequest)({ body: transfer_validation_1.receiveTransferSchema }), transfer_controller_1.TransferController.receiveTransfer);
// Settle Transfer Payable (Pay destination payable to source branch account)
router.post("/:id/settle", (0, requirePermission_1.requirePermission)("stock.manage"), (0, validate_1.validateRequest)({ body: transfer_validation_1.settleTransferSchema }), transfer_controller_1.TransferController.settleTransfer);
// Cancel Transfer (Returns stock to source branch)
router.post("/:id/cancel", (0, requirePermission_1.requirePermission)("stock.manage"), transfer_controller_1.TransferController.cancelTransfer);
