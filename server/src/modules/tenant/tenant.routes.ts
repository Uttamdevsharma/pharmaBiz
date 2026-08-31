import { Router } from "express";
import { TenantController } from "./tenant.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validateRequest } from "../../middleware/validate";
import { updateTenantProfileSchema } from "./tenant.validation";

const router = Router();

router.use(authenticate);

router.get("/profile", TenantController.getProfile);
router.patch(
  "/profile",
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  validateRequest({ body: updateTenantProfileSchema }),
  TenantController.updateProfile
);
router.get("/subscription", TenantController.getSubscription);
router.get("/usage", TenantController.getUsage);

export { router as tenantRoutes };
