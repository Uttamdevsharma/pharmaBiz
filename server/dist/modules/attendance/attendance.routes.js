"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendanceRoutes = void 0;
const express_1 = require("express");
const attendance_controller_1 = require("./attendance.controller");
const authenticate_1 = require("../../middleware/authenticate");
const requirePermission_1 = require("../../middleware/requirePermission");
const planLimiter_1 = require("../../middleware/planLimiter");
const validate_1 = require("../../middleware/validate");
const attendance_validation_1 = require("./attendance.validation");
const router = (0, express_1.Router)();
router.use(authenticate_1.authenticate, planLimiter_1.requireActiveSubscription);
// 1. Employee self-service: My Attendance History (accessible by any authenticated employee)
router.get("/my-history", attendance_controller_1.AttendanceController.getMyHistory);
// 2. Off-Day Configuration (Branch Manager / Owner)
router.get("/off-days", (0, requirePermission_1.requirePermission)("accounts.salaries"), attendance_controller_1.AttendanceController.getOffDays);
router.post("/off-days", (0, requirePermission_1.requirePermission)("attendance.manage"), (0, validate_1.validateRequest)({ body: attendance_validation_1.setBranchOffDayConfigSchema }), attendance_controller_1.AttendanceController.setOffDays);
// 3. Daily Attendance Management (Branch Manager / Owner)
router.get("/daily", (0, requirePermission_1.requirePermission)("attendance.manage"), attendance_controller_1.AttendanceController.getDailySheet);
router.post("/daily", (0, requirePermission_1.requirePermission)("attendance.manage"), (0, validate_1.validateRequest)({ body: attendance_validation_1.markBulkDailyAttendanceSchema }), attendance_controller_1.AttendanceController.markBulkDaily);
// 4. Employee Attendance History & Calculations (Branch Manager / Owner)
router.get("/employee-history/:userId", (0, requirePermission_1.requirePermission)("accounts.salaries"), attendance_controller_1.AttendanceController.getEmployeeHistory);
router.get("/employee-history", (0, requirePermission_1.requirePermission)("accounts.salaries"), attendance_controller_1.AttendanceController.getEmployeeHistory);
router.get("/salary-calc", (0, requirePermission_1.requirePermission)("accounts.salaries"), attendance_controller_1.AttendanceController.getSalaryCalc);
router.get("/summary", (0, requirePermission_1.requirePermission)("accounts.salaries"), attendance_controller_1.AttendanceController.getBranchSummary);
// 5. Dynamic Monthly Allowances (Branch Manager / Owner)
router.get("/allowances", (0, requirePermission_1.requirePermission)("accounts.salaries"), attendance_controller_1.AttendanceController.listAllowances);
router.post("/allowances", (0, requirePermission_1.requirePermission)("accounts.salaries"), (0, validate_1.validateRequest)({ body: attendance_validation_1.createAllowanceSchema }), attendance_controller_1.AttendanceController.addAllowance);
router.delete("/allowances/:id", (0, requirePermission_1.requirePermission)("accounts.salaries"), attendance_controller_1.AttendanceController.deleteAllowance);
// 6. Employee Resignation / Deactivation (Branch Manager / Owner)
router.post("/employees/:id/deactivate", (0, requirePermission_1.requirePermission)("accounts.salaries"), (0, validate_1.validateRequest)({ body: attendance_validation_1.deactivateEmployeeSchema }), attendance_controller_1.AttendanceController.deactivateEmployee);
router.post("/employees/:id/reactivate", (0, requirePermission_1.requirePermission)("accounts.salaries"), attendance_controller_1.AttendanceController.reactivateEmployee);
exports.attendanceRoutes = router;
