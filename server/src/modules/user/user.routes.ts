import { Router } from "express";
import { UserController } from "./user.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { requirePermission } from "../../middleware/requirePermission";
import { validateRequest } from "../../middleware/validate";
import { requireActiveSubscription, checkStaffLimit } from "../../middleware/planLimiter";
import {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  createPharmacyRoleSchema,
  updatePharmacyRoleSchema,
  updateRolePermissionsSchema,
  batchUpdateRolePermissionsSchema,
  changePasswordSchema,
  updateProfileSchema,
} from "./user.validation";

const router = Router();

router.use(authenticate, requireActiveSubscription);

// User Personal Self-Service Actions
router.post(
  "/change-password",
  validateRequest({ body: changePasswordSchema }),
  UserController.changePassword
);
router.patch(
  "/profile",
  validateRequest({ body: updateProfileSchema }),
  UserController.updateProfile
);

// Dynamic Pharmacy Roles CRUD
router.get("/roles", requirePermission("roles.manage"), UserController.listRoles);
router.post(
  "/roles",
  requirePermission("roles.manage"),
  validateRequest({ body: createPharmacyRoleSchema }),
  UserController.createRole
);
router.post(
  "/roles/matrix",
  requirePermission("roles.manage"),
  validateRequest({ body: batchUpdateRolePermissionsSchema }),
  UserController.batchUpdateRolePermissions
);
router.patch(
  "/roles/:id",
  requirePermission("roles.manage"),
  validateRequest({ body: updatePharmacyRoleSchema }),
  UserController.updateRole
);
router.delete(
  "/roles/:id",
  requirePermission("roles.manage"),
  UserController.deleteRole
);

// RBAC Permissions Info
router.get("/roles/permissions", requirePermission("roles.manage"), UserController.getPermissionsHierarchy);
router.post(
  "/roles/permissions",
  requirePermission("roles.manage"),
  validateRequest({ body: updateRolePermissionsSchema }),
  UserController.updateRolePermissions
);

// Staff Listing & Details
router.get("/", requirePermission("staff.view"), validateRequest({ query: listUsersQuerySchema }), UserController.listUsers);
router.get("/:id", requirePermission("staff.view"), UserController.getUserDetails);

// Staff Management
router.post(
  "/",
  requirePermission("staff.manage"),
  checkStaffLimit,
  validateRequest({ body: createUserSchema }),
  UserController.createUser
);

router.patch(
  "/:id",
  requirePermission("staff.manage"),
  validateRequest({ body: updateUserSchema }),
  UserController.updateUser
);

router.patch(
  "/:id/status",
  requirePermission("staff.manage"),
  UserController.updateUserStatus
);

router.delete(
  "/:id",
  requirePermission("staff.manage"),
  UserController.deleteUser
);

export { router as userRoutes };
