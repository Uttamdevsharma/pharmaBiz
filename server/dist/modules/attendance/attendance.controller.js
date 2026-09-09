"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceController = void 0;
const attendance_service_1 = require("./attendance.service");
class AttendanceController {
    static resolveBranchId(req) {
        const userRole = req.user.role;
        const userBranchId = req.user.branchId;
        const queryBranchId = req.query.branchId || req.body?.branchId;
        if (userRole === "COMPANY_OWNER" || userRole === "SUPER_ADMIN" || userRole === "REGIONAL_ADMIN") {
            return queryBranchId || userBranchId || "";
        }
        // Branch manager or other staff must be scoped to their assigned branch
        return userBranchId || queryBranchId || "";
    }
    static async getOffDays(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const branchId = AttendanceController.resolveBranchId(req);
            const month = req.query.month || new Date().toISOString().slice(0, 7);
            if (!branchId) {
                res.status(400).json({ success: false, message: "Branch ID is required" });
                return;
            }
            const result = await attendance_service_1.AttendanceService.getBranchOffDayConfig(tenantId, branchId, month);
            res.json({ success: true, data: result });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async setOffDays(req, res) {
        try {
            const user = req.user;
            const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN";
            const isBranchManager = user.role === "BRANCH_MANAGER" ||
                user.pharmacyRoleName?.toLowerCase().includes("branch manager") ||
                user.customRoleName?.toLowerCase().includes("branch manager") ||
                user.permissions?.includes("attendance.manage") ||
                user.permissions?.includes("*");
            if (!isOwner && !isBranchManager) {
                res.status(403).json({ success: false, message: "Forbidden: Only Branch Manager and Pharmacy Owner can configure monthly off-days." });
                return;
            }
            const tenantId = user.tenantId;
            const branchId = AttendanceController.resolveBranchId(req);
            const actorId = user.id;
            const month = req.body.month || new Date().toISOString().slice(0, 7);
            if (!branchId) {
                res.status(400).json({ success: false, message: "Branch ID is required" });
                return;
            }
            const result = await attendance_service_1.AttendanceService.setBranchOffDayConfig(tenantId, branchId, month, {
                ...req.body,
                branchId,
            }, actorId);
            res.json({ success: true, message: "Monthly off-days configured successfully", data: result });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async getDailySheet(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const branchId = AttendanceController.resolveBranchId(req);
            const date = req.query.date || new Date().toISOString().slice(0, 10);
            if (!branchId) {
                res.status(400).json({ success: false, message: "Branch ID is required" });
                return;
            }
            const sheet = await attendance_service_1.AttendanceService.getDailyAttendanceSheet(tenantId, branchId, date);
            res.json({ success: true, data: sheet });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async markBulkDaily(req, res) {
        try {
            const user = req.user;
            const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN";
            const isBranchManager = user.role === "BRANCH_MANAGER" ||
                user.pharmacyRoleName?.toLowerCase().includes("branch manager") ||
                user.customRoleName?.toLowerCase().includes("branch manager") ||
                user.permissions?.includes("attendance.manage") ||
                user.permissions?.includes("*");
            if (!isOwner && !isBranchManager) {
                res.status(403).json({ success: false, message: "Forbidden: Only Branch Manager and Pharmacy Owner can mark employee attendance. Employees cannot mark their own attendance." });
                return;
            }
            const tenantId = user.tenantId;
            const branchId = AttendanceController.resolveBranchId(req);
            const actorId = user.id;
            const date = req.body.date || new Date().toISOString().slice(0, 10);
            if (!branchId) {
                res.status(400).json({ success: false, message: "Branch ID is required" });
                return;
            }
            const result = await attendance_service_1.AttendanceService.markBulkDailyAttendance(tenantId, branchId, date, {
                ...req.body,
                branchId,
            }, actorId);
            res.json({ success: true, message: "Attendance marked successfully", data: result });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async getEmployeeHistory(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.query.userId || req.params.userId;
            const month = req.query.month || new Date().toISOString().slice(0, 7);
            if (!userId) {
                res.status(400).json({ success: false, message: "User ID is required" });
                return;
            }
            const user = req.user;
            const actorRole = user.role;
            const isManagerOrAccounts = actorRole === "COMPANY_OWNER" ||
                actorRole === "SUPER_ADMIN" ||
                actorRole === "REGIONAL_ADMIN" ||
                actorRole === "BRANCH_MANAGER" ||
                actorRole === "ACCOUNTS" ||
                user.pharmacyRoleName?.toLowerCase().includes("branch manager") ||
                user.customRoleName?.toLowerCase().includes("branch manager") ||
                user.permissions?.includes("attendance.manage") ||
                user.permissions?.includes("accounts.salaries") ||
                user.permissions?.includes("*");
            if (!isManagerOrAccounts && user.id !== userId) {
                res.status(403).json({ success: false, message: "Forbidden: You can only view your own attendance history." });
                return;
            }
            const history = await attendance_service_1.AttendanceService.getEmployeeAttendanceHistory(tenantId, userId, month, user);
            res.json({ success: true, data: history });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async getMyHistory(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const month = req.query.month || new Date().toISOString().slice(0, 7);
            const history = await attendance_service_1.AttendanceService.getEmployeeAttendanceHistory(tenantId, userId, month);
            res.json({ success: true, data: history });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async getSalaryCalc(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const branchId = AttendanceController.resolveBranchId(req);
            const userId = req.query.userId;
            const month = req.query.month || new Date().toISOString().slice(0, 7);
            if (!branchId || !userId) {
                res.status(400).json({ success: false, message: "Branch ID and User ID are required" });
                return;
            }
            const calc = await attendance_service_1.AttendanceService.calculateMonthlySalary(tenantId, branchId, userId, month);
            res.json({ success: true, data: calc });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async getBranchSummary(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const branchId = AttendanceController.resolveBranchId(req);
            const month = req.query.month || new Date().toISOString().slice(0, 7);
            if (!branchId) {
                res.status(400).json({ success: false, message: "Branch ID is required" });
                return;
            }
            const summary = await attendance_service_1.AttendanceService.getBranchMonthlyAttendanceSummary(tenantId, branchId, month);
            res.json({ success: true, data: summary });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async listAllowances(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const branchId = AttendanceController.resolveBranchId(req);
            const userId = req.query.userId;
            const month = req.query.month || new Date().toISOString().slice(0, 7);
            if (!branchId || !userId) {
                res.status(400).json({ success: false, message: "Branch ID and User ID are required" });
                return;
            }
            const allowances = await attendance_service_1.AttendanceService.listEmployeeAllowances(tenantId, branchId, userId, month);
            res.json({ success: true, data: allowances });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async addAllowance(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const branchId = AttendanceController.resolveBranchId(req);
            const actorId = req.user.id;
            const { userId, month, title, amount, notes } = req.body;
            if (!branchId || !userId) {
                res.status(400).json({ success: false, message: "Branch ID and User ID are required" });
                return;
            }
            const allowance = await attendance_service_1.AttendanceService.addEmployeeAllowance(tenantId, branchId, userId, month, { branchId, userId, month, title, amount: Number(amount), notes }, actorId);
            res.status(201).json({ success: true, message: "Allowance added successfully", data: allowance });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async deleteAllowance(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const actorId = req.user.id;
            const allowanceId = req.params.id;
            const result = await attendance_service_1.AttendanceService.deleteEmployeeAllowance(tenantId, allowanceId, actorId);
            res.json({ success: true, message: "Allowance deleted successfully", data: result });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async deactivateEmployee(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const branchId = AttendanceController.resolveBranchId(req);
            const actorId = req.user.id;
            const userId = req.params.id;
            if (!branchId) {
                res.status(400).json({ success: false, message: "Branch ID is required" });
                return;
            }
            const updated = await attendance_service_1.AttendanceService.deactivateEmployee(tenantId, branchId, userId, req.body, actorId);
            res.json({ success: true, message: "Employee deactivated / resigned successfully", data: updated });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
    static async reactivateEmployee(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const branchId = AttendanceController.resolveBranchId(req);
            const actorId = req.user.id;
            const userId = req.params.id;
            if (!branchId) {
                res.status(400).json({ success: false, message: "Branch ID is required" });
                return;
            }
            const updated = await attendance_service_1.AttendanceService.reactivateEmployee(tenantId, branchId, userId, actorId);
            res.json({ success: true, message: "Employee reactivated successfully", data: updated });
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
}
exports.AttendanceController = AttendanceController;
