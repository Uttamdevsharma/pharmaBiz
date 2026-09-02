import { Request, Response } from "express";
import { SettingsService } from "./settings.service";

export class SettingsController {
  static async getPublicSettings(req: Request, res: Response): Promise<void> {
    try {
      const data = await SettingsService.getPublicSettings();
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getAdminSettings(req: Request, res: Response): Promise<void> {
    try {
      const data = await SettingsService.getAdminSettings();
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const updated = await SettingsService.updateSettings(req.body);
      res.status(200).json({
        success: true,
        message: "Platform settings updated successfully",
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getTenantVatSettings(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user?.tenantId;
      if (!tenantId) {
        res.status(400).json({ success: false, message: "Tenant context required" });
        return;
      }
      const data = await SettingsService.getTenantVatSettings(tenantId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateTenantVatSettings(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user?.tenantId;
      const userId = (req as any).user?.id || (req as any).user?.userId;
      if (!tenantId) {
        res.status(400).json({ success: false, message: "Tenant context required" });
        return;
      }
      const updated = await SettingsService.updateTenantVatSettings(tenantId, userId, req.body);
      res.status(200).json({
        success: true,
        message: "VAT settings updated successfully",
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
