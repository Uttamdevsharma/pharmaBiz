import { Request, Response } from "express";
import { NotificationService } from "./notification.service";
import { ListNotificationsQuery } from "./notification.validation";

export class NotificationController {
  static async listNotifications(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const userRole = req.user!.role;
      const userBranchId = req.user!.branchId;
      const query = req.query as unknown as ListNotificationsQuery;

      const result = await NotificationService.listNotifications(tenantId, query, userRole, userBranchId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const updated = await NotificationService.markAsRead(id, tenantId);
      res.status(200).json({ success: true, message: "Marked as read", data: updated });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  static async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const branchId = req.user!.branchId;
      const result = await NotificationService.markAllAsRead(tenantId, branchId);
      res.status(200).json({ success: true, message: "All notifications marked as read", data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getLowStockAlerts(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const alerts = await NotificationService.getAlertsByType(tenantId, "LOW_STOCK");
      res.status(200).json({ success: true, data: alerts });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getExpiryAlerts(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const alerts = await NotificationService.getAlertsByType(tenantId, "EXPIRY");
      res.status(200).json({ success: true, data: alerts });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getSyncFailureAlerts(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const alerts = await NotificationService.getAlertsByType(tenantId, "SYNC_FAILURE");
      res.status(200).json({ success: true, data: alerts });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
