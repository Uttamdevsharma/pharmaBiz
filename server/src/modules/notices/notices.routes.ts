import { Router, Request, Response, NextFunction } from "express";
import { NoticesController } from "./notices.controller";
import { authenticate } from "../../middleware/authenticate";
import { validateRequest } from "../../middleware/validate";
import {
  CreateNoticeSchema,
  UpdateNoticeSchema,
  MarkNoticeReadSchema,
} from "./notices.validation";

// Platform staff authorization guard
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
      message: "Forbidden - Platform admin privileges required",
    });
    return;
  }
  next();
};

// --- Super Admin Router ---
export const superAdminNoticeRoutes = Router();

superAdminNoticeRoutes.use(authenticate);
superAdminNoticeRoutes.use(requirePlatformStaff);

superAdminNoticeRoutes.get("/", NoticesController.superAdminList);
superAdminNoticeRoutes.post(
  "/",
  validateRequest({ body: CreateNoticeSchema }),
  NoticesController.superAdminCreate
);
superAdminNoticeRoutes.put(
  "/:id",
  validateRequest({ body: UpdateNoticeSchema }),
  NoticesController.superAdminUpdate
);
superAdminNoticeRoutes.delete("/:id", NoticesController.superAdminDelete);
superAdminNoticeRoutes.get(
  "/eligible-businesses",
  NoticesController.superAdminGetEligibleBusinesses
);

// --- Tenant Router ---
export const tenantNoticeRoutes = Router();

tenantNoticeRoutes.use(authenticate);

tenantNoticeRoutes.get("/", NoticesController.tenantList);
tenantNoticeRoutes.post(
  "/mark-read",
  validateRequest({ body: MarkNoticeReadSchema }),
  NoticesController.tenantMarkRead
);
