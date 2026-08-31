"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentRoutes = void 0;
const express_1 = require("express");
const payment_controller_1 = require("./payment.controller");
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const validate_1 = require("../../middleware/validate");
const payment_validation_1 = require("./payment.validation");
const router = (0, express_1.Router)();
exports.paymentRoutes = router;
// SSLCOMMERZ Public Gateway Callbacks & IPN (Support both POST and GET)
router.post("/sslcommerz/success", payment_controller_1.PaymentController.handleSuccess);
router.get("/sslcommerz/success", payment_controller_1.PaymentController.handleSuccess);
router.post("/sslcommerz/fail", payment_controller_1.PaymentController.handleFail);
router.get("/sslcommerz/fail", payment_controller_1.PaymentController.handleFail);
router.post("/sslcommerz/cancel", payment_controller_1.PaymentController.handleCancel);
router.get("/sslcommerz/cancel", payment_controller_1.PaymentController.handleCancel);
router.post("/sslcommerz/ipn", payment_controller_1.PaymentController.handleIPN);
router.get("/sslcommerz/ipn", payment_controller_1.PaymentController.handleIPN);
// Direct aliases under /api/payments/*
router.post("/success", payment_controller_1.PaymentController.handleSuccess);
router.get("/success", payment_controller_1.PaymentController.handleSuccess);
router.post("/fail", payment_controller_1.PaymentController.handleFail);
router.get("/fail", payment_controller_1.PaymentController.handleFail);
router.post("/cancel", payment_controller_1.PaymentController.handleCancel);
router.get("/cancel", payment_controller_1.PaymentController.handleCancel);
// Tenant-Scoped Payment Actions
router.post("/initiate", authenticate_1.authenticate, (0, authorize_1.authorize)(["COMPANY_OWNER", "SUPER_ADMIN"]), (0, validate_1.validateRequest)({ body: payment_validation_1.initiatePaymentSchema }), payment_controller_1.PaymentController.initiate);
router.get("/history", authenticate_1.authenticate, payment_controller_1.PaymentController.getHistory);
router.get("/:id/validate", authenticate_1.authenticate, payment_controller_1.PaymentController.validatePayment);
