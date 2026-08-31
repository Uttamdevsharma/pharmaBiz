import { Router } from "express";
import { NotificationController } from "./notification.controller";
import { authenticate } from "../../middleware/authenticate";
import { validateRequest } from "../../middleware/validate";
import { requireActiveSubscription } from "../../middleware/planLimiter";
import { listNotificationsQuerySchema } from "./notification.validation";

const router = Router();

router.use(authenticate, requireActiveSubscription);

router.get("/", validateRequest({ query: listNotificationsQuerySchema }), NotificationController.listNotifications);
router.get("/low-stock", NotificationController.getLowStockAlerts);
router.get("/expiry", NotificationController.getExpiryAlerts);
router.get("/sync-failures", NotificationController.getSyncFailureAlerts);

router.patch("/read-all", NotificationController.markAllAsRead);
router.patch("/:id/read", NotificationController.markAsRead);

export { router as notificationRoutes };
