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
} from "./super-admin.validation";

const router = Router();

// All Super Admin routes are strictly authenticated and restricted to SUPER_ADMIN role
router.use(authenticate, authorize(["SUPER_ADMIN"]));

// Subscription Plans
router.get("/plans", SuperAdminController.listPlans);
router.post("/plans", validateRequest({ body: createPlanSchema }), SuperAdminController.createPlan);
router.get("/plans/:id", SuperAdminController.getPlanById);
router.patch("/plans/:id", validateRequest({ body: updatePlanSchema }), SuperAdminController.updatePlan);
router.delete("/plans/:id", SuperAdminController.deletePlan);

// Tenants Management
router.get("/tenants", validateRequest({ query: listTenantsQuerySchema }), SuperAdminController.listTenants);
router.get("/tenants/:id", SuperAdminController.getTenantDetails);
router.get("/tenants/:id/subscription", SuperAdminController.getTenantSubscription);
router.patch(
  "/tenants/:id/status",
  validateRequest({ body: updateTenantStatusSchema }),
  SuperAdminController.updateTenantStatus
);

// Subscriptions Management
router.get("/subscriptions", SuperAdminController.listSubscriptions);

// Platform Payments & Analytics
router.get("/payments", SuperAdminController.listPayments);
router.get("/analytics", SuperAdminController.getAnalytics);

export { router as superAdminRoutes };
