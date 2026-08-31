import { Router } from "express";
import { SyncController } from "./sync.controller";
import { authenticate } from "../../middleware/authenticate";
import { validateRequest } from "../../middleware/validate";
import { requireActiveSubscription } from "../../middleware/planLimiter";
import {
  pushSalesBatchSchema,
  pushStockBatchSchema,
  pullUpdatesQuerySchema,
  listSyncLogsQuerySchema,
} from "./sync.validation";

const router = Router();

router.use(authenticate, requireActiveSubscription);

// Push offline changes from branch
router.post("/push/sales", validateRequest({ body: pushSalesBatchSchema }), SyncController.pushSales);
router.post("/push/stock", validateRequest({ body: pushStockBatchSchema }), SyncController.pushStock);

// Pull cloud updates down to branch
router.get("/pull", validateRequest({ query: pullUpdatesQuerySchema }), SyncController.pullUpdates);

// Status & Logs
router.get("/status/:branchId", SyncController.getSyncStatus);
router.get("/logs", validateRequest({ query: listSyncLogsQuerySchema }), SyncController.listSyncLogs);

export { router as syncRoutes };
