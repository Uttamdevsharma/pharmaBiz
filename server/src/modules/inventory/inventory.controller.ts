import { Request, Response } from "express";
import { InventoryService } from "./inventory.service";
import { ListMovementsQuery, InventoryAlertsQuery } from "./inventory.validation";

export class InventoryController {
  static async getBranchInventory(req: Request, res: Response): Promise<void> {
    try {
      const { branchId } = req.params;
      const tenantId = req.user!.tenantId;
      const query = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        search: req.query.search as string,
        category: req.query.category as string,
      };

      const result = await InventoryService.getBranchInventory(tenantId, branchId, query);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  static async inwardStock(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const result = await InventoryService.inwardStock(tenantId, userId, req.body);
      res.status(201).json({
        success: true,
        message: "Stock inward recorded successfully",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async adjustStock(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const result = await InventoryService.adjustStock(tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Stock adjusted successfully",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateInventoryItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const updated = await InventoryService.updateInventoryItem(id, tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Inventory item updated successfully",
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async listMovements(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userRole = req.user!.role;
      const userBranchId = req.user!.branchId;
      const query = req.query as unknown as ListMovementsQuery;

      const result = await InventoryService.listMovements(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getLowStock(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userRole = req.user!.role;
      const userBranchId = req.user!.branchId;
      const query = req.query as unknown as InventoryAlertsQuery;

      const result = await InventoryService.getLowStockItems(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getNearExpiry(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userRole = req.user!.role;
      const userBranchId = req.user!.branchId;
      const query = req.query as unknown as InventoryAlertsQuery;

      const result = await InventoryService.getNearExpiryItems(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
