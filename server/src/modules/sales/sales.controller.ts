import { Request, Response } from "express";
import { SalesService } from "./sales.service";
import { ListSalesQuery } from "./sales.validation";

export class SalesController {
  static async createSale(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
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
      const query = req.query as unknown as ListSalesQuery;

      const result = await SalesService.listSales(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, ...result });
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
}
