import { Router } from "express";
import { InventoryController } from "./inventory.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { requirePermission } from "../../middleware/requirePermission";
import { validateRequest } from "../../middleware/validate";
import { requireActiveSubscription } from "../../middleware/planLimiter";
import {
  inwardStockSchema,
  adjustStockSchema,
  updateInventoryItemSchema,
  listMovementsQuerySchema,
  inventoryAlertsQuerySchema,
  allocateStockSchema,
  moveStockSchema,
  removeExpiredStockSchema,
  posBatchQuerySchema,
} from "./inventory.validation";

const router = Router();

router.use(authenticate, requireActiveSubscription);

// Inward / Add Stock Batch
router.post(
  "/inward",
  requirePermission("stock.add_stock"),
  validateRequest({ body: inwardStockSchema }),
  InventoryController.inwardStock
);

// Manual Stock Adjustment
router.post(
  "/adjust",
  requirePermission("stock.add_stock"),
  validateRequest({ body: adjustStockSchema }),
  InventoryController.adjustStock
);

// Allocate Stock
router.post(
  "/allocate",
  requirePermission("stock.allocation"),
  validateRequest({ body: allocateStockSchema }),
  InventoryController.allocateStock
);

// Move Stock
router.post(
  "/move",
  requirePermission("stock.allocation"),
  validateRequest({ body: moveStockSchema }),
  InventoryController.moveStock
);

// Remove Expired Stock
router.post(
  "/remove-expired",
  requirePermission("stock.damaged"),
  validateRequest({ body: removeExpiredStockSchema }),
  InventoryController.removeExpiredStock
);

// Update Inventory item metadata
router.patch(
  "/:id",
  requirePermission("stock.stock_list"),
  validateRequest({ body: updateInventoryItemSchema }),
  InventoryController.updateInventoryItem
);

// List Stock Receiving History
router.get(
  "/receiving-history",
  requirePermission("stock.stock_history"),
  InventoryController.listReceivingHistory
);

// List Movements / Stock History Ledger
router.get(
  "/movements",
  requirePermission("stock.stock_history"),
  validateRequest({ query: listMovementsQuerySchema }),
  InventoryController.listMovements
);

router.get(
  "/movements/:branchId",
  requirePermission("stock.stock_history"),
  (req, res) => {
    (req.query as any).branchId = req.params.branchId;
    return InventoryController.listMovements(req, res);
  }
);

// Alerts: Low stock
router.get(
  "/low-stock",
  requirePermission("stock.stock_list"),
  validateRequest({ query: inventoryAlertsQuerySchema }),
  InventoryController.getLowStock
);

// Alerts: Near expiry & expired
router.get(
  "/near-expiry",
  requirePermission("stock.stock_list"),
  validateRequest({ query: inventoryAlertsQuerySchema }),
  InventoryController.getNearExpiry
);

// POS: Get FEFO-sorted batches with physical locations for a product
router.get(
  "/pos-batches",
  requirePermission("pos.manage"),
  validateRequest({ query: posBatchQuerySchema }),
  InventoryController.getPosBatches
);

// Get single batch details
router.get(
  "/batch/:id",
  requirePermission("stock.stock_list"),
  InventoryController.getBatchDetails
);

// Get branch inventory list
router.get(
  "/branch/:branchId",
  requirePermission("stock.stock_list"),
  InventoryController.getBranchInventory
);

// Query-based branch inventory list (e.g. /api/inventory?branchId=...)
router.get(
  "/",
  requirePermission("stock.stock_list"),
  (req, res) => {
    const branchId = (req.query.branchId as string) || (req.headers["x-branch-id"] as string) || req.user?.branchId || "all";
    req.params.branchId = branchId;
    return InventoryController.getBranchInventory(req, res);
  }
);

export const inventoryRoutes = router;
