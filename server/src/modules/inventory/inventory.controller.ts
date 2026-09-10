import { Request, Response } from "express";
import { InventoryService } from "./inventory.service";
import { ListMovementsQuery, InventoryAlertsQuery, PosBatchQuery } from "./inventory.validation";

export class InventoryController {
  static async getBranchInventory(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const tenantId = user.tenantId;
      const isOwner = user.role === "COMPANY_OWNER" || user.role === "SUPER_ADMIN" || user.role === "REGIONAL_ADMIN";

      // If user is restricted to a branch, force that branch
      let targetBranchId: string | undefined = req.params.branchId || (req.query.branchId as string) || (req.headers["x-branch-id"] as string);
      if (!isOwner && user.branchId) {
        targetBranchId = user.branchId;
      } else if (targetBranchId === "all" || targetBranchId === "all-branches") {
        targetBranchId = undefined;
      }

      const query = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        search: req.query.search as string,
        category: req.query.category as string,
      };

      const result = await InventoryService.getBranchInventory(tenantId, targetBranchId, query);
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

  static async allocateStock(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const result = await InventoryService.allocateStock(tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Stock allocated successfully",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async moveStock(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const result = await InventoryService.moveStock(tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Stock moved successfully",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async removeExpiredStock(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const result = await InventoryService.removeExpiredStock(tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "Expired stock removed successfully and logged in movement ledger",
        data: result,
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

      if ((query as any).type === "PURCHASE") {
        const result = await InventoryService.listReceivingHistory(tenantId, query as any, userRole, userBranchId);
        res.status(200).json({ success: true, ...result });
        return;
      }

      const result = await InventoryService.listMovements(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async listReceivingHistory(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userRole = req.user!.role;
      const userBranchId = req.user!.branchId;
      const query = req.query as any;

      const result = await InventoryService.listReceivingHistory(tenantId, query, userRole, userBranchId);
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

  static async getPosBatches(req: Request, res: Response): Promise<void> {
    try {
      const { branchId, productId } = req.query as unknown as PosBatchQuery;
      const tenantId = req.user!.tenantId;
      if (!branchId || !productId) {
        res.status(400).json({ success: false, message: "branchId and productId are required" });
        return;
      }
      const batches = await InventoryService.getPosAvailableBatches(tenantId, branchId as string, productId as string);
      res.status(200).json({ success: true, data: batches });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getBatchDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const batch = await InventoryService.getBatchDetails(tenantId, id);
      res.status(200).json({ success: true, data: batch });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
}
