import { Router } from "express";
import { BranchController } from "./branch.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validateRequest } from "../../middleware/validate";
import { requireActiveSubscription, checkBranchLimit } from "../../middleware/planLimiter";
import { createBranchSchema, updateBranchSchema } from "./branch.validation";

const router = Router();

router.use(authenticate, requireActiveSubscription);

router.get("/", BranchController.listBranches);
router.get("/:id", BranchController.getBranchDetails);

router.post(
  "/",
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  checkBranchLimit,
  validateRequest({ body: createBranchSchema }),
  BranchController.createBranch
);

router.patch(
  "/:id",
  authorize(["COMPANY_OWNER", "REGIONAL_ADMIN", "SUPER_ADMIN"]),
  validateRequest({ body: updateBranchSchema }),
  BranchController.updateBranch
);

router.delete(
  "/:id",
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  BranchController.deleteBranch
);

export { router as branchRoutes };
