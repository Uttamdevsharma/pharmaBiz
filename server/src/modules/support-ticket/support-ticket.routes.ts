import { Router, Request, Response, NextFunction } from "express";
import { SupportTicketController } from "./support-ticket.controller";
import { authenticate } from "../../middleware/authenticate";
import { validateRequest } from "../../middleware/validate";
import {
  createTicketSchema,
  createReplySchema,
  updateTicketStatusSchema,
} from "./support-ticket.validation";

// ==================== TENANT SUPPORT TICKET ROUTES (/api/tenant/support-tickets) ====================
const tenantRouter = Router();

tenantRouter.use(authenticate);

tenantRouter.get("/", SupportTicketController.listTenantTickets);
tenantRouter.post(
  "/",
  validateRequest({ body: createTicketSchema }),
  SupportTicketController.createTenantTicket
);
tenantRouter.get("/:id", SupportTicketController.getTenantTicketDetails);
tenantRouter.post(
  "/:id/replies",
  validateRequest({ body: createReplySchema }),
  SupportTicketController.addTenantReply
);
tenantRouter.patch(
  "/:id",
  validateRequest({ body: updateTicketStatusSchema }),
  SupportTicketController.updateTicketStatus
);

// ==================== SUPER ADMIN SUPPORT TICKET ROUTES (/api/super-admin/support-tickets) ====================
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

adminRouter.get("/", SupportTicketController.listAdminTickets);
adminRouter.get("/:id", SupportTicketController.getAdminTicketDetails);
adminRouter.post(
  "/:id/replies",
  validateRequest({ body: createReplySchema }),
  SupportTicketController.addAdminReply
);
adminRouter.patch(
  "/:id",
  validateRequest({ body: updateTicketStatusSchema }),
  SupportTicketController.updateTicketStatus
);

export { tenantRouter as tenantSupportTicketRoutes, adminRouter as superAdminSupportTicketRoutes };
