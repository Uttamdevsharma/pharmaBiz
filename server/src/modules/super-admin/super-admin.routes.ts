import { Router } from "express";
import { SuperAdminController } from "./super-admin.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validateRequest } from "../../middleware/validate";
import {
  createPlanSchema,
  updatePlanSchema,
  updateTenantStatusSchema,
  listTenantsQuerySchema,
  createPlatformStaffSchema,
  updatePlatformStaffSchema,
  updatePlatformRolePermissionsSchema,
} from "./super-admin.validation";

const router = Router();

// Base authentication
router.use(authenticate);

// Subscription Plans (Delegated platform management)
router.get("/plans", authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), SuperAdminController.listPlans);
router.post("/plans", authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), validateRequest({ body: createPlanSchema }), SuperAdminController.createPlan);
router.get("/plans/:id", authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), SuperAdminController.getPlanById);
router.patch("/plans/:id", authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), validateRequest({ body: updatePlanSchema }), SuperAdminController.updatePlan);
router.delete("/plans/:id", authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), SuperAdminController.deletePlan);

// Tenants Management (Delegated status & pharmacy management)
router.get("/tenants", authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), validateRequest({ query: listTenantsQuerySchema }), SuperAdminController.listTenants);
router.get("/tenants/:id", authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), SuperAdminController.getTenantDetails);
router.get("/tenants/:id/subscription", authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), SuperAdminController.getTenantSubscription);
router.patch(
  "/tenants/:id/status",
  authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]),
  validateRequest({ body: updateTenantStatusSchema }),
  SuperAdminController.updateTenantStatus
);

// Subscriptions Management
router.get("/subscriptions", authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), SuperAdminController.listSubscriptions);

// Platform Payments & Analytics
router.get("/payments", authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), SuperAdminController.listPayments);
router.get("/analytics", authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), SuperAdminController.getAnalytics);

// ==================== PLATFORM STAFF & DELEGATE ROLES (CTO / PROJECT MANAGER) ====================
router.get(
  "/staff",
  authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]),
  SuperAdminController.listPlatformStaff
);

router.post(
  "/staff",
  authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]),
  validateRequest({ body: createPlatformStaffSchema }),
  SuperAdminController.createPlatformStaff
);

router.patch(
  "/staff/:id",
  authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]),
  validateRequest({ body: updatePlatformStaffSchema }),
  SuperAdminController.updatePlatformStaff
);

router.patch(
  "/staff/:id/status",
  authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]),
  SuperAdminController.updatePlatformStaffStatus
);

router.delete(
  "/staff/:id",
  authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]),
  SuperAdminController.deletePlatformStaff
);

router.get(
  "/staff/permissions",
  authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]),
  SuperAdminController.getPlatformPermissions
);

router.post(
  "/staff/permissions",
  authorize(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]),
  validateRequest({ body: updatePlatformRolePermissionsSchema }),
  SuperAdminController.updatePlatformPermissions
);

export { router as superAdminRoutes };
