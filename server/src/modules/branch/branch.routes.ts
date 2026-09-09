import { Router } from "express";
import { BranchController } from "./branch.controller";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission } from "../../middleware/requirePermission";
import { validateRequest } from "../../middleware/validate";
import { requireActiveSubscription, checkBranchLimit } from "../../middleware/planLimiter";
import { createBranchSchema, updateBranchSchema } from "./branch.validation";

const router = Router();

router.use(authenticate, requireActiveSubscription);

router.get("/", BranchController.listBranches);
router.get("/:id", BranchController.getBranchDetails);

router.post(
  "/",
  requirePermission("branches.manage"),
  checkBranchLimit,
  validateRequest({ body: createBranchSchema }),
  BranchController.createBranch
);

router.patch(
  "/:id",
  requirePermission("branches.manage"),
  validateRequest({ body: updateBranchSchema }),
  BranchController.updateBranch
);

router.delete(
  "/:id",
  requirePermission("branches.manage"),
  BranchController.deleteBranch
);

export { router as branchRoutes };
