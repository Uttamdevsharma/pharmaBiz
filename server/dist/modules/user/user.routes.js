"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = require("express");
const user_controller_1 = require("./user.controller");
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
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
router.get("/roles", user_controller_1.UserController.listRoles);
router.post("/roles", (0, authorize_1.authorize)(["COMPANY_OWNER", "SUPER_ADMIN"]), (0, validate_1.validateRequest)({ body: user_validation_1.createPharmacyRoleSchema }), user_controller_1.UserController.createRole);
router.patch("/roles/:id", (0, authorize_1.authorize)(["COMPANY_OWNER", "SUPER_ADMIN"]), (0, validate_1.validateRequest)({ body: user_validation_1.updatePharmacyRoleSchema }), user_controller_1.UserController.updateRole);
router.delete("/roles/:id", (0, authorize_1.authorize)(["COMPANY_OWNER", "SUPER_ADMIN"]), user_controller_1.UserController.deleteRole);
// RBAC Permissions Info
router.get("/roles/permissions", user_controller_1.UserController.getPermissionsHierarchy);
router.post("/roles/permissions", (0, authorize_1.authorize)(["COMPANY_OWNER", "SUPER_ADMIN"]), (0, validate_1.validateRequest)({ body: user_validation_1.updateRolePermissionsSchema }), user_controller_1.UserController.updateRolePermissions);
// Staff Listing & Details
router.get("/", (0, validate_1.validateRequest)({ query: user_validation_1.listUsersQuerySchema }), user_controller_1.UserController.listUsers);
router.get("/:id", user_controller_1.UserController.getUserDetails);
// Staff Management
router.post("/", (0, authorize_1.authorize)(["COMPANY_OWNER", "SUPER_ADMIN"]), planLimiter_1.checkStaffLimit, (0, validate_1.validateRequest)({ body: user_validation_1.createUserSchema }), user_controller_1.UserController.createUser);
router.patch("/:id", (0, authorize_1.authorize)(["COMPANY_OWNER", "SUPER_ADMIN"]), (0, validate_1.validateRequest)({ body: user_validation_1.updateUserSchema }), user_controller_1.UserController.updateUser);
router.patch("/:id/status", (0, authorize_1.authorize)(["COMPANY_OWNER", "SUPER_ADMIN"]), user_controller_1.UserController.updateUserStatus);
router.delete("/:id", (0, authorize_1.authorize)(["COMPANY_OWNER", "SUPER_ADMIN"]), user_controller_1.UserController.deleteUser);
