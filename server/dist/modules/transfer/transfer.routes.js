"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transferRoutes = void 0;
const express_1 = require("express");
const transfer_controller_1 = require("./transfer.controller");
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const validate_1 = require("../../middleware/validate");
const planLimiter_1 = require("../../middleware/planLimiter");
const transfer_validation_1 = require("./transfer.validation");
const router = (0, express_1.Router)();
exports.transferRoutes = router;
// Inter-branch transfers require active subscription and at least GROWTH tier
router.use(authenticate_1.authenticate, planLimiter_1.requireActiveSubscription, (0, planLimiter_1.requireTier)("GROWTH"));
router.get("/", (0, validate_1.validateRequest)({ query: transfer_validation_1.listTransfersQuerySchema }), transfer_controller_1.TransferController.listTransfers);
router.get("/:id", transfer_controller_1.TransferController.getTransferDetails);
// Transfer Requests (Branch Manager, Regional Admin, Company Owner)
router.post("/", (0, authorize_1.authorize)(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "SUPER_ADMIN"]), (0, validate_1.validateRequest)({ body: transfer_validation_1.createTransferSchema }), transfer_controller_1.TransferController.createTransfer);
// Approval & Rejection (Regional Admin, Company Owner)
router.post("/:id/approve", (0, authorize_1.authorize)(["COMPANY_OWNER", "REGIONAL_ADMIN", "SUPER_ADMIN"]), transfer_controller_1.TransferController.approveTransfer);
router.post("/:id/reject", (0, authorize_1.authorize)(["COMPANY_OWNER", "REGIONAL_ADMIN", "SUPER_ADMIN"]), (0, validate_1.validateRequest)({ body: transfer_validation_1.rejectTransferSchema }), transfer_controller_1.TransferController.rejectTransfer);
// Completion (Branch Manager, Regional Admin, Company Owner)
router.post("/:id/complete", (0, authorize_1.authorize)(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "SUPER_ADMIN"]), transfer_controller_1.TransferController.completeTransfer);
