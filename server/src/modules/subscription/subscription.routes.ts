import { Router } from "express";
import { SubscriptionController } from "./subscription.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validateRequest } from "../../middleware/validate";
import {
  subscribeSchema,
  changePlanSchema,
  cancelSubscriptionSchema,
} from "./subscription.validation";

const router = Router();

// Publicly viewable active plans
router.get("/plans", SubscriptionController.listPlans);
router.get("/plans/:id", SubscriptionController.getPlanDetails);

// Tenant-scoped subscription actions (Company Owner)
router.get("/current", authenticate, SubscriptionController.getCurrentSubscription);
router.get("/history", authenticate, SubscriptionController.getSubscriptionHistory);

router.post(
  "/subscribe",
  authenticate,
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  validateRequest({ body: subscribeSchema }),
  SubscriptionController.subscribe
);

router.post(
  "/change-plan",
  authenticate,
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  validateRequest({ body: changePlanSchema }),
  SubscriptionController.changePlan
);

router.post(
  "/renew",
  authenticate,
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  SubscriptionController.renew
);

router.post(
  "/cancel",
  authenticate,
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  validateRequest({ body: cancelSubscriptionSchema }),
  SubscriptionController.cancel
);

router.post(
  "/check-expiry-reminders",
  authenticate,
  authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]),
  SubscriptionController.triggerExpiryCheck
);

export { router as subscriptionRoutes };
