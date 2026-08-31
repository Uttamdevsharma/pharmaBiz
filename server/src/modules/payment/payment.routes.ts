import { Router } from "express";
import { PaymentController } from "./payment.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validateRequest } from "../../middleware/validate";
import { initiatePaymentSchema } from "./payment.validation";

const router = Router();

// SSLCOMMERZ Public Gateway Callbacks & IPN (Support both POST and GET)
router.post("/sslcommerz/success", PaymentController.handleSuccess);
router.get("/sslcommerz/success", PaymentController.handleSuccess);

router.post("/sslcommerz/fail", PaymentController.handleFail);
router.get("/sslcommerz/fail", PaymentController.handleFail);

router.post("/sslcommerz/cancel", PaymentController.handleCancel);
router.get("/sslcommerz/cancel", PaymentController.handleCancel);

router.post("/sslcommerz/ipn", PaymentController.handleIPN);
router.get("/sslcommerz/ipn", PaymentController.handleIPN);

// Direct aliases under /api/payments/*
router.post("/success", PaymentController.handleSuccess);
router.get("/success", PaymentController.handleSuccess);
router.post("/fail", PaymentController.handleFail);
router.get("/fail", PaymentController.handleFail);
router.post("/cancel", PaymentController.handleCancel);
router.get("/cancel", PaymentController.handleCancel);

// Tenant-Scoped Payment Actions
router.post(
  "/initiate",
  authenticate,
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  validateRequest({ body: initiatePaymentSchema }),
  PaymentController.initiate
);

router.get("/history", authenticate, PaymentController.getHistory);
router.get("/:id/validate", authenticate, PaymentController.validatePayment);

export { router as paymentRoutes };
