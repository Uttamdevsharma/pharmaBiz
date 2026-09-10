import { Request, Response } from "express";
import { AccountingService } from "./accounting.service";
import { ReportService } from "../report/report.service";
import { prisma } from "../../app/lib/prisma";

export class AccountingController {
  static async listAccounts(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const user = req.user!;
      const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN" || user.role === "REGIONAL_ADMIN";
      const branchId = isOwner
        ? ((req.query.branchId as string) || (req.headers["x-branch-id"] as string) || undefined)
        : (user.branchId || undefined);
      const cleanBranchId = !branchId || branchId === "all" || branchId === "all-branches" ? undefined : branchId;
      const accounts = await AccountingService.listAccounts(tenantId, cleanBranchId);
      res.json({ success: true, data: accounts });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async createAccount(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const account = await AccountingService.createAccount(tenantId, userId, req.body);
      res.status(201).json({ success: true, data: account });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }


  static async updateAccount(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const accountId = req.params.id;
      const account = await AccountingService.updateAccount(tenantId, accountId, userId, req.body);
      res.status(200).json({ success: true, data: account, message: "Account updated successfully" });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const accountId = req.params.id;
      await AccountingService.deleteAccount(tenantId, accountId, userId);
      res.status(200).json({ success: true, message: "Financial account removed successfully" });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async depositFunds(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const account = await AccountingService.depositFunds(tenantId, userId, req.body);
      res.json({
        success: true,
        message: `Successfully deposited funds into ${account.name}`,
        data: account,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async transferFunds(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const result = await AccountingService.transferFunds(tenantId, userId, req.body);
      res.json({
        success: true,
        message: "Funds transferred successfully",
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async recordTransaction(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const result = await AccountingService.recordIncomeExpense(tenantId, userId, req.body);
      res.status(201).json({
        success: true,
        message: "Financial transaction recorded successfully",
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async listTransactions(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const result = await AccountingService.listTransactions(tenantId, req.query as any);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const tenantId = user.tenantId;
      const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN" || user.role === "REGIONAL_ADMIN";
      const branchId = isOwner
        ? ((req.query.branchId as string) || (req.headers["x-branch-id"] as string) || undefined)
        : (user.branchId || undefined);
      const cleanBranchId = !branchId || branchId === "all" || branchId === "all-branches" ? undefined : branchId;

      const options = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        period: req.query.period as string | undefined,
      };
      const overview = await AccountingService.getFinancialOverview(tenantId, cleanBranchId, options);
      res.json({ success: true, data: overview });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getDailySales(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userRole = req.user!.role;
      const userBranchId = req.user!.branchId;
      const query = req.query as any;

      const report = await ReportService.getDailySales(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ==========================================
  // 🏢 RECURRING EXPENSES
  // ==========================================
  static async listRecurringExpenses(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const tenantId = user.tenantId;
      const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN" || user.role === "REGIONAL_ADMIN";
      const branchId = isOwner
        ? ((req.query.branchId as string) || (req.headers["x-branch-id"] as string) || undefined)
        : (user.branchId || undefined);
      const cleanBranchId = !branchId || branchId === "all" || branchId === "all-branches" ? undefined : branchId;

      const includeInactive = req.query.includeInactive === "true" || req.query.includeInactive === "1";
      const data = await AccountingService.listRecurringExpenses(tenantId, cleanBranchId, includeInactive);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async createRecurringExpense(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const data = await AccountingService.createRecurringExpense(tenantId, req.body);
      res.status(201).json({ success: true, data, message: "Recurring bill configured successfully" });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async updateRecurringExpense(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const data = await AccountingService.updateRecurringExpense(tenantId, req.params.id, req.body);
      res.json({ success: true, data, message: "Recurring bill updated successfully" });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async deleteRecurringExpense(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      await AccountingService.deleteRecurringExpense(tenantId, req.params.id);
      res.json({ success: true, message: "Recurring bill removed" });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  // ==========================================
  // 💸 ACTUAL MONTHLY EXPENSE PAYMENTS
  // ==========================================
  static async listExpenses(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const result = await AccountingService.listExpenses(tenantId, req.query as any);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async recordExpense(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const expense = await AccountingService.recordExpense(tenantId, userId, req.body);
      res.status(201).json({ success: true, data: expense, message: "Expense payment recorded and account debited" });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getExpenseSummary(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const branchId = req.query.branchId as string | undefined;
      const month = req.query.month as string | undefined;
      const summary = await AccountingService.getExpenseSummary(tenantId, branchId, month);
      res.json({ success: true, data: summary });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  // ==========================================
  // 👥 STAFF SALARY MANAGEMENT
  // ==========================================
  static async listBranchStaffSalaries(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const user = req.user!;
      const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN" || user.role === "REGIONAL_ADMIN";
      const branchId = isOwner
        ? ((req.query.branchId as string) || (req.headers["x-branch-id"] as string) || undefined)
        : (user.branchId || undefined);
      const cleanBranchId = !branchId || branchId === "all" || branchId === "all-branches" ? undefined : branchId;
      const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
      const includeInactive = req.query.includeInactive === "true" || req.query.includeInactive === "1";

      const employees = await AccountingService.listBranchStaffSalaries(tenantId, cleanBranchId, month, includeInactive);
      res.json({ success: true, data: employees });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async setSalaryConfig(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const tenantId = user.tenantId;
      const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN";
      const isBranchManager =
        user.role === "BRANCH_MANAGER" ||
        user.pharmacyRoleName?.toLowerCase().includes("branch manager") ||
        user.customRoleName?.toLowerCase().includes("branch manager") ||
        user.permissions?.includes("salaries.base_salary.edit") ||
        user.permissions?.includes("accounts.salaries") ||
        user.permissions?.includes("*");

      // Only Pharmacy Owner and Branch Manager can set or update Base Salary
      if (!isOwner && !isBranchManager) {
        const existing = await (prisma as any).employeeSalaryConfig.findUnique({
          where: {
            tenantId_userId: {
              tenantId,
              userId: req.body.userId,
            },
          },
        });

        const incomingBase = Number(req.body.baseSalary);
        if (existing && existing.baseSalary !== incomingBase) {
          res.status(403).json({
            success: false,
            message: "Forbidden: Only Pharmacy Owner and Branch Manager can set or update Base Salary.",
          });
          return;
        }
      }

      const branchId = isOwner ? (req.body.branchId || user.branchId) : (user.branchId || req.body.branchId);

      const result = await AccountingService.setSalaryConfig(tenantId, {
        ...req.body,
        branchId,
      });
      res.json({ success: true, message: "Salary configuration saved successfully", data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async disburseSalary(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const tenantId = user.tenantId;
      const disbursedById = user.id;
      const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN";
      const branchId = isOwner ? ((req.body.branchId as string) || user.branchId || "") : (user.branchId || (req.body.branchId as string) || "");

      if (!branchId) {
        res.status(400).json({ success: false, message: "Branch ID is required" });
        return;
      }

      const payload = {
        ...req.body,
        branchId,
      };

      const result = await AccountingService.disburseSalary(tenantId, disbursedById, payload);
      res.status(201).json({ success: true, data: result, message: "Salary paid successfully and financial account debited" });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getBranchSalaryHistory(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const user = req.user!;
      const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN" || user.role === "REGIONAL_ADMIN";
      const branchId = isOwner
        ? ((req.query.branchId as string) || (req.headers["x-branch-id"] as string) || undefined)
        : (user.branchId || undefined);
      const cleanBranchId = !branchId || branchId === "all" || branchId === "all-branches" ? undefined : branchId;
      const month = req.query.month as string | undefined;
      const userId = req.query.userId as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const data = await AccountingService.getBranchSalaryHistory(tenantId, cleanBranchId, {
        month,
        userId,
        page,
        limit,
      });
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getEmployeeSalaryHistory(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.params.userId;
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
        res.status(403).json({ success: false, message: "Forbidden: You can only view your own salary history." });
        return;
      }

      const history = await AccountingService.getEmployeeSalaryHistory(tenantId, userId, user);
      res.json({ success: true, data: history });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  static async getMySalaryHistory(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const history = await AccountingService.getMySalaryHistory(tenantId, userId);
      res.json({ success: true, data: history });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}
