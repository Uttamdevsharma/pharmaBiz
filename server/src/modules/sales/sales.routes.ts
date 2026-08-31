import { Router } from "express";
import { SalesController } from "./sales.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validateRequest } from "../../middleware/validate";
import { requireActiveSubscription } from "../../middleware/planLimiter";
import {
  createSaleSchema,
  refundSaleSchema,
  voidSaleSchema,
  listSalesQuerySchema,
} from "./sales.validation";

const router = Router();

router.use(authenticate, requireActiveSubscription);

// POS Checkout
router.post(
  "/",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "CASHIER", "SUPER_ADMIN"]),
  validateRequest({ body: createSaleSchema }),
  SalesController.createSale
);

// Sales Listing & Details
router.get("/", validateRequest({ query: listSalesQuerySchema }), SalesController.listSales);
router.get("/:id", SalesController.getSaleById);
router.get("/:id/receipt", SalesController.getReceipt);

// Refund & Void (Manager Authorization Required)
router.post(
  "/:id/refund",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "SUPER_ADMIN"]),
  validateRequest({ body: refundSaleSchema }),
  SalesController.refundSale
);

router.post(
  "/:id/void",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "SUPER_ADMIN"]),
  validateRequest({ body: voidSaleSchema }),
  SalesController.voidSale
);

export { router as salesRoutes };
