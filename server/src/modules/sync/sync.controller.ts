import { Request, Response } from "express";
import { SyncService } from "./sync.service";
import { PullUpdatesQuery, ListSyncLogsQuery } from "./sync.validation";

export class SyncController {
  static async pushSales(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const result = await SyncService.pushSales(tenantId, req.body);
      res.status(200).json({
        success: true,
        message: "Offline sales batch processed",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async pushStock(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const result = await SyncService.pushStockAdjustments(tenantId, req.body);
      res.status(200).json({
        success: true,
        message: "Offline stock adjustments batch processed",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async pullUpdates(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const query = req.query as unknown as PullUpdatesQuery;
      const result = await SyncService.pullUpdates(tenantId, query);
      res.status(200).json({
        success: true,
        message: "Cloud updates fetched successfully",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getSyncStatus(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const { branchId } = req.params;
      const result = await SyncService.getSyncStatus(tenantId, branchId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  static async listSyncLogs(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userRole = req.user!.role;
      const userBranchId = req.user!.branchId;
      const query = req.query as unknown as ListSyncLogsQuery;

      const result = await SyncService.listSyncLogs(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
