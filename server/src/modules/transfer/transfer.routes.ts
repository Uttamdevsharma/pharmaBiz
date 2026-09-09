import { Router } from "express";
import { TransferController } from "./transfer.controller";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission } from "../../middleware/requirePermission";
import { validateRequest } from "../../middleware/validate";
import { requireActiveSubscription } from "../../middleware/planLimiter";
import {
  createTransferSchema,
  receiveTransferSchema,
  settleTransferSchema,
  listTransfersQuerySchema,
} from "./transfer.validation";

const router = Router();

// Inter-branch transfers require active subscription
router.use(authenticate, requireActiveSubscription);

// List & Details
router.get(
  "/damaged-products",
  requirePermission("stock.damaged"),
  TransferController.getDamagedProducts
);
router.get(
  "/",
  requirePermission("stock.transfer_history"),
  validateRequest({ query: listTransfersQuerySchema }),
  TransferController.listTransfers
);
router.get(
  "/:id",
  requirePermission("stock.transfer_history"),
  TransferController.getTransferDetails
);

// Create & Dispatch Transfer
router.post(
  "/",
  requirePermission("stock.transfer"),
  validateRequest({ body: createTransferSchema }),
  TransferController.createTransfer
);

// Receive Shipment (with damaged/missing quantities & optional immediate settlement)
router.post(
  "/:id/receive",
  requirePermission("stock.receive"),
  validateRequest({ body: receiveTransferSchema }),
  TransferController.receiveTransfer
);

// Settle Transfer Payable (Pay destination payable to source branch account)
router.post(
  "/:id/settle",
  requirePermission("stock.receive"),
  validateRequest({ body: settleTransferSchema }),
  TransferController.settleTransfer
);

// Cancel Transfer (Returns stock to source branch)
router.post(
  "/:id/cancel",
  requirePermission("stock.transfer"),
  TransferController.cancelTransfer
);

export { router as transferRoutes };
