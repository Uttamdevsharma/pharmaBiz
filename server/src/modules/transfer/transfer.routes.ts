import { Router } from "express";
import { TransferController } from "./transfer.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validateRequest } from "../../middleware/validate";
import { requireActiveSubscription, requireTier } from "../../middleware/planLimiter";
import {
  createTransferSchema,
  rejectTransferSchema,
  listTransfersQuerySchema,
} from "./transfer.validation";

const router = Router();

// Inter-branch transfers require active subscription and at least GROWTH tier
router.use(authenticate, requireActiveSubscription, requireTier("GROWTH"));

router.get("/", validateRequest({ query: listTransfersQuerySchema }), TransferController.listTransfers);
router.get("/:id", TransferController.getTransferDetails);

// Transfer Requests (Branch Manager, Regional Admin, Company Owner)
router.post(
  "/",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "SUPER_ADMIN"]),
  validateRequest({ body: createTransferSchema }),
  TransferController.createTransfer
);

// Approval & Rejection (Regional Admin, Company Owner)
router.post(
  "/:id/approve",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "SUPER_ADMIN"]),
  TransferController.approveTransfer
);

router.post(
  "/:id/reject",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "SUPER_ADMIN"]),
  validateRequest({ body: rejectTransferSchema }),
  TransferController.rejectTransfer
);

// Completion (Branch Manager, Regional Admin, Company Owner)
router.post(
  "/:id/complete",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "SUPER_ADMIN"]),
  TransferController.completeTransfer
);

export { router as transferRoutes };
