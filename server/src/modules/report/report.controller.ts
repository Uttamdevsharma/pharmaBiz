import { Request, Response } from "express";
import { ReportService } from "./report.service";
import { ReportDateRangeQuery, VatMisReportQuery } from "./report.validation";

export class ReportController {
  static async getDailySales(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userRole = req.user!.role;
      const userBranchId = req.user!.branchId;
      const query = req.query as unknown as ReportDateRangeQuery;

      const report = await ReportService.getDailySales(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getWeeklySales(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userRole = req.user!.role;
      const userBranchId = req.user!.branchId;
      const query = req.query as unknown as ReportDateRangeQuery;

      const report = await ReportService.getWeeklySales(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getMonthlySales(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userRole = req.user!.role;
      const userBranchId = req.user!.branchId;
      const query = req.query as unknown as ReportDateRangeQuery;

      const report = await ReportService.getMonthlySales(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getBranchWiseSales(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const query = req.query as unknown as ReportDateRangeQuery;

      const report = await ReportService.getBranchWiseSales(tenantId, query);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getRegionWiseSales(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const query = req.query as unknown as ReportDateRangeQuery;

      const report = await ReportService.getRegionWiseSales(tenantId, query);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getCompanyWideSales(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const query = req.query as unknown as ReportDateRangeQuery;

      const report = await ReportService.getCompanyWideSales(tenantId, query);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getInventoryReport(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userRole = req.user!.role;
      const userBranchId = req.user!.branchId;
      const branchId = req.query.branchId as string;

      const report = await ReportService.getInventoryReport(tenantId, branchId, userRole, userBranchId);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getVatMisReport(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const query = req.query as unknown as VatMisReportQuery;

      const report = await ReportService.getVatMisReport(tenantId, query);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
