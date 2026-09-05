import { Router } from "express";
import { SuperAdminController } from "./super-admin.controller";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission } from "../../middleware/requirePermission";
import { validateRequest } from "../../middleware/validate";
import {
  createPlanSchema,
  updatePlanSchema,
  updateTenantStatusSchema,
  listTenantsQuerySchema,
  createRoleSchema,
  updateRoleSchema,
  createPlatformStaffSchema,
  updatePlatformStaffSchema,
  updatePlatformRolePermissionsSchema,
} from "./super-admin.validation";

const router = Router();

// Base authentication
router.use(authenticate);

// ==================== SUBSCRIPTION PLANS ====================
router.get("/plans", requirePermission("plans.manage"), SuperAdminController.listPlans);
router.post("/plans", requirePermission("plans.manage"), validateRequest({ body: createPlanSchema }), SuperAdminController.createPlan);
router.get("/plans/:id", requirePermission("plans.manage"), SuperAdminController.getPlanById);
router.patch("/plans/:id", requirePermission("plans.manage"), validateRequest({ body: updatePlanSchema }), SuperAdminController.updatePlan);
router.delete("/plans/:id", requirePermission("plans.manage"), SuperAdminController.deletePlan);

// ==================== PHARMACIES & TENANTS ====================
router.get("/tenants", requirePermission("pharmacies.manage"), validateRequest({ query: listTenantsQuerySchema }), SuperAdminController.listTenants);
router.get("/tenants/:id", requirePermission("pharmacies.manage"), SuperAdminController.getTenantDetails);
router.get("/tenants/:id/subscription", requirePermission("pharmacies.manage"), SuperAdminController.getTenantSubscription);
router.patch(
  "/tenants/:id/status",
  requirePermission("pharmacies.manage"),
  validateRequest({ body: updateTenantStatusSchema }),
  SuperAdminController.updateTenantStatus
);

// ==================== PHARMACY VERIFICATIONS & APPROVALS ====================
router.get("/verifications", requirePermission("pharmacies.manage"), SuperAdminController.listPharmacyVerifications);
router.get("/verifications/:id", requirePermission("pharmacies.manage"), SuperAdminController.getPharmacyVerification);
router.post("/verifications/:id/approve", requirePermission("pharmacies.manage"), SuperAdminController.approvePharmacyVerification);
router.post("/verifications/:id/reject", requirePermission("pharmacies.manage"), SuperAdminController.rejectPharmacyVerification);

// ==================== SUBSCRIPTIONS ====================
router.get("/subscriptions", requirePermission("subscriptions.manage"), SuperAdminController.listSubscriptions);

// ==================== PAYMENTS & ANALYTICS ====================
router.get("/payments", requirePermission("payments.view"), SuperAdminController.listPayments);
router.get("/analytics", requirePermission("reports.view"), SuperAdminController.getAnalytics);

// ==================== DYNAMIC ROLES & PERMISSIONS ====================
router.get("/roles", requirePermission("roles.manage"), SuperAdminController.listRoles);
router.post("/roles", requirePermission("roles.manage"), validateRequest({ body: createRoleSchema }), SuperAdminController.createRole);
router.patch("/roles/:id", requirePermission("roles.manage"), validateRequest({ body: updateRoleSchema }), SuperAdminController.updateRole);
router.delete("/roles/:id", requirePermission("roles.manage"), SuperAdminController.deleteRole);

// ==================== PLATFORM STAFF ====================
router.get(
  "/staff",
  requirePermission("staff.manage"),
  SuperAdminController.listPlatformStaff
);

router.post(
  "/staff",
  requirePermission("staff.create"),
  validateRequest({ body: createPlatformStaffSchema }),
  SuperAdminController.createPlatformStaff
);

router.patch(
  "/staff/:id",
  requirePermission("staff.manage"),
  validateRequest({ body: updatePlatformStaffSchema }),
  SuperAdminController.updatePlatformStaff
);

router.patch(
  "/staff/:id/status",
  requirePermission("staff.manage"),
  SuperAdminController.updatePlatformStaffStatus
);

router.delete(
  "/staff/:id",
  requirePermission("staff.manage"),
  SuperAdminController.deletePlatformStaff
);

// Platform Permissions Metadata & Hierarchy
router.get(
  "/staff/permissions",
  SuperAdminController.getPlatformPermissions
);

router.post(
  "/staff/permissions",
  requirePermission("roles.manage"),
  validateRequest({ body: updatePlatformRolePermissionsSchema }),
  SuperAdminController.updatePlatformPermissions
);

export { router as superAdminRoutes };

