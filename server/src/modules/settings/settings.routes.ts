import { Router } from "express";
import { SettingsController } from "./settings.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validateRequest } from "../../middleware/validate";
import { updatePlatformSettingsSchema } from "./settings.validation";

const router = Router();

// Public route for public landing page
router.get("/public", SettingsController.getPublicSettings);

// Super Admin protected routes
router.get(
  "/admin",
  authenticate,
  authorize(["SUPER_ADMIN"]),
  SettingsController.getAdminSettings
);

router.patch(
  "/admin",
  authenticate,
  authorize(["SUPER_ADMIN"]),
  validateRequest({ body: updatePlatformSettingsSchema }),
  SettingsController.updateSettings
);

export { router as settingsRoutes };
