"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.superAdminRoutes = void 0;
const express_1 = require("express");
const super_admin_controller_1 = require("./super-admin.controller");
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const validate_1 = require("../../middleware/validate");
const super_admin_validation_1 = require("./super-admin.validation");
const router = (0, express_1.Router)();
exports.superAdminRoutes = router;
// All Super Admin routes are strictly authenticated and restricted to SUPER_ADMIN role
router.use(authenticate_1.authenticate, (0, authorize_1.authorize)(["SUPER_ADMIN"]));
// Subscription Plans
router.get("/plans", super_admin_controller_1.SuperAdminController.listPlans);
router.post("/plans", (0, validate_1.validateRequest)({ body: super_admin_validation_1.createPlanSchema }), super_admin_controller_1.SuperAdminController.createPlan);
router.get("/plans/:id", super_admin_controller_1.SuperAdminController.getPlanById);
router.patch("/plans/:id", (0, validate_1.validateRequest)({ body: super_admin_validation_1.updatePlanSchema }), super_admin_controller_1.SuperAdminController.updatePlan);
router.delete("/plans/:id", super_admin_controller_1.SuperAdminController.deletePlan);
// Tenants Management
router.get("/tenants", (0, validate_1.validateRequest)({ query: super_admin_validation_1.listTenantsQuerySchema }), super_admin_controller_1.SuperAdminController.listTenants);
router.get("/tenants/:id", super_admin_controller_1.SuperAdminController.getTenantDetails);
router.get("/tenants/:id/subscription", super_admin_controller_1.SuperAdminController.getTenantSubscription);
router.patch("/tenants/:id/status", (0, validate_1.validateRequest)({ body: super_admin_validation_1.updateTenantStatusSchema }), super_admin_controller_1.SuperAdminController.updateTenantStatus);
// Subscriptions Management
router.get("/subscriptions", super_admin_controller_1.SuperAdminController.listSubscriptions);
// Platform Payments & Analytics
router.get("/payments", super_admin_controller_1.SuperAdminController.listPayments);
router.get("/analytics", super_admin_controller_1.SuperAdminController.getAnalytics);
