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

  static async getDashboardMetrics(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userRole = req.user!.role;
      const userBranchId = req.user!.branchId;
      const userId = req.user!.id;
      const branchId = req.query.branchId as string | undefined;
      const period = req.query.period as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const dashboard = await ReportService.getDashboardMetrics(
        tenantId,
        branchId,
        userRole,
        userBranchId,
        userId,
        period,
        startDate,
        endDate
      );
      res.status(200).json({ success: true, data: dashboard });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getBranchReportSummary(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userBranchId = req.user!.branchId;
      const branchId = (req.query.branchId as string) || userBranchId;
      const dateStr = (req.query.date as string) || new Date().toISOString().split("T")[0];

      if (!branchId) {
        res.status(400).json({ success: false, message: "Branch ID is required" });
        return;
      }

      const report = await ReportService.getBranchReportSummary(tenantId, branchId, dateStr);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to fetch branch report summary" });
    }
  }

  static async getMonthlySalesSummary(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userBranchId = req.user!.branchId;
      const branchId = (req.query.branchId as string) || userBranchId;
      const monthStr = (req.query.month as string) || new Date().toISOString().slice(0, 7);
      const categoryId = req.query.categoryId as string;
      const subcategoryId = req.query.subcategoryId as string;

      const report = await ReportService.getMonthlySalesSummary(tenantId, branchId, monthStr, { categoryId, subcategoryId });
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to fetch monthly sales summary" });
    }
  }

  static async getPurchaseReport(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userBranchId = req.user!.branchId;
      const branchId = (req.query.branchId as string) || userBranchId;
      const query = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        supplierId: req.query.supplierId as string,
        paymentStatus: req.query.paymentStatus as string,
        search: req.query.search as string,
        categoryId: req.query.categoryId as string,
        subcategoryId: req.query.subcategoryId as string,
      };

      const report = await ReportService.getPurchaseReport(tenantId, branchId, query);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to fetch purchase report" });
    }
  }

  static async getProductStockReport(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userBranchId = req.user!.branchId;
      const branchId = (req.query.branchId as string) || userBranchId;
      const filters = {
        categoryId: req.query.categoryId as string,
        subcategoryId: req.query.subcategoryId as string,
        brandId: req.query.brandId as string,
        search: req.query.search as string,
      };

      const report = await ReportService.getProductStockReport(tenantId, branchId, filters);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to fetch product stock report" });
    }
  }
}
