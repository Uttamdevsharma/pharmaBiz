import { Request, Response } from "express";
import { AttendanceService } from "./attendance.service";

export class AttendanceController {
  private static resolveBranchId(req: Request): string {
    const userRole = req.user!.role;
    const userBranchId = req.user!.branchId;
    const queryBranchId = (req.query.branchId as string) || (req.body?.branchId as string);

    if (userRole === "COMPANY_OWNER" || userRole === "SUPER_ADMIN" || userRole === "REGIONAL_ADMIN") {
      return queryBranchId || userBranchId || "";
    }

    // Branch manager or other staff must be scoped to their assigned branch
    return userBranchId || queryBranchId || "";
  }

  static async getOffDays(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const branchId = AttendanceController.resolveBranchId(req);
      const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

      if (!branchId) {
        res.status(400).json({ success: false, message: "Branch ID is required" });
        return;
      }

      const result = await AttendanceService.getBranchOffDayConfig(tenantId, branchId, month);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async setOffDays(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN";
      const isBranchManager = user.role === "BRANCH_MANAGER";
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

      const result = await AttendanceService.setBranchOffDayConfig(
        tenantId,
        branchId,
        month,
        {
          ...req.body,
          branchId,
        },
        actorId
      );
      res.json({ success: true, message: "Monthly off-days configured successfully", data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getDailySheet(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const branchId = AttendanceController.resolveBranchId(req);
      const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);

      if (!branchId) {
        res.status(400).json({ success: false, message: "Branch ID is required" });
        return;
      }

      const sheet = await AttendanceService.getDailyAttendanceSheet(tenantId, branchId, date);
      res.json({ success: true, data: sheet });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async markBulkDaily(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN";
      const isBranchManager = user.role === "BRANCH_MANAGER";
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

      const result = await AttendanceService.markBulkDailyAttendance(
        tenantId,
        branchId,
        date,
        {
          ...req.body,
          branchId,
        },
        actorId
      );
      res.json({ success: true, message: "Attendance marked successfully", data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getEmployeeHistory(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = (req.query.userId as string) || req.params.userId;
      const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

      if (!userId) {
        res.status(400).json({ success: false, message: "User ID is required" });
        return;
      }

      const user = req.user!;
      const actorRole = user.role;
      const isManagerOrAccounts =
        actorRole === "COMPANY_OWNER" ||
        actorRole === "SUPER_ADMIN" ||
        actorRole === "REGIONAL_ADMIN" ||
        actorRole === "BRANCH_MANAGER" ||
        actorRole === "ACCOUNTS" ||
        user.pharmacyRoleName?.toLowerCase().includes("branch manager") ||
        user.customRoleName?.toLowerCase().includes("branch manager");

      if (!isManagerOrAccounts && user.id !== userId) {
        res.status(403).json({ success: false, message: "Forbidden: You can only view your own attendance history." });
        return;
      }

      const history = await AttendanceService.getEmployeeAttendanceHistory(tenantId, userId, month, user);
      res.json({ success: true, data: history });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getMyHistory(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

      const history = await AttendanceService.getEmployeeAttendanceHistory(tenantId, userId, month);
      res.json({ success: true, data: history });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getSalaryCalc(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const branchId = AttendanceController.resolveBranchId(req);
      const userId = req.query.userId as string;
      const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

      if (!branchId || !userId) {
        res.status(400).json({ success: false, message: "Branch ID and User ID are required" });
        return;
      }

      const calc = await AttendanceService.calculateMonthlySalary(tenantId, branchId, userId, month);
      res.json({ success: true, data: calc });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getBranchSummary(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const branchId = AttendanceController.resolveBranchId(req);
      const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

      if (!branchId) {
        res.status(400).json({ success: false, message: "Branch ID is required" });
        return;
      }

      const summary = await AttendanceService.getBranchMonthlyAttendanceSummary(tenantId, branchId, month);
      res.json({ success: true, data: summary });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async listAllowances(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const branchId = AttendanceController.resolveBranchId(req);
      const userId = req.query.userId as string;
      const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

      if (!branchId || !userId) {
        res.status(400).json({ success: false, message: "Branch ID and User ID are required" });
        return;
      }

      const allowances = await AttendanceService.listEmployeeAllowances(tenantId, branchId, userId, month);
      res.json({ success: true, data: allowances });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async addAllowance(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const branchId = AttendanceController.resolveBranchId(req);
      const actorId = req.user!.id;
      const { userId, month, title, amount, notes } = req.body;

      if (!branchId || !userId) {
        res.status(400).json({ success: false, message: "Branch ID and User ID are required" });
        return;
      }

      const allowance = await AttendanceService.addEmployeeAllowance(
        tenantId,
        branchId,
        userId,
        month,
        { branchId, userId, month, title, amount: Number(amount), notes },
        actorId
      );
      res.status(201).json({ success: true, message: "Allowance added successfully", data: allowance });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async deleteAllowance(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const actorId = req.user!.id;
      const allowanceId = req.params.id;

      const result = await AttendanceService.deleteEmployeeAllowance(tenantId, allowanceId, actorId);
      res.json({ success: true, message: "Allowance deleted successfully", data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async deactivateEmployee(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const branchId = AttendanceController.resolveBranchId(req);
      const actorId = req.user!.id;
      const userId = req.params.id;

      if (!branchId) {
        res.status(400).json({ success: false, message: "Branch ID is required" });
        return;
      }

      const updated = await AttendanceService.deactivateEmployee(tenantId, branchId, userId, req.body, actorId);
      res.json({ success: true, message: "Employee deactivated / resigned successfully", data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async reactivateEmployee(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const branchId = AttendanceController.resolveBranchId(req);
      const actorId = req.user!.id;
      const userId = req.params.id;

      if (!branchId) {
        res.status(400).json({ success: false, message: "Branch ID is required" });
        return;
      }

      const updated = await AttendanceService.reactivateEmployee(tenantId, branchId, userId, actorId);
      res.json({ success: true, message: "Employee reactivated successfully", data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}
