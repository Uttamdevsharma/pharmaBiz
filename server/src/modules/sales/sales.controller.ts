import { Request, Response } from "express";
import { SalesService } from "./sales.service";
import { ListSalesQuery } from "./sales.validation";

export class SalesController {
  static async createSale(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const user = req.user!;
      const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN" || user.role === "REGIONAL_ADMIN";

      if (!isOwner && user.branchId && req.body.branchId && req.body.branchId !== user.branchId) {
        res.status(403).json({ success: false, message: "Forbidden: You can only ring up sales in your assigned branch." });
        return;
      }

      // Default branchId to staff's assigned branch if not set
      if (!isOwner && user.branchId && !req.body.branchId) {
        req.body.branchId = user.branchId;
      }

      const sale = await SalesService.createSale(tenantId, userId, req.body);
      res.status(201).json({
        success: true,
        message: "Sale processed successfully",
        data: sale,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async listSales(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userRole = req.user!.role;
      const userBranchId = req.user!.branchId;
      const query = { ...(req.query as unknown as ListSalesQuery) };

      if (!query.branchId && req.headers["x-branch-id"]) {
        const headerBranch = (req.headers["x-branch-id"] as string).trim();
        if (headerBranch && headerBranch !== "all" && headerBranch !== "all-branches") {
          query.branchId = headerBranch;
        }
      }

      const result = await SalesService.listSales(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getCustomers(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const search = req.query.search as string | undefined;
      const customers = await SalesService.getCustomers(tenantId, search);
      res.status(200).json({ success: true, data: customers });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getSaleById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const sale = await SalesService.getSaleById(id, tenantId);
      res.status(200).json({ success: true, data: sale });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  static async getReceipt(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const receipt = await SalesService.getReceiptData(id, tenantId);
      res.status(200).json({ success: true, data: receipt });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  static async refundSale(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const refunded = await SalesService.refundSale(id, tenantId, userId, userRole, req.body);
      res.status(200).json({
        success: true,
        message: "Sale refunded and stock returned to inventory successfully",
        data: refunded,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async voidSale(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const voided = await SalesService.voidSale(id, tenantId, userId, userRole, req.body);
      res.status(200).json({
        success: true,
        message: "Sale voided and stock returned to inventory successfully",
        data: voided,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async collectDue(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;

      const updatedSale = await SalesService.collectDue(tenantId, userId, id, req.body);
      res.status(200).json({
        success: true,
        message: "Outstanding due payment collected successfully",
        data: updatedSale,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getDueStats(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      let branchId = req.query.branchId as string | undefined;

      if (!branchId && req.headers["x-branch-id"]) {
        const headerBranch = (req.headers["x-branch-id"] as string).trim();
        if (headerBranch && headerBranch !== "all" && headerBranch !== "all-branches") {
          branchId = headerBranch;
        }
      }

      const stats = await SalesService.getDueStats(tenantId, branchId);
      res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

