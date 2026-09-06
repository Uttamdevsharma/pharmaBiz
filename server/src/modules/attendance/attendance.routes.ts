import { Router } from "express";
import { AttendanceController } from "./attendance.controller";
import { authenticate } from "../../middleware/authenticate";
import { requirePermission } from "../../middleware/requirePermission";
import { requireActiveSubscription } from "../../middleware/planLimiter";
import { validateRequest } from "../../middleware/validate";
import {
  setBranchOffDayConfigSchema,
  markBulkDailyAttendanceSchema,
  createAllowanceSchema,
  deactivateEmployeeSchema,
} from "./attendance.validation";

const router = Router();

router.use(authenticate, requireActiveSubscription);

// 1. Employee self-service: My Attendance History (accessible by any authenticated employee)
router.get("/my-history", AttendanceController.getMyHistory);

// 2. Off-Day Configuration (Branch Manager / Owner)
router.get(
  "/off-days",
  requirePermission("accounts.salaries"),
  AttendanceController.getOffDays
);
router.post(
  "/off-days",
  requirePermission("attendance.manage"),
  validateRequest({ body: setBranchOffDayConfigSchema }),
  AttendanceController.setOffDays
);

// 3. Daily Attendance Management (Branch Manager / Owner)
router.get(
  "/daily",
  requirePermission("attendance.manage"),
  AttendanceController.getDailySheet
);
router.post(
  "/daily",
  requirePermission("attendance.manage"),
  validateRequest({ body: markBulkDailyAttendanceSchema }),
  AttendanceController.markBulkDaily
);

// 4. Employee Attendance History & Calculations (Branch Manager / Owner)
router.get(
  "/employee-history/:userId",
  requirePermission("accounts.salaries"),
  AttendanceController.getEmployeeHistory
);
router.get(
  "/employee-history",
  requirePermission("accounts.salaries"),
  AttendanceController.getEmployeeHistory
);

router.get(
  "/salary-calc",
  requirePermission("accounts.salaries"),
  AttendanceController.getSalaryCalc
);

router.get(
  "/summary",
  requirePermission("accounts.salaries"),
  AttendanceController.getBranchSummary
);

// 5. Dynamic Monthly Allowances (Branch Manager / Owner)
router.get(
  "/allowances",
  requirePermission("accounts.salaries"),
  AttendanceController.listAllowances
);
router.post(
  "/allowances",
  requirePermission("accounts.salaries"),
  validateRequest({ body: createAllowanceSchema }),
  AttendanceController.addAllowance
);
router.delete(
  "/allowances/:id",
  requirePermission("accounts.salaries"),
  AttendanceController.deleteAllowance
);

// 6. Employee Resignation / Deactivation (Branch Manager / Owner)
router.post(
  "/employees/:id/deactivate",
  requirePermission("accounts.salaries"),
  validateRequest({ body: deactivateEmployeeSchema }),
  AttendanceController.deactivateEmployee
);
router.post(
  "/employees/:id/reactivate",
  requirePermission("accounts.salaries"),
  AttendanceController.reactivateEmployee
);

export const attendanceRoutes = router;
