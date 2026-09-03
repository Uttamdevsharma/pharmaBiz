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
} from "./inventory.validation";

const router = Router();

router.use(authenticate, requireActiveSubscription);

// Inward / Add Stock Batch
router.post(
  "/inward",
  requirePermission("inventory.add_stock"),
  validateRequest({ body: inwardStockSchema }),
  InventoryController.inwardStock
);

// Manual Stock Adjustment
router.post(
  "/adjust",
  requirePermission("inventory.adjust"),
  validateRequest({ body: adjustStockSchema }),
  InventoryController.adjustStock
);

// Update Inventory item metadata
router.patch(
  "/:id",
  requirePermission("inventory.adjust"),
  validateRequest({ body: updateInventoryItemSchema }),
  InventoryController.updateInventoryItem
);

// List Movements / Stock History Ledger
router.get(
  "/movements",
  requirePermission("inventory.view"),
  validateRequest({ query: listMovementsQuerySchema }),
  InventoryController.listMovements
);

// Alerts: Low stock
router.get(
  "/low-stock",
  requirePermission("inventory.view"),
  validateRequest({ query: inventoryAlertsQuerySchema }),
  InventoryController.getLowStock
);

// Alerts: Near expiry & expired
router.get(
  "/near-expiry",
  requirePermission("inventory.view"),
  validateRequest({ query: inventoryAlertsQuerySchema }),
  InventoryController.getNearExpiry
);

// Get branch inventory list
router.get(
  "/branch/:branchId",
  requirePermission("inventory.view"),
  InventoryController.getBranchInventory
);

// Query-based branch inventory list (e.g. /api/inventory?branchId=...)
router.get(
  "/",
  requirePermission("inventory.view"),
  (req, res) => {
    const branchId = (req.query.branchId as string) || req.user?.branchId;
    if (!branchId) {
      res.status(400).json({ success: false, message: "branchId is required" });
      return;
    }
    req.params.branchId = branchId;
    return InventoryController.getBranchInventory(req, res);
  }
);

export const inventoryRoutes = router;
