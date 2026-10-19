import { Router, Request, Response, NextFunction } from "express";
import { LiveChatController } from "./live-chat.controller";
import { validateRequest } from "../../middleware/validate";
import { authenticate } from "../../middleware/authenticate";
import {
  createSessionSchema,
  visitorMessageSchema,
  adminReplySchema,
  updateStatusSchema,
} from "./live-chat.validation";

// ==================== VISITOR PUBLIC ROUTES (/api/live-chat) ====================
const visitorRouter = Router();

visitorRouter.post(
  "/session",
  validateRequest({ body: createSessionSchema }),
  LiveChatController.createSession
);

visitorRouter.get(
  "/session",
  LiveChatController.getSession
);

visitorRouter.get(
  "/messages",
  LiveChatController.getMessages
);

visitorRouter.post(
  "/messages",
  validateRequest({ body: visitorMessageSchema }),
  LiveChatController.sendVisitorMessage
);

// ==================== SUPER ADMIN ROUTES (/api/super-admin/live-chat) ====================
const adminRouter = Router();

const requirePlatformStaff = (req: Request, res: Response, next: NextFunction): void => {
  const role = (req as any).user?.role;
  const isPlatform =
    role === "SUPER_ADMIN" ||
    role === "CTO" ||
    role === "PROJECT_MANAGER" ||
    role === "REGIONAL_ADMIN" ||
    !(req as any).user?.tenantId;

  if (!isPlatform) {
    res.status(403).json({
      success: false,
      message: "Forbidden - Platform support console privileges required",
    });
    return;
  }
  next();
};

adminRouter.use(authenticate);
adminRouter.use(requirePlatformStaff);

adminRouter.get("/sessions", LiveChatController.listAdminSessions);
adminRouter.get("/sessions/:id", LiveChatController.getAdminSessionDetails);
adminRouter.post(
  "/sessions/:id",
  validateRequest({ body: adminReplySchema }),
  LiveChatController.sendAdminReply
);
adminRouter.patch(
  "/sessions/:id",
  validateRequest({ body: updateStatusSchema }),
  LiveChatController.updateSessionStatus
);

export { visitorRouter as liveChatRoutes, adminRouter as superAdminLiveChatRoutes };
