import { Router } from "express";
import { SettingsController } from "./settings.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { requirePermission } from "../../middleware/requirePermission";
import { validateRequest } from "../../middleware/validate";
import { updatePlatformSettingsSchema } from "./settings.validation";

const router = Router();

// Public route for public landing page
router.get("/public", SettingsController.getPublicSettings);

// Super Admin & Platform Delegate protected routes
router.get(
  "/admin",
  authenticate,
  authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]),
  SettingsController.getAdminSettings
);

router.patch(
  "/admin",
  authenticate,
  authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]),
  validateRequest({ body: updatePlatformSettingsSchema }),
  SettingsController.updateSettings
);

// Pharmacy Tenant VAT & Tax Configuration
router.get("/vat", authenticate, SettingsController.getTenantVatSettings);
router.put(
  "/vat",
  authenticate,
  requirePermission("pos.vat"),
  SettingsController.updateTenantVatSettings
);

export { router as settingsRoutes };
