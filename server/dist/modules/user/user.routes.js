"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = require("express");
const user_controller_1 = require("./user.controller");
const authenticate_1 = require("../../middleware/authenticate");
const requirePermission_1 = require("../../middleware/requirePermission");
const validate_1 = require("../../middleware/validate");
const planLimiter_1 = require("../../middleware/planLimiter");
const user_validation_1 = require("./user.validation");
const router = (0, express_1.Router)();
exports.userRoutes = router;
router.use(authenticate_1.authenticate, planLimiter_1.requireActiveSubscription);
// User Personal Self-Service Actions
router.post("/change-password", (0, validate_1.validateRequest)({ body: user_validation_1.changePasswordSchema }), user_controller_1.UserController.changePassword);
router.patch("/profile", (0, validate_1.validateRequest)({ body: user_validation_1.updateProfileSchema }), user_controller_1.UserController.updateProfile);
// Dynamic Pharmacy Roles CRUD
router.get("/roles", (0, requirePermission_1.requirePermission)("roles.manage"), user_controller_1.UserController.listRoles);
router.post("/roles", (0, requirePermission_1.requirePermission)("roles.manage"), (0, validate_1.validateRequest)({ body: user_validation_1.createPharmacyRoleSchema }), user_controller_1.UserController.createRole);
router.post("/roles/matrix", (0, requirePermission_1.requirePermission)("roles.manage"), (0, validate_1.validateRequest)({ body: user_validation_1.batchUpdateRolePermissionsSchema }), user_controller_1.UserController.batchUpdateRolePermissions);
router.patch("/roles/:id", (0, requirePermission_1.requirePermission)("roles.manage"), (0, validate_1.validateRequest)({ body: user_validation_1.updatePharmacyRoleSchema }), user_controller_1.UserController.updateRole);
router.delete("/roles/:id", (0, requirePermission_1.requirePermission)("roles.manage"), user_controller_1.UserController.deleteRole);
// RBAC Permissions Info
router.get("/roles/permissions", (0, requirePermission_1.requirePermission)("roles.manage"), user_controller_1.UserController.getPermissionsHierarchy);
router.post("/roles/permissions", (0, requirePermission_1.requirePermission)("roles.manage"), (0, validate_1.validateRequest)({ body: user_validation_1.updateRolePermissionsSchema }), user_controller_1.UserController.updateRolePermissions);
// Staff Listing & Details
router.get("/", (0, requirePermission_1.requirePermission)("staff.view"), (0, validate_1.validateRequest)({ query: user_validation_1.listUsersQuerySchema }), user_controller_1.UserController.listUsers);
router.get("/:id", (0, requirePermission_1.requirePermission)("staff.view"), user_controller_1.UserController.getUserDetails);
// Staff Management
router.post("/", (0, requirePermission_1.requirePermission)("staff.manage"), planLimiter_1.checkStaffLimit, (0, validate_1.validateRequest)({ body: user_validation_1.createUserSchema }), user_controller_1.UserController.createUser);
router.patch("/:id", (0, requirePermission_1.requirePermission)("staff.manage"), (0, validate_1.validateRequest)({ body: user_validation_1.updateUserSchema }), user_controller_1.UserController.updateUser);
router.patch("/:id/status", (0, requirePermission_1.requirePermission)("staff.manage"), user_controller_1.UserController.updateUserStatus);
router.delete("/:id", (0, requirePermission_1.requirePermission)("staff.manage"), user_controller_1.UserController.deleteUser);
