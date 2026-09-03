import { Router } from "express";
import { TransferController } from "./transfer.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validateRequest } from "../../middleware/validate";
import { requireActiveSubscription, requireTier } from "../../middleware/planLimiter";
import {
  createTransferSchema,
  receiveTransferSchema,
  settleTransferSchema,
  listTransfersQuerySchema,
} from "./transfer.validation";

const router = Router();

// Inter-branch transfers require active subscription
router.use(authenticate, requireActiveSubscription, requireTier("GROWTH"));

// List & Details
router.get("/", validateRequest({ query: listTransfersQuerySchema }), TransferController.listTransfers);
router.get("/:id", TransferController.getTransferDetails);

// Create & Dispatch Transfer
router.post(
  "/",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "SUPER_ADMIN", "INVENTORY_EXECUTIVE"]),
  validateRequest({ body: createTransferSchema }),
  TransferController.createTransfer
);

// Receive Shipment (with damaged/missing quantities & optional immediate settlement)
router.post(
  "/:id/receive",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "SUPER_ADMIN", "INVENTORY_EXECUTIVE"]),
  validateRequest({ body: receiveTransferSchema }),
  TransferController.receiveTransfer
);

// Settle Transfer Payable (Pay destination payable to source branch account)
router.post(
  "/:id/settle",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "SUPER_ADMIN", "ACCOUNTS"]),
  validateRequest({ body: settleTransferSchema }),
  TransferController.settleTransfer
);

// Cancel Transfer (Returns stock to source branch)
router.post(
  "/:id/cancel",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "SUPER_ADMIN"]),
  TransferController.cancelTransfer
);

export { router as transferRoutes };
