import { Router } from "express";
import { UserController } from "./user.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validateRequest } from "../../middleware/validate";
import { requireActiveSubscription, checkStaffLimit } from "../../middleware/planLimiter";
import {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  createPharmacyRoleSchema,
  updatePharmacyRoleSchema,
  updateRolePermissionsSchema,
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
router.get("/roles", UserController.listRoles);
router.post(
  "/roles",
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  validateRequest({ body: createPharmacyRoleSchema }),
  UserController.createRole
);
router.patch(
  "/roles/:id",
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  validateRequest({ body: updatePharmacyRoleSchema }),
  UserController.updateRole
);
router.delete(
  "/roles/:id",
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  UserController.deleteRole
);

// RBAC Permissions Info
router.get("/roles/permissions", UserController.getPermissionsHierarchy);
router.post(
  "/roles/permissions",
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  validateRequest({ body: updateRolePermissionsSchema }),
  UserController.updateRolePermissions
);

// Staff Listing & Details
router.get("/", validateRequest({ query: listUsersQuerySchema }), UserController.listUsers);
router.get("/:id", UserController.getUserDetails);

// Staff Management
router.post(
  "/",
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  checkStaffLimit,
  validateRequest({ body: createUserSchema }),
  UserController.createUser
);

router.patch(
  "/:id",
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  validateRequest({ body: updateUserSchema }),
  UserController.updateUser
);

router.patch(
  "/:id/status",
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  UserController.updateUserStatus
);

router.delete(
  "/:id",
  authorize(["COMPANY_OWNER", "SUPER_ADMIN"]),
  UserController.deleteUser
);

export { router as userRoutes };
