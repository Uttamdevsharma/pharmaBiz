"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.superAdminRoutes = void 0;
const express_1 = require("express");
const super_admin_controller_1 = require("./super-admin.controller");
const authenticate_1 = require("../../middleware/authenticate");
const requirePermission_1 = require("../../middleware/requirePermission");
const validate_1 = require("../../middleware/validate");
const super_admin_validation_1 = require("./super-admin.validation");
const router = (0, express_1.Router)();
exports.superAdminRoutes = router;
// Base authentication
router.use(authenticate_1.authenticate);
// ==================== SUBSCRIPTION PLANS ====================
router.get("/plans", (0, requirePermission_1.requirePermission)("plans.manage"), super_admin_controller_1.SuperAdminController.listPlans);
router.post("/plans", (0, requirePermission_1.requirePermission)("plans.manage"), (0, validate_1.validateRequest)({ body: super_admin_validation_1.createPlanSchema }), super_admin_controller_1.SuperAdminController.createPlan);
router.get("/plans/:id", (0, requirePermission_1.requirePermission)("plans.manage"), super_admin_controller_1.SuperAdminController.getPlanById);
router.patch("/plans/:id", (0, requirePermission_1.requirePermission)("plans.manage"), (0, validate_1.validateRequest)({ body: super_admin_validation_1.updatePlanSchema }), super_admin_controller_1.SuperAdminController.updatePlan);
router.delete("/plans/:id", (0, requirePermission_1.requirePermission)("plans.manage"), super_admin_controller_1.SuperAdminController.deletePlan);
// ==================== PHARMACIES & TENANTS ====================
router.get("/tenants", (0, requirePermission_1.requirePermission)("pharmacies.manage"), (0, validate_1.validateRequest)({ query: super_admin_validation_1.listTenantsQuerySchema }), super_admin_controller_1.SuperAdminController.listTenants);
router.get("/tenants/:id", (0, requirePermission_1.requirePermission)("pharmacies.manage"), super_admin_controller_1.SuperAdminController.getTenantDetails);
router.get("/tenants/:id/subscription", (0, requirePermission_1.requirePermission)("pharmacies.manage"), super_admin_controller_1.SuperAdminController.getTenantSubscription);
router.patch("/tenants/:id/status", (0, requirePermission_1.requirePermission)("pharmacies.manage"), (0, validate_1.validateRequest)({ body: super_admin_validation_1.updateTenantStatusSchema }), super_admin_controller_1.SuperAdminController.updateTenantStatus);
// ==================== PHARMACY VERIFICATIONS & APPROVALS ====================
router.get("/verifications", (0, requirePermission_1.requirePermission)("pharmacies.manage"), super_admin_controller_1.SuperAdminController.listPharmacyVerifications);
router.get("/verifications/:id", (0, requirePermission_1.requirePermission)("pharmacies.manage"), super_admin_controller_1.SuperAdminController.getPharmacyVerification);
router.post("/verifications/:id/approve", (0, requirePermission_1.requirePermission)("pharmacies.manage"), super_admin_controller_1.SuperAdminController.approvePharmacyVerification);
router.post("/verifications/:id/reject", (0, requirePermission_1.requirePermission)("pharmacies.manage"), super_admin_controller_1.SuperAdminController.rejectPharmacyVerification);
// ==================== SUBSCRIPTIONS ====================
router.get("/subscriptions", (0, requirePermission_1.requirePermission)("subscriptions.manage"), super_admin_controller_1.SuperAdminController.listSubscriptions);
// ==================== PAYMENTS & ANALYTICS ====================
router.get("/payments", (0, requirePermission_1.requirePermission)("payments.view"), super_admin_controller_1.SuperAdminController.listPayments);
router.get("/analytics", (0, requirePermission_1.requirePermission)("reports.view"), super_admin_controller_1.SuperAdminController.getAnalytics);
// ==================== DYNAMIC ROLES & PERMISSIONS ====================
router.get("/roles", (0, requirePermission_1.requirePermission)("roles.manage"), super_admin_controller_1.SuperAdminController.listRoles);
router.post("/roles", (0, requirePermission_1.requirePermission)("roles.manage"), (0, validate_1.validateRequest)({ body: super_admin_validation_1.createRoleSchema }), super_admin_controller_1.SuperAdminController.createRole);
router.post("/roles/matrix", (0, requirePermission_1.requirePermission)("roles.manage"), (0, validate_1.validateRequest)({ body: super_admin_validation_1.batchUpdatePlatformRolePermissionsSchema }), super_admin_controller_1.SuperAdminController.batchUpdateRolePermissions);
router.patch("/roles/:id", (0, requirePermission_1.requirePermission)("roles.manage"), (0, validate_1.validateRequest)({ body: super_admin_validation_1.updateRoleSchema }), super_admin_controller_1.SuperAdminController.updateRole);
router.delete("/roles/:id", (0, requirePermission_1.requirePermission)("roles.manage"), super_admin_controller_1.SuperAdminController.deleteRole);
// ==================== PLATFORM STAFF ====================
router.get("/staff", (0, requirePermission_1.requirePermission)("staff.manage"), super_admin_controller_1.SuperAdminController.listPlatformStaff);
router.post("/staff", (0, requirePermission_1.requirePermission)("staff.create"), (0, validate_1.validateRequest)({ body: super_admin_validation_1.createPlatformStaffSchema }), super_admin_controller_1.SuperAdminController.createPlatformStaff);
router.patch("/staff/:id", (0, requirePermission_1.requirePermission)("staff.manage"), (0, validate_1.validateRequest)({ body: super_admin_validation_1.updatePlatformStaffSchema }), super_admin_controller_1.SuperAdminController.updatePlatformStaff);
router.patch("/staff/:id/status", (0, requirePermission_1.requirePermission)("staff.manage"), super_admin_controller_1.SuperAdminController.updatePlatformStaffStatus);
router.delete("/staff/:id", (0, requirePermission_1.requirePermission)("staff.manage"), super_admin_controller_1.SuperAdminController.deletePlatformStaff);
// Platform Permissions Metadata & Hierarchy
router.get("/staff/permissions", super_admin_controller_1.SuperAdminController.getPlatformPermissions);
router.post("/staff/permissions", (0, requirePermission_1.requirePermission)("roles.manage"), (0, validate_1.validateRequest)({ body: super_admin_validation_1.updatePlatformRolePermissionsSchema }), super_admin_controller_1.SuperAdminController.updatePlatformPermissions);
