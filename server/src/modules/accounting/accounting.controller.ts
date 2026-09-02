import { Request, Response } from "express";
import { AccountingService } from "./accounting.service";

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
      const overview = await AccountingService.getFinancialOverview(tenantId, branchId);
      res.json({ success: true, data: overview });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}
