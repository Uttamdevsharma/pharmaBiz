import { Request, Response } from "express";
import { AccountingService } from "./accounting.service";
import { ReportService } from "../report/report.service";

export class AccountingController {
  static async listAccounts(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const branchId = req.query.branchId as string | undefined;
      const accounts = await AccountingService.listAccounts(tenantId, branchId);
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
      const tenantId = req.user!.tenantId;
      const branchId = req.query.branchId as string | undefined;
      const options = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        period: req.query.period as string | undefined,
      };
      const overview = await AccountingService.getFinancialOverview(tenantId, branchId, options);
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
}
