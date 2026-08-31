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
} from "./user.validation";

const router = Router();

router.use(authenticate, requireActiveSubscription);

// RBAC Permissions Info
router.get("/roles/permissions", UserController.getPermissionsHierarchy);

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

export { router as userRoutes };
