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
// Base authentication
router.use(authenticate_1.authenticate);
// Subscription Plans (Delegated platform management)
router.get("/plans", (0, authorize_1.authorize)(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), super_admin_controller_1.SuperAdminController.listPlans);
router.post("/plans", (0, authorize_1.authorize)(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), (0, validate_1.validateRequest)({ body: super_admin_validation_1.createPlanSchema }), super_admin_controller_1.SuperAdminController.createPlan);
router.get("/plans/:id", (0, authorize_1.authorize)(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), super_admin_controller_1.SuperAdminController.getPlanById);
router.patch("/plans/:id", (0, authorize_1.authorize)(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), (0, validate_1.validateRequest)({ body: super_admin_validation_1.updatePlanSchema }), super_admin_controller_1.SuperAdminController.updatePlan);
router.delete("/plans/:id", (0, authorize_1.authorize)(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), super_admin_controller_1.SuperAdminController.deletePlan);
// Tenants Management (Delegated status & pharmacy management)
router.get("/tenants", (0, authorize_1.authorize)(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), (0, validate_1.validateRequest)({ query: super_admin_validation_1.listTenantsQuerySchema }), super_admin_controller_1.SuperAdminController.listTenants);
router.get("/tenants/:id", (0, authorize_1.authorize)(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), super_admin_controller_1.SuperAdminController.getTenantDetails);
router.get("/tenants/:id/subscription", (0, authorize_1.authorize)(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), super_admin_controller_1.SuperAdminController.getTenantSubscription);
router.patch("/tenants/:id/status", (0, authorize_1.authorize)(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), (0, validate_1.validateRequest)({ body: super_admin_validation_1.updateTenantStatusSchema }), super_admin_controller_1.SuperAdminController.updateTenantStatus);
// Subscriptions Management
router.get("/subscriptions", (0, authorize_1.authorize)(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), super_admin_controller_1.SuperAdminController.listSubscriptions);
// Platform Payments & Analytics
router.get("/payments", (0, authorize_1.authorize)(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), super_admin_controller_1.SuperAdminController.listPayments);
router.get("/analytics", (0, authorize_1.authorize)(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), super_admin_controller_1.SuperAdminController.getAnalytics);
// ==================== PLATFORM STAFF & DELEGATE ROLES (CTO / PROJECT MANAGER) ====================
router.get("/staff", (0, authorize_1.authorize)(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), super_admin_controller_1.SuperAdminController.listPlatformStaff);
router.post("/staff", (0, authorize_1.authorize)(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), (0, validate_1.validateRequest)({ body: super_admin_validation_1.createPlatformStaffSchema }), super_admin_controller_1.SuperAdminController.createPlatformStaff);
router.patch("/staff/:id", (0, authorize_1.authorize)(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), (0, validate_1.validateRequest)({ body: super_admin_validation_1.updatePlatformStaffSchema }), super_admin_controller_1.SuperAdminController.updatePlatformStaff);
router.patch("/staff/:id/status", (0, authorize_1.authorize)(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), super_admin_controller_1.SuperAdminController.updatePlatformStaffStatus);
router.delete("/staff/:id", (0, authorize_1.authorize)(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), super_admin_controller_1.SuperAdminController.deletePlatformStaff);
router.get("/staff/permissions", (0, authorize_1.authorize)(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), super_admin_controller_1.SuperAdminController.getPlatformPermissions);
router.post("/staff/permissions", (0, authorize_1.authorize)(["SUPER_ADMIN", "CTO", "PROJECT_MANAGER"]), (0, validate_1.validateRequest)({ body: super_admin_validation_1.updatePlatformRolePermissionsSchema }), super_admin_controller_1.SuperAdminController.updatePlatformPermissions);
