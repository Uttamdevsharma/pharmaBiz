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
  collectDueSchema,
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
router.get("/due-stats", requirePermission("pos.history"), SalesController.getDueStats);
router.get("/customers", requirePermission("pos.manage"), SalesController.getCustomers);
router.get("/:id", requirePermission("pos.history"), SalesController.getSaleById);
router.get("/:id/receipt", requirePermission("pos.history"), SalesController.getReceipt);

// Due Collection
router.post(
  "/:id/collect-due",
  requirePermission("pos.manage"),
  validateRequest({ body: collectDueSchema }),
  SalesController.collectDue
);

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
