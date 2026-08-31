import { Router } from "express";
import { AuditController } from "./audit.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validateRequest } from "../../middleware/validate";
import { requireActiveSubscription } from "../../middleware/planLimiter";
import { listAuditLogsQuerySchema } from "./audit.validation";

const router = Router();

router.use(
  authenticate,
  requireActiveSubscription,
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "BRANCH_MANAGER", "AUDITOR", "SUPER_ADMIN"])
);

router.get("/", validateRequest({ query: listAuditLogsQuerySchema }), AuditController.listLogs);
router.get("/:id", AuditController.getLogDetails);

export { router as auditRoutes };
