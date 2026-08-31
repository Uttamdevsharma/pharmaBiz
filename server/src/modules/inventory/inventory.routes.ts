import { Router } from "express";
import { InventoryController } from "./inventory.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
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
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER"]),
  validateRequest({ body: inwardStockSchema }),
  InventoryController.inwardStock
);

// Manual Stock Adjustment
router.post(
  "/adjust",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER"]),
  validateRequest({ body: adjustStockSchema }),
  InventoryController.adjustStock
);

// Update Inventory item metadata
router.patch(
  "/:id",
  authorize(["COMPANY_OWNER", "BRANCH_MANAGER"]),
  validateRequest({ body: updateInventoryItemSchema }),
  InventoryController.updateInventoryItem
);

// List Movements / Stock History Ledger
router.get(
  "/movements",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "AUDITOR"]),
  validateRequest({ query: listMovementsQuerySchema }),
  InventoryController.listMovements
);

// Alerts: Low stock
router.get(
  "/low-stock",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "CASHIER", "AUDITOR"]),
  validateRequest({ query: inventoryAlertsQuerySchema }),
  InventoryController.getLowStock
);

// Alerts: Near expiry & expired
router.get(
  "/near-expiry",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "CASHIER", "AUDITOR"]),
  validateRequest({ query: inventoryAlertsQuerySchema }),
  InventoryController.getNearExpiry
);

// Get branch inventory list
router.get(
  "/branch/:branchId",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "CASHIER", "AUDITOR"]),
  InventoryController.getBranchInventory
);

export const inventoryRoutes = router;
