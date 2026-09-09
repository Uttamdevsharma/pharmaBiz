import { Router } from "express";
import { SalesController } from "./sales.controller";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission } from "../../middleware/requirePermission";
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
  requirePermission("pos.manage"),
  validateRequest({ body: createSaleSchema }),
  SalesController.createSale
);

// Sales Listing & Details
router.get(
  "/",
  requirePermission("pos.history"),
  validateRequest({ query: listSalesQuerySchema }),
  SalesController.listSales
);
router.get("/:id", requirePermission("pos.history"), SalesController.getSaleById);
router.get("/:id/receipt", requirePermission("pos.history"), SalesController.getReceipt);

// Refund & Void
router.post(
  "/:id/refund",
  requirePermission("pos.manage"),
  validateRequest({ body: refundSaleSchema }),
  SalesController.refundSale
);

router.post(
  "/:id/void",
  requirePermission("pos.manage"),
  validateRequest({ body: voidSaleSchema }),
  SalesController.voidSale
);

export { router as salesRoutes };
